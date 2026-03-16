import asyncio
import base64
import json
import uuid
from datetime import datetime, timezone

from playwright.async_api import async_playwright, TimeoutError as PWTimeout
from database import get_db
from risk import calculate_risk_score
from agent import generate_test_plan


# ──────────────────────────────────────────────
# Selector corrections for SauceDemo
# ──────────────────────────────────────────────

SELECTOR_CORRECTIONS = {
    ".btn_add_cart":          "[data-test^='add-to-cart']",
    ".add-to-cart":           "[data-test^='add-to-cart']", 
    ".add_to_cart_button":    "[data-test^='add-to-cart']",
    ".btn-add-to-cart":       "[data-test^='add-to-cart']",
    ".btn_remove":            "[data-test^='remove']",
    ".remove-item":           "[data-test^='remove']",
    ".cart-count":            ".shopping_cart_badge",
    ".cart_badge":            ".shopping_cart_badge",
}

def correct_selector(selector: str) -> str:
    """Apply selector corrections before using with Playwright."""
    return SELECTOR_CORRECTIONS.get(selector, selector)


# ──────────────────────────────────────────────
# Step interpreter
# ──────────────────────────────────────────────

async def execute_step(page, step: dict, app_url: str):
    action = step.get("action", "")
    timeout = int(step.get("timeout", 15000))

    if action == "navigate":
        url = step["value"].replace("{app_url}", app_url)
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)

    elif action == "fill":
        selector = correct_selector(step["selector"])
        await page.wait_for_selector(selector, timeout=timeout)
        await page.fill(selector, step["value"])

    elif action == "click":
        selector = correct_selector(step["selector"])
        await page.wait_for_selector(selector, timeout=timeout)
        await page.click(selector)

    elif action == "waitForURL":
        await page.wait_for_url(step["value"], timeout=timeout)

    elif action == "waitForSelector":
        selector = correct_selector(step["selector"])
        await page.wait_for_selector(selector, timeout=timeout)

    elif action == "assertText":
        selector = correct_selector(step["selector"])
        el = await page.wait_for_selector(selector, timeout=timeout)
        actual = (await el.text_content() or "").strip()
        expected = step.get("expected", "")
        if expected.lower() not in actual.lower():
            raise AssertionError(
                f"Text assertion failed — expected '{expected}' in '{actual}'"
            )

    elif action == "assertVisible":
        selector = correct_selector(step["selector"])
        # Auto-correct common wrong selectors the AI sometimes generates
        FALLBACKS = {
            ".error-message":            "[data-test='error']",
            ".error-message-container":  "[data-test='error']",
            ".error":                    "[data-test='error']",
            "#error":                    "[data-test='error']",
            ".alert-error":              "[data-test='error']",
            ".alert-danger":             "[data-test='error']",
        }
        fallback = FALLBACKS.get(selector)
        try:
            await page.wait_for_selector(selector, state="visible", timeout=timeout)
        except Exception as primary_err:
            if fallback:
                try:
                    await page.wait_for_selector(fallback, state="visible", timeout=5000)
                    return   # fallback succeeded — test passes
                except Exception:
                    pass
            raise primary_err

    elif action == "assertNotVisible":
        selector = correct_selector(step["selector"])
        try:
            await page.wait_for_selector(selector, state="hidden", timeout=timeout)
        except Exception:
            raise AssertionError(f"Element '{selector}' is still visible")

    elif action == "assertURL":
        current = page.url
        needle = step.get("contains", "")
        if needle and needle not in current:
            raise AssertionError(f"URL '{current}' does not contain '{needle}'")

    elif action == "select":
        selector = correct_selector(step["selector"])
        await page.select_option(selector, step["value"])

    elif action == "pressKey":
        await page.keyboard.press(step["value"])

    elif action == "wait":
        await asyncio.sleep(float(step.get("value", 1)))

    elif action == "scroll":
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")

    elif action == "screenshot":
        pass  # handled automatically

    else:
        # Unknown action — log and skip rather than crash the run
        print(f"[executor] Unknown action '{action}' — skipping")


# ──────────────────────────────────────────────
# Single test case runner
# ──────────────────────────────────────────────

