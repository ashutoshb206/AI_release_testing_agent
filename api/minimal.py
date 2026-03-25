import asyncio
import json
import os
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Skip dotenv loading in serverless
try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

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

        # Extract request origin
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


# Expose the wrapped app as 'app' so Vercel and uvicorn pick it up correctly.
app = _OuterCORSMiddleware(_fastapi_app)

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

@_fastapi_app.get("/")
def root():
    return {"status": "ok", "message": "Minimal API is working"}

@_fastapi_app.get("/api/config")
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

@_fastapi_app.post("/api/runs")
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

@_fastapi_app.get("/api/runs")
def list_runs():
    """List test runs (mock version)."""
    return list(test_runs.values())

@_fastapi_app.get("/api/runs/{run_id}")
def get_run(run_id: str):
    """Get a specific test run (mock version)."""
    if run_id not in test_runs:
        raise HTTPException(404, "Run not found")
    
    return {
        "run": test_runs[run_id],
        "results": test_results.get(run_id, [])
    }

@_fastapi_app.post("/api/jira/fetch")
def fetch_jira_ticket(req: JiraFetchRequest):
    """Mock Jira fetch."""
    return {
        "summary": "implement secure user authentication with login and logout functionality",
        "description": "1. User should be able to log in with valid credentials\n2. User should see appropriate error messages for invalid credentials\n3. User should be able to log out and be redirected to login page\n4. Session should be maintained while user is logged in\n5. Password field should be masked during input",
        "issuetype": "Story",
        "priority": "Medium",
        "demo_mode": True
    }
