#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Check API key ──────────────────────────────
if [ -z "$ANTHROPIC_API_KEY" ]; then
  if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
  fi
fi
if [ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" = "your_key_here" ]; then
  echo ""
  echo "❌  ANTHROPIC_API_KEY not set."
  echo "    Edit .env and set your key, or:"
  echo "    export ANTHROPIC_API_KEY=sk-ant-..."
  echo ""
  exit 1
fi

# ── Python deps ────────────────────────────────
echo "▸ Checking Python dependencies..."
pip install -q -r requirements.txt --break-system-packages 2>/dev/null || true

# ── Playwright browsers ────────────────────────
echo "▸ Ensuring Playwright Chromium is installed..."
python -m playwright install chromium 2>/dev/null || true

# ── Frontend build (if dist missing) ──────────
if [ ! -d frontend/dist ]; then
  echo "▸ Building frontend..."
  cd frontend && npm install && npm run build && cd ..
fi

# ── Launch ─────────────────────────────────────
echo ""
echo "✅  Starting AI Release Testing Agent"
echo "    URL: http://localhost:8000"
echo ""
cd backend
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
