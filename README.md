# 🤖 AI-Agent Driven, Context-Aware Release Testing

Autonomous AI testing agent that ingests user stories, generates context-aware test cases using Claude, executes them in a real browser with Playwright, detects regressions, and produces a risk-scored release report.

---

## Quick Start

### 1. Set your API key

```bash
# For Groq (default)
echo "MODEL_PROVIDER=groq" > .env
echo "GROQ_API_KEY=your_groq_api_key_here" >> .env

# Or for Anthropic
echo "MODEL_PROVIDER=anthropic" > .env
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" >> .env
```

### 2. Start the server

```bash
./start.sh
```

Open **http://localhost:8000** in your browser.

---

## Architecture

```
frontend/          React + Vite dashboard
  src/
    components/
      StoryInput.jsx       – Input form with demo loader
      ExecutionView.jsx    – Live streaming test run view
      TestCard.jsx         – Test result with screenshot evidence
      RunHistory.jsx       – Historical runs list
      RunDetail.jsx        – Full run detail with filters
      RiskGauge.jsx        – Animated SVG risk score gauge

backend/
  main.py           FastAPI app — REST API + SSE stream + SPA serve
  agent.py          Claude AI — test plan + script generation
  executor.py       Playwright test runner — step interpreter
  risk.py           Weighted risk scoring + regression detection
  database.py       SQLite schema + helpers
  report.py         Self-contained HTML report generator
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/runs` | Create & start a new test run |
| GET | `/api/runs` | List all historical runs |
| GET | `/api/runs/{id}` | Get run details + results |
| GET | `/api/runs/{id}/stream` | Server-Sent Events — live results |
| GET | `/api/runs/{id}/report` | Download self-contained HTML report |
| DELETE | `/api/runs/{id}` | Delete a run |

## How It Works

1. **Ingest** — User story + acceptance criteria entered in the UI (or from Jira)
2. **Plan** — Claude Sonnet generates 6-10 context-aware test cases covering functional, edge case, negative, and regression scenarios
3. **Execute** — Playwright runs each test in a headless Chromium browser, capturing screenshots as evidence
4. **Score** — Weighted risk algorithm compares against previous runs, detecting regressions
5. **Report** — Interactive dashboard + exportable HTML report with full evidence

## Risk Score Formula

```
Risk Score (0-100) =
  Pass Rate Failure     × 40%
  Critical Test Failure × 30%
  Regression Count      × 20%
  Edge Case Coverage    × 10%
```

- 0–20: 🟢 Low — Safe to release
- 21–45: 🟡 Medium — Review failures
- 46–70: 🟠 High — Fix before release
- 71–100: 🔴 Critical — Release blocked

## Demo Story (pre-loaded in UI)

Target: `https://www.saucedemo.com`

> As a registered user, I want to log in with valid credentials and browse the product catalog so that I can select items and add them to my cart.

Hit **✨ Load Demo** in the UI to pre-fill everything.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Agent | Claude Sonnet (Anthropic) |
| Backend | FastAPI + Python 3.11 |
| Test Execution | Playwright (Chromium) |
| Database | SQLite (zero-setup) |
| Frontend | React 18 + Vite |
| Reports | Self-contained HTML |