async def run_single_test(test_case: dict, app_url: str) -> dict:
    start = datetime.now(timezone.utc)
    screenshot_b64 = None
    error_msg = None
    status = "passed"

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"]
        )
        ctx = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        )
        page = await ctx.new_page()

        try:
            for step in test_case.get("steps", []):
                await execute_step(page, step, app_url)

            screenshot = await page.screenshot(type="jpeg", quality=80)
            screenshot_b64 = base64.b64encode(screenshot).decode()

        except Exception as exc:
            status = "failed"
            error_msg = str(exc)
            try:
                screenshot = await page.screenshot(type="jpeg", quality=80)
                screenshot_b64 = base64.b64encode(screenshot).decode()
            except Exception:
                pass

        finally:
            await browser.close()

    duration = (datetime.now(timezone.utc) - start).total_seconds()

    return {
        "id": str(uuid.uuid4()),
        "test_case_id": test_case["id"],
        "test_name": test_case["name"],
        "type": test_case.get("type", "functional"),
        "priority": test_case.get("priority", "medium"),
        "status": status,
        "error": error_msg,
        "screenshot": screenshot_b64,
        "duration": round(duration, 2),
        "rationale": test_case.get("rationale", ""),
        "steps": json.dumps(test_case.get("steps", [])),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


# ──────────────────────────────────────────────
# Full run orchestrator  (called as background task)
# ──────────────────────────────────────────────

async def execute_test_run(run_id: str, story: str, acceptance_criteria: str, app_url: str):
    db = get_db()
    run_start = datetime.now(timezone.utc)

    try:
        # Mark as running
        db.execute(
            "UPDATE test_runs SET status = 'running' WHERE id = ?", (run_id,)
        )
        db.commit()

        # Generate test plan
        plan = await generate_test_plan(story, acceptance_criteria, app_url)
        test_cases = plan.get("test_cases", [])

        db.execute(
            "UPDATE test_runs SET total_tests = ?, test_plan = ? WHERE id = ?",
            (len(test_cases), json.dumps(plan), run_id),
        )
        db.commit()

        # Fetch previous run results for regression detection
        prev_run = db.execute(
            "SELECT id FROM test_runs WHERE status = 'completed' AND id != ? ORDER BY created_at DESC LIMIT 1",
            (run_id,)
        ).fetchone()
        previous_results = []
        if prev_run:
            rows = db.execute(
                "SELECT * FROM test_results WHERE run_id = ?", (prev_run["id"],)
            ).fetchall()
            previous_results = [dict(r) for r in rows]

        # Execute tests sequentially so the SSE stream shows real progress
        all_results = []
        for tc in test_cases:
            result = await run_single_test(tc, app_url)
            result["run_id"] = run_id

            # Regression flag
            if previous_results:
                prev_map = {r["test_case_id"]: r["status"] for r in previous_results}
                if result["status"] == "failed" and prev_map.get(tc["id"]) == "passed":
                    result["is_regression"] = 1

            db.execute("""
                INSERT INTO test_results
                  (id, run_id, test_case_id, test_name, type, priority,
                   status, error, screenshot, duration, rationale, steps,
                   is_regression, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                result["id"], run_id, result["test_case_id"], result["test_name"],
                result["type"], result["priority"], result["status"], result["error"],
                result["screenshot"], result["duration"], result["rationale"],
                result["steps"], result.get("is_regression", 0), result["created_at"],
            ))
            db.commit()
            all_results.append(result)

        # Risk scoring
        risk = calculate_risk_score(all_results, previous_results)
        passed = sum(1 for r in all_results if r["status"] == "passed")
        failed = len(all_results) - passed
        duration = (datetime.now(timezone.utc) - run_start).total_seconds()

        db.execute("""
            UPDATE test_runs
            SET status='completed', risk_score=?, risk_level=?,
                passed_tests=?, failed_tests=?, regressions=?,
                duration=?, completed_at=?
            WHERE id=?
        """, (
            risk["score"], risk["level"], passed, failed,
            risk["regressions"], round(duration, 2),
            datetime.now(timezone.utc).isoformat(), run_id
        ))
        db.commit()

    except Exception as exc:
        db.execute(
            "UPDATE test_runs SET status='failed' WHERE id=?", (run_id,)
        )
        db.commit()
        print(f"[executor] Run {run_id} crashed: {exc}")
        raise
    finally:
        db.close()
