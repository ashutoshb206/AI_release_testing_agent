from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Simple Test API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "message": "Simple FastAPI is working"}

@app.get("/api/config")
def config():
    return {"provider": "Test", "model": "Test Model"}

@app.get("/api/runs")
def runs():
    return []
