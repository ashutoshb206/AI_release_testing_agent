import asyncio
import json
import os
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse
from pydantic import BaseModel

# Skip dotenv loading in serverless
try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

app = FastAPI(title="AI Release Testing Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ai-release-testing-agent-frontend.vercel.app",
        "https://ai-release-testing-agent.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Models
class RunRequest(BaseModel):
    story: str
    acceptance_criteria: str = ""
    app_url: str = "https://www.saucedemo.com"

class JiraFetchRequest(BaseModel):
    base_url: str
    ticket_id: str

# Simple in-memory storage for testing
test_runs = {}
test_results = {}

@app.get("/")
def root():
    return {"status": "ok", "message": "Minimal API is working"}

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
    else:
        model = "Unknown"
        provider_name = "Unknown"
    
    return {
        "provider": provider_name,
        "model": model.replace("-", " ").replace("_", " ").title()
    }

@app.post("/api/runs")
async def create_run(req: RunRequest, background_tasks: BackgroundTasks):
    """Create a new test run (mock version)."""
    run_id = str(uuid.uuid4())
    
    test_runs[run_id] = {
        "id": run_id,
        "story": req.story,
        "app_url": req.app_url,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "total_tests": 0,
        "passed_tests": 0,
        "failed_tests": 0
    }
    
    return {"run_id": run_id}

@app.get("/api/runs")
def list_runs():
    """List test runs (mock version)."""
    return list(test_runs.values())

@app.get("/api/runs/{run_id}")
def get_run(run_id: str):
    """Get a specific test run (mock version)."""
    if run_id not in test_runs:
        raise HTTPException(404, "Run not found")
    
    return {
        "run": test_runs[run_id],
        "results": test_results.get(run_id, [])
    }

@app.post("/api/jira/fetch")
def fetch_jira_ticket(req: JiraFetchRequest):
    """Mock Jira fetch."""
    return {
        "summary": "implement secure user authentication with login and logout functionality",
        "description": "1. User should be able to log in with valid credentials\n2. User should see appropriate error messages for invalid credentials\n3. User should be able to log out and be redirected to login page\n4. Session should be maintained while user is logged in\n5. Password field should be masked during input",
        "issuetype": "Story",
        "priority": "Medium",
        "demo_mode": True
    }
