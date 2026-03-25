import asyncio
import json
import os
import uuid
import urllib.request
import urllib.error
from datetime import datetime, timezone

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from database import init_db, get_db
from executor import execute_test_run
from risk import calculate_risk_score
from report import generate_html_report

app = FastAPI(title="AI Release Testing Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────

class RunRequest(BaseModel):
    story: str
    acceptance_criteria: str = ""
    app_url: str = "https://www.saucedemo.com"


class JiraFetchRequest(BaseModel):
    base_url: str
    ticket_id: str


# ──────────────────────────────────────────────
# Startup
# ──────────────────────────────────────────────

# Initialize database on import (for Vercel serverless)
init_db()

@app.on_event("startup")
def startup():
    # Database already initialized above
    pass


# ──────────────────────────────────────────────
# API Routes
# ──────────────────────────────────────────────

@app.post("/api/runs")
async def create_run(req: RunRequest, background_tasks: BackgroundTasks):
    """Create a new test run and start execution in the background."""
    run_id = str(uuid.uuid4())
    db = get_db()
    db.execute("""
        INSERT INTO test_runs (id, story, app_url, status, created_at)
        VALUES (?, ?, ?, 'pending', ?)
    """, (run_id, req.story, req.app_url, datetime.now(timezone.utc).isoformat()))
    db.commit()
    db.close()

    background_tasks.add_task(
        execute_test_run, run_id, req.story, req.acceptance_criteria, req.app_url
    )
    return {"run_id": run_id}


@app.get("/api/runs/{run_id}/stream")
async def stream_run(run_id: str):
    """Server-Sent Events: push live test results as they come in."""
    async def event_gen():
        db = get_db()
        seen_ids: set = set()
        ticks = 0

        while ticks < 360:   # 6-minute timeout
            run_row = db.execute(
                "SELECT * FROM test_runs WHERE id = ?", (run_id,)
            ).fetchone()

            if not run_row:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Run not found'})}\n\n"
                break

            # Push new result rows
            rows = db.execute(
                "SELECT * FROM test_results WHERE run_id = ? ORDER BY created_at",
                (run_id,)
            ).fetchall()

            for row in rows:
                rid = row["id"]
                if rid not in seen_ids:
                    seen_ids.add(rid)
                    payload = dict(row)
                    payload.pop("screenshot", None)   # keep stream lean
                    yield f"data: {json.dumps({'type': 'result', 'data': payload})}\n\n"

            status = run_row["status"]

            if status in ("completed", "failed"):
                run_data = dict(run_row)
                run_data.pop("test_plan", None)
                yield f"data: {json.dumps({'type': 'completed', 'data': run_data})}\n\n"
                break

            # Heartbeat every 5s to keep connection alive
            if ticks % 5 == 0:
                yield f"data: {json.dumps({'type': 'ping', 'status': status})}\n\n"

            await asyncio.sleep(1)
            ticks += 1

        db.close()

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/api/runs")
def list_runs():
    db = get_db()
    rows = db.execute(
        "SELECT id, story, app_url, status, risk_score, risk_level, "
        "total_tests, passed_tests, failed_tests, regressions, duration, created_at "
        "FROM test_runs ORDER BY created_at DESC LIMIT 30"
    ).fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.get("/api/runs/{run_id}")
def get_run(run_id: str):
    db = get_db()
    run = db.execute("SELECT * FROM test_runs WHERE id = ?", (run_id,)).fetchone()
    if not run:
        raise HTTPException(404, "Run not found")
    results = db.execute(
        "SELECT * FROM test_results WHERE run_id = ? ORDER BY created_at",
        (run_id,)
    ).fetchall()
    db.close()
    return {
        "run": dict(run),
        "results": [dict(r) for r in results]
    }


@app.get("/api/runs/{run_id}/report", response_class=HTMLResponse)
def get_report(run_id: str):
    db = get_db()
    run = db.execute("SELECT * FROM test_runs WHERE id = ?", (run_id,)).fetchone()
    if not run:
        raise HTTPException(404, "Run not found")
    results = db.execute(
        "SELECT * FROM test_results WHERE run_id = ?", (run_id,)
    ).fetchall()
    db.close()
    return generate_html_report(dict(run), [dict(r) for r in results])


@app.delete("/api/runs/{run_id}")
def delete_run(run_id: str):
    db = get_db()
    db.execute("DELETE FROM test_results WHERE run_id = ?", (run_id,))
    db.execute("DELETE FROM test_runs WHERE id = ?", (run_id,))
    db.commit()
    db.close()
    return {"deleted": True}


@app.post("/api/jira/fetch")
def fetch_jira_ticket(req: JiraFetchRequest):
    """Fetch ticket data from Jira API or return mock data if no token."""
    jira_token = os.getenv("JIRA_TOKEN")
    
    if jira_token and jira_token != "your_jira_token_here":
        try:
            # Real Jira API call
            url = f"{req.base_url.rstrip('/')}/rest/api/2/issue/{req.ticket_id}"
            headers = {
                "Authorization": f"Bearer {jira_token}",
                "Accept": "application/json"
            }
            
            request = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(request) as response:
                data = json.loads(response.read().decode())
                
            return {
                "summary": data.get("fields", {}).get("summary", "No summary available"),
                "description": data.get("fields", {}).get("description", "No description available"),
                "issuetype": data.get("fields", {}).get("issuetype", {}).get("name", "Unknown"),
                "priority": data.get("fields", {}).get("priority", {}).get("name", "Unknown"),
                "demo_mode": False
            }
        except Exception as e:
            # Fall back to mock on any error
            pass
    
    # Mock response for demo or when no token is configured
    return {
        "summary": "implement secure user authentication with login and logout functionality",
        "description": "1. User should be able to log in with valid credentials\n2. User should see appropriate error messages for invalid credentials\n3. User should be able to log out and be redirected to login page\n4. Session should be maintained while user is logged in\n5. Password field should be masked during input",
        "issuetype": "Story",
        "priority": "Medium",
        "demo_mode": True
    }


@app.get("/api/defect-memory")
def get_defect_memory():
    """Get test cases that have failed multiple times across different runs."""
    db = get_db()
    rows = db.execute("""
        SELECT 
            test_name,
            COUNT(*) as fail_count,
            MAX(created_at) as last_failed,
            GROUP_CONCAT(DISTINCT error) as types_of_failure
        FROM test_results 
        WHERE status = 'failed'
        GROUP BY test_name 
        HAVING fail_count >= 1 
        ORDER BY fail_count DESC 
        LIMIT 20
    """).fetchall()
    db.close()
    
    return [dict(row) for row in rows]


@app.get("/api/config")
def get_config():
    """Get current LLM provider and model configuration."""
    provider = os.getenv("MODEL_PROVIDER", "groq")
    
    if provider == "groq":
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        provider_name = "Groq"
    elif provider == "anthropic":
        model = os.getenv("ANTHROPIC_MODEL", "claude-3-sonnet-20240229")
        provider_name = "Claude Sonnet"
    elif provider == "huggingface":
        model = os.getenv("HF_MODEL", "Qwen/Qwen2.5-72B-Instruct")
        provider_name = "HuggingFace"
    elif provider == "ollama":
        model = os.getenv("OLLAMA_MODEL", "llama3.1")
        provider_name = "Ollama"
    else:
        model = "Unknown"
        provider_name = "Unknown"
    
    return {
        "provider": provider_name,
        "model": model.replace("-", " ").replace("_", " ").title()
    }


# ──────────────────────────────────────────────
# Vercel Serverless Handler
# ──────────────────────────────────────────────

# Vercel serverless function handler
handler = app

# ──────────────────────────────────────────────
# Serve React frontend (production build)
# ──────────────────────────────────────────────

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        with open(index) as f:
            return HTMLResponse(f.read())
