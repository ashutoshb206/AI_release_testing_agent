"""
AI Agent — Test Plan Generator
Supports multiple LLM providers via MODEL_PROVIDER env variable.

  MODEL_PROVIDER=groq          → GROQ_API_KEY + GROQ_MODEL
  MODEL_PROVIDER=huggingface   → HF_TOKEN + HF_MODEL
  MODEL_PROVIDER=ollama        → OLLAMA_BASE_URL + OLLAMA_MODEL (no key needed)
  MODEL_PROVIDER=anthropic     → ANTHROPIC_API_KEY (default)
"""
import json
import os
import re

SYSTEM_PROMPT = """You are a senior QA engineer and test architect specialising in web application testing.
Given a user story, acceptance criteria, and target URL, generate a comprehensive test plan.

You MUST return ONLY valid JSON — no markdown fences, no preamble, no explanation.
Start your response with { and end with }

Return exactly this structure:
{
  "summary": "one-sentence description of what is being tested",
  "test_cases": [
    {
      "id": "TC001",
      "name": "Descriptive test name",
      "type": "functional|edge_case|negative|regression",
      "priority": "critical|high|medium|low",
      "rationale": "Which acceptance criterion this covers and why it matters",
      "steps": [
        {"action": "navigate",       "value": "{app_url}"},
        {"action": "fill",           "selector": "#user-name", "value": "standard_user"},
        {"action": "fill",           "selector": "#password",  "value": "valid_password"},
        {"action": "click",          "selector": "#login-button"},
        {"action": "waitForURL",     "value": "**/inventory.html"},
        {"action": "assertText",     "selector": ".title", "expected": "Products"},
        {"action": "assertVisible",  "selector": ".inventory_list"}
      ]
    }
  ]
}

Supported actions:
  navigate        - value: URL (use {app_url} for base)
  fill            - selector, value
  click           - selector
  waitForURL      - value: glob pattern
  waitForSelector - selector
  assertText      - selector, expected (substring match)
  assertVisible   - selector
  assertNotVisible- selector
  assertURL       - contains: substring
  select          - selector, value
  pressKey        - value: key name
  wait            - value: seconds (float)
  scroll          - no params needed
  screenshot      - (auto-called on pass/fail, but you can add explicit ones)

VERIFIED SELECTORS — use exactly these for saucedemo.com:
  Username field:      #user-name
  Password field:      #password
  Login button:        #login-button
  Error message:       [data-test="error"]          ← NOT .error-message
  Products page title: .title
  Inventory list:      .inventory_list
  Add to cart (any item): [data-test^="add-to-cart"]  ← NOT .btn_add_cart
  Remove from cart:       [data-test^="remove"]        ← NOT .btn_remove  
  Cart badge count:       .shopping_cart_badge         ← NOT .cart-count
  Cart link:           .shopping_cart_link

VERIFIED SELECTORS — for automationexercise.com:
  Login email:         input[data-qa="login-email"]
  Login password:      input[data-qa="login-password"]
  Login button:        button[data-qa="login-button"]
  Error message:       p:has-text("Your email or password is incorrect")
  Signup name:         input[data-qa="signup-name"]
  Products page:       .features_items

Rules:
1. Generate 6-10 test cases: at least 2 functional, 2 edge cases, 2 negative, 1 regression
2. Mark authentication/core-flow tests as "critical"  
3. Use ONLY verified selectors above for known sites — never guess class names
4. For SauceDemo: valid_user/valid_password (valid), locked_out_user/locked_password (locked), invalid_user/wrong_password (invalid)
5. After clicking login with bad creds, use: {"action": "assertVisible", "selector": "[data-test=\"error\"}"}  NOT .error-message
6. Keep steps 4-8 per test case
7. NEVER use .btn_add_cart, .add-to-cart, .btn_remove, or .cart-count — these selectors do not exist on SauceDemo

8. RETURN ONLY JSON — no text before or after"""


# ── JSON extraction ────────────────────────────────────────────────────────────

