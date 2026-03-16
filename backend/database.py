import sqlite3
import os

# Use /tmp for Railway (ephemeral filesystem), local path for development
DB_PATH = os.path.join(os.getenv("RAILWAY_ENVIRONMENT", "") and "/tmp" or os.path.dirname(__file__), "agent.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS test_runs (
            id TEXT PRIMARY KEY,
            story TEXT NOT NULL,
            app_url TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            risk_score INTEGER,
            risk_level TEXT,
            total_tests INTEGER DEFAULT 0,
            passed_tests INTEGER DEFAULT 0,
            failed_tests INTEGER DEFAULT 0,
            regressions INTEGER DEFAULT 0,
            duration REAL,
            created_at TEXT NOT NULL,
            completed_at TEXT,
            test_plan TEXT
        );

        CREATE TABLE IF NOT EXISTS test_results (
            id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL,
            test_case_id TEXT NOT NULL,
            test_name TEXT NOT NULL,
            type TEXT NOT NULL,
            priority TEXT NOT NULL,
            status TEXT NOT NULL,
            error TEXT,
            screenshot TEXT,
            duration REAL,
            rationale TEXT,
            steps TEXT,
            is_regression INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (run_id) REFERENCES test_runs(id)
        );

        CREATE INDEX IF NOT EXISTS idx_results_run ON test_results(run_id);
    """)
    db.commit()
    db.close()
