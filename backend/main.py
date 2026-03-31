import asyncio
import json
import logging
import os
import time
import uuid
import urllib.request
import urllib.error
from datetime import datetime, timezone

from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# ──────────────────────────────────────────────
# Logging configuration
# ──────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("api")

from database import init_db, get_db
from executor import execute_test_run
from risk import calculate_risk_score
from report import generate_html_report

_fastapi_app = FastAPI(title="AI Release Testing Agent", version="1.0.0")

# Use allow_origins=["*"] without allow_credentials=True.
# Combining "*" with allow_credentials=True is invalid per the CORS spec
# and causes browsers to reject responses with:
#   "No 'Access-Control-Allow-Origin' header is present"
_fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@_fastapi_app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every incoming request and its response status/duration."""
    start = time.monotonic()
    logger.debug("→ %s %s", request.method, request.url.path)
    try:
        response = await call_next(request)
    except Exception as exc:  # pragma: no cover
        elapsed = time.monotonic() - start
        logger.error(
            "✗ %s %s raised %s after %.3fs",
            request.method, request.url.path, type(exc).__name__, elapsed,
        )
        raise
    elapsed = time.monotonic() - start
    logger.info(
        "← %s %s  status=%d  %.3fs",
        request.method, request.url.path, response.status_code, elapsed,
    )
    return response


class _OuterCORSMiddleware:
    """Outermost ASGI wrapper that guarantees CORS headers on every response.

    Starlette's ``ServerErrorMiddleware`` (always the outermost built-in
    middleware) sends 500 error responses directly to the raw ``send``
    callback, bypassing all user-added middlewares including
    ``CORSMiddleware``.  Wrapping the FastAPI app here ensures that even
    those infrastructure-level 500 responses carry an
    ``Access-Control-Allow-Origin`` header so browsers don't suppress them
    with a CORS error.
    """

    def __init__(self, inner):
        self._inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self._inner(scope, receive, send)
            return

        origin: bytes | None = None
        for name, value in scope.get("headers", []):
            if name.lower() == b"origin":
                origin = value
                break

        if origin is None:
            await self._inner(scope, receive, send)
            return

        async def send_with_cors(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                has_acao = any(
                    k.lower() == b"access-control-allow-origin"
                    for k, _ in headers
                )
                if not has_acao:
                    headers.append((b"access-control-allow-origin", b"*"))
                    message = dict(message)
                    message["headers"] = headers
            await send(message)

        await self._inner(scope, receive, send_with_cors)


# Expose the wrapped app as 'app' so uvicorn and Railway pick it up correctly.
app = _OuterCORSMiddleware(_fastapi_app)

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

@_fastapi_app.on_event("startup")
def startup():
    # Database already initialized above
    pass


# ──────────────────────────────────────────────
# API Routes
# ──────────────────────────────────────────────

@_fastapi_app.post("/api/runs")
async def create_run(req: RunRequest, background_tasks: BackgroundTasks):
    """Create a new test run and start execution in the background."""
    run_id = str(uuid.uuid4())
    logger.info(
        "POST /api/runs  run_id=%s  app_url=%s  story=%r",
        run_id, req.app_url, (req.story or "")[:80],
    )
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
    logger.debug("POST /api/runs  run_id=%s queued for background execution", run_id)
    return {"run_id": run_id}


@_fastapi_app.get("/api/runs/{run_id}/stream")
async def stream_run(run_id: str):
    """Server-Sent Events: push live test results as they come in."""
    logger.info("GET /api/runs/%s/stream  SSE connection opened", run_id)

    async def event_gen():
        db = get_db()
        seen_ids: set = set()
        ticks = 0

        while ticks < 360:   # 6-minute timeout
            run_row = db.execute(
                "SELECT * FROM test_runs WHERE id = ?", (run_id,)
            ).fetchone()

            if not run_row:
                logger.warning("GET /api/runs/%s/stream  run not found", run_id)
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
                    logger.debug(
                        "GET /api/runs/%s/stream  streaming result id=%s status=%s",
                        run_id, rid, payload.get("status"),
                    )
                    yield f"data: {json.dumps({'type': 'result', 'data': payload})}\n\n"

            status = run_row["status"]

            if status in ("completed", "failed"):
                logger.info(
                    "GET /api/runs/%s/stream  run finished status=%s  closing SSE",
                    run_id, status,
                )
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


@_fastapi_app.get("/api/runs")
def list_runs():
    logger.debug("GET /api/runs  fetching recent runs")
    db = get_db()
    rows = db.execute(
        "SELECT id, story, app_url, status, risk_score, risk_level, "
        "total_tests, passed_tests, failed_tests, regressions, duration, created_at "
        "FROM test_runs ORDER BY created_at DESC LIMIT 30"
    ).fetchall()
    db.close()
    logger.info("GET /api/runs  returned %d run(s)", len(rows))
    return [dict(r) for r in rows]


@_fastapi_app.get("/api/runs/{run_id}")
def get_run(run_id: str):
    logger.debug("GET /api/runs/%s  fetching run details", run_id)
    db = get_db()
    run = db.execute("SELECT * FROM test_runs WHERE id = ?", (run_id,)).fetchone()
    if not run:
        logger.warning("GET /api/runs/%s  run not found", run_id)
        raise HTTPException(404, "Run not found")
    results = db.execute(
        "SELECT * FROM test_results WHERE run_id = ? ORDER BY created_at",
        (run_id,)
    ).fetchall()
    db.close()
    logger.info(
        "GET /api/runs/%s  status=%s  results=%d",
        run_id, run["status"], len(results),
    )
    return {
        "run": dict(run),
        "results": [dict(r) for r in results]
    }


@_fastapi_app.get("/api/runs/{run_id}/report", response_class=HTMLResponse)
def get_report(run_id: str):
    logger.debug("GET /api/runs/%s/report  generating HTML report", run_id)
    db = get_db()
    run = db.execute("SELECT * FROM test_runs WHERE id = ?", (run_id,)).fetchone()
    if not run:
        logger.warning("GET /api/runs/%s/report  run not found", run_id)
        raise HTTPException(404, "Run not found")
    results = db.execute(
        "SELECT * FROM test_results WHERE run_id = ?", (run_id,)
    ).fetchall()
    db.close()
    logger.info("GET /api/runs/%s/report  rendering report for %d result(s)", run_id, len(results))
    return generate_html_report(dict(run), [dict(r) for r in results])


@_fastapi_app.delete("/api/runs/{run_id}")
def delete_run(run_id: str):
    logger.info("DELETE /api/runs/%s  deleting run and associated results", run_id)
    db = get_db()
    db.execute("DELETE FROM test_results WHERE run_id = ?", (run_id,))
    db.execute("DELETE FROM test_runs WHERE id = ?", (run_id,))
    db.commit()
    db.close()
    logger.debug("DELETE /api/runs/%s  deleted successfully", run_id)
    return {"deleted": True}


@_fastapi_app.post("/api/jira/fetch")
def fetch_jira_ticket(req: JiraFetchRequest):
    """Fetch ticket data from Jira API or return mock data if no token."""
    logger.info("POST /api/jira/fetch  base_url=%s  ticket_id=%s", req.base_url, req.ticket_id)
    jira_token = os.getenv("JIRA_TOKEN")
    
    if jira_token and jira_token != "your_jira_token_here":
        try:
            # Real Jira API call
            url = f"{req.base_url.rstrip('/')}/rest/api/2/issue/{req.ticket_id}"
            logger.debug("POST /api/jira/fetch  calling Jira API url=%s", url)
            headers = {
                "Authorization": f"Bearer {jira_token}",
                "Accept": "application/json"
            }
            
            request = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(request) as response:
                data = json.loads(response.read().decode())
            
            logger.debug("POST /api/jira/fetch  ticket_id=%s fetched from Jira (live)", req.ticket_id)
            return {
                "summary": data.get("fields", {}).get("summary", "No summary available"),
                "description": data.get("fields", {}).get("description", "No description available"),
                "issuetype": data.get("fields", {}).get("issuetype", {}).get("name", "Unknown"),
                "priority": data.get("fields", {}).get("priority", {}).get("name", "Unknown"),
                "demo_mode": False
            }
        except Exception as e:
            # Fall back to mock on any error
            logger.warning(
                "POST /api/jira/fetch  ticket_id=%s Jira API call failed (%s), falling back to mock",
                req.ticket_id, type(e).__name__,
            )
    else:
        logger.debug("POST /api/jira/fetch  no valid JIRA_TOKEN configured, using mock data")
    
    # Mock response for demo or when no token is configured
    logger.info("POST /api/jira/fetch  ticket_id=%s returning demo_mode=True", req.ticket_id)
    return {
        "summary": "implement secure user authentication with login and logout functionality",
        "description": "1. User should be able to log in with valid credentials\n2. User should see appropriate error messages for invalid credentials\n3. User should be able to log out and be redirected to login page\n4. Session should be maintained while user is logged in\n5. Password field should be masked during input",
        "issuetype": "Story",
        "priority": "Medium",
        "demo_mode": True
    }


@_fastapi_app.get("/api/defect-memory")
def get_defect_memory():
    """Get test cases that have failed multiple times across different runs."""
    logger.debug("GET /api/defect-memory  querying defect memory")
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
    logger.info("GET /api/defect-memory  returned %d defect(s)", len(rows))
    return [dict(row) for row in rows]


@_fastapi_app.get("/api/config")
def get_config():
    """Get current LLM provider and model configuration."""
    provider = os.getenv("MODEL_PROVIDER", "groq")
    logger.debug("GET /api/config  MODEL_PROVIDER=%s", provider)
    
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
    
    logger.info("GET /api/config  provider=%s  model=%s", provider_name, model)
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
    _fastapi_app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @_fastapi_app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        with open(index) as f:
            return HTMLResponse(f.read())