def _extract_json(raw: str) -> dict:
    """Robustly extract JSON even if model adds preamble/fences."""
    raw = raw.strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Find outermost { ... } block
    start = raw.find('{')
    if start == -1:
        raise ValueError(f"No JSON found in model response:\n{raw[:400]}")
    depth = 0
    for i, ch in enumerate(raw[start:], start):
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return json.loads(raw[start:i + 1])
    raise ValueError(f"Unclosed JSON in response:\n{raw[:400]}")


# ── Provider implementations ──────────────────────────────────────────────────

def _openai_compat(base_url: str, api_key: str, model: str,
                   system: str, user: str, max_tokens: int) -> str:
    """Call any OpenAI-compatible endpoint (Groq / HF / Ollama)."""
    from openai import OpenAI
    client = OpenAI(base_url=base_url, api_key=api_key or "none")
    resp = client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        temperature=0.1,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    )
    return resp.choices[0].message.content or ""


def _call_anthropic(system: str, user: str, max_tokens: int) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    resp = client.messages.create(
        model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return resp.content[0].text


def _call_groq(system: str, user: str, max_tokens: int) -> str:
    return _openai_compat(
        base_url="https://api.groq.com/openai/v1",
        api_key=os.environ.get("GROQ_API_KEY", ""),
        model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
        system=system, user=user, max_tokens=max_tokens,
    )


def _call_huggingface(system: str, user: str, max_tokens: int) -> str:
    return _openai_compat(
        base_url="https://api-inference.huggingface.co/v1/",
        api_key=os.environ.get("HF_TOKEN", ""),
        model=os.environ.get("HF_MODEL", "Qwen/Qwen2.5-72B-Instruct"),
        system=system, user=user, max_tokens=max_tokens,
    )


def _call_ollama(system: str, user: str, max_tokens: int) -> str:
    base = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    return _openai_compat(
        base_url=f"{base}/v1",
        api_key="ollama",
        model=os.environ.get("OLLAMA_MODEL", "llama3.1"),
        system=system, user=user, max_tokens=max_tokens,
    )


def _llm(system: str, user: str, max_tokens: int = 4096) -> str:
    """Route to the configured provider."""
    provider = os.environ.get("MODEL_PROVIDER", "anthropic").lower()
    print(f"[agent] provider={provider}")
    dispatch = {
        "groq":         _call_groq,
        "huggingface":  _call_huggingface,
        "hf":           _call_huggingface,
        "ollama":       _call_ollama,
        "anthropic":    _call_anthropic,
    }
    fn = dispatch.get(provider, _call_anthropic)
    return fn(system, user, max_tokens)


# ── Public API ────────────────────────────────────────────────────────────────

async def generate_test_plan(story: str, acceptance_criteria: str, app_url: str) -> dict:
    user_msg = f"""User Story:
{story}

Acceptance Criteria:
{acceptance_criteria if acceptance_criteria.strip() else "Not provided — infer from the story."}

Target Application URL: {app_url}

Return ONLY the JSON object — no other text."""

    raw = _llm(SYSTEM_PROMPT, user_msg, max_tokens=4096)
    plan = _extract_json(raw)

    for i, tc in enumerate(plan.get("test_cases", []), 1):
        if not tc.get("id"):
            tc["id"] = f"TC{i:03d}"
    return plan


async def generate_playwright_script(test_case: dict, app_url: str) -> str:
    system = "You are a Python Playwright expert. Return ONLY Python code — no explanations, no fences."
    user = f"""Convert these steps into Python Playwright async code.
Test: {test_case['name']}  |  App: {app_url}
Steps: {json.dumps(test_case.get('steps', []), indent=2)}
Use async/await with playwright.async_api. Screenshot on failure."""

    code = _llm(system, user, max_tokens=1024)
    code = re.sub(r'^```(?:python)?\s*', '', code.strip())
    code = re.sub(r'\s*```$', '', code).strip()
    return code
