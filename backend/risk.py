from typing import List, Dict

def calculate_risk_score(results: List[Dict], previous_results: List[Dict] = None) -> Dict:
    """
    Calculate a 0-100 release risk score.
    Lower = safer to release.

    Weights:
      - Pass rate:               40%
      - Critical failures:       30%
      - Regressions (new fails): 20%
      - Edge case coverage:      10%
    """
    if not results:
        return {"score": 100, "level": "critical", "breakdown": {}}

    total = len(results)
    passed = sum(1 for r in results if r["status"] == "passed")
    failed = total - passed
    critical_failures = sum(
        1 for r in results if r["status"] == "failed" and r.get("priority") == "critical"
    )
    critical_total = sum(1 for r in results if r.get("priority") == "critical") or 1
    edge_cases = sum(1 for r in results if r.get("type") == "edge_case")
    edge_passed = sum(1 for r in results if r.get("type") == "edge_case" and r["status"] == "passed")

    # Regression detection: tests that passed before but fail now
    regressions = 0
    regression_ids = set()
    if previous_results:
        prev_map = {r["test_case_id"]: r["status"] for r in previous_results}
        for r in results:
            tid = r.get("test_case_id")
            if r["status"] == "failed" and prev_map.get(tid) == "passed":
                regressions += 1
                regression_ids.add(tid)

    # Component scores (higher = more risk)
    pass_rate_risk = (failed / total) * 100 if total else 0
    critical_risk = (critical_failures / critical_total) * 100
    regression_risk = min(regressions * 25, 100)
    edge_risk = ((edge_cases - edge_passed) / edge_cases * 100) if edge_cases > 0 else 50

    # Weighted final score
    score = (
        pass_rate_risk * 0.40 +
        critical_risk  * 0.30 +
        regression_risk * 0.20 +
        edge_risk       * 0.10
    )
    score = round(min(100, max(0, score)))

    if score <= 20:
        level = "low"
        recommendation = "Safe to release. All critical tests passing."
    elif score <= 45:
        level = "medium"
        recommendation = "Review failures before release. No critical blockers."
    elif score <= 70:
        level = "high"
        recommendation = "Do not release without fixing critical failures."
    else:
        level = "critical"
        recommendation = "Release blocked. Major regressions or critical failures detected."

    return {
        "score": score,
        "level": level,
        "recommendation": recommendation,
        "regression_ids": list(regression_ids),
        "regressions": regressions,
        "breakdown": {
            "pass_rate": round(100 - pass_rate_risk),
            "critical_pass_rate": round(100 - critical_risk),
            "regression_risk": round(regression_risk),
            "edge_coverage": round(100 - edge_risk),
        }
    }
