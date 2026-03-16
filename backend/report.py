from typing import List, Dict
import json


def generate_html_report(run: Dict, results: List[Dict]) -> str:
    passed = sum(1 for r in results if r["status"] == "passed")
    failed = len(results) - passed
    risk = run.get("risk_score", 0)
    risk_level = (run.get("risk_level") or "unknown").upper()

    level_color = {
        "LOW": "#22c55e", "MEDIUM": "#f59e0b",
        "HIGH": "#f97316", "CRITICAL": "#ef4444", "UNKNOWN": "#94a3b8",
    }.get(risk_level, "#94a3b8")

    rows = ""
    for r in results:
        icon = "✅" if r["status"] == "passed" else "❌"
        reg = " 🔴 REGRESSION" if r.get("is_regression") else ""
        screenshot_html = ""
        if r.get("screenshot"):
            screenshot_html = (
                f'<br><img src="data:image/jpeg;base64,{r["screenshot"]}" '
                f'style="max-width:320px;border-radius:6px;margin-top:8px;">'
            )
        error_html = (
            f'<div style="color:#ef4444;font-size:12px;margin-top:6px;font-family:monospace">'
            f'{r["error"]}</div>'
        ) if r.get("error") else ""

        rows += f"""
        <tr>
          <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb">
            {icon} <strong>{r['test_name']}</strong>{reg}
            <div style="color:#6b7280;font-size:12px;margin-top:4px">{r.get('rationale','')}</div>
            {error_html}
            {screenshot_html}
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center">
            <span style="background:{'#dcfce7' if r['type']=='functional' else '#ede9fe'};
                         color:{'#166534' if r['type']=='functional' else '#5b21b6'};
                         padding:2px 8px;border-radius:9999px;font-size:12px">{r['type']}</span>
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center">
            <span style="background:{'#fee2e2' if r['priority']=='critical' else '#fef3c7'};
                         color:{'#991b1b' if r['priority']=='critical' else '#92400e'};
                         padding:2px 8px;border-radius:9999px;font-size:12px">{r['priority']}</span>
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center;
                     color:{'#22c55e' if r['status']=='passed' else '#ef4444'}">
            {r['status'].upper()}
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;
                     color:#6b7280;font-size:13px">{r.get('duration',0):.2f}s</td>
        </tr>"""

    plan_summary = ""
    if run.get("test_plan"):
        try:
            plan = json.loads(run["test_plan"])
            plan_summary = plan.get("summary", "")
        except Exception:
            pass

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Release Test Report — {run['id'][:8]}</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          margin: 0; padding: 32px; background: #f8fafc; color: #1e293b; }}
  h1 {{ font-size: 24px; font-weight: 700; margin: 0 0 4px; }}
  .meta {{ color: #64748b; font-size: 13px; margin-bottom: 32px; }}
  .cards {{ display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }}
  .card {{ background: #fff; border-radius: 10px; padding: 20px 24px;
           border: 1px solid #e2e8f0; min-width: 140px; }}
  .card-val {{ font-size: 28px; font-weight: 700; }}
  .card-label {{ font-size: 12px; color: #94a3b8; margin-top: 4px; }}
  table {{ width: 100%; border-collapse: collapse; background: #fff;
           border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; }}
  th {{ text-align: left; padding: 12px 8px; background: #f1f5f9;
       font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }}
</style>
</head>
<body>
<h1>AI Release Test Report</h1>
<p class="meta">
  Run ID: {run['id']} &nbsp;·&nbsp;
  App: {run['app_url']} &nbsp;·&nbsp;
  {run.get('created_at','')[:19].replace('T',' ')} UTC
  {f'&nbsp;·&nbsp;<em>{plan_summary}</em>' if plan_summary else ''}
</p>

<div class="cards">
  <div class="card">
    <div class="card-val" style="color:{level_color}">{risk}</div>
    <div class="card-label">Risk Score</div>
  </div>
  <div class="card">
    <div class="card-val" style="color:{level_color}">{risk_level}</div>
    <div class="card-label">Risk Level</div>
  </div>
  <div class="card">
    <div class="card-val" style="color:#22c55e">{passed}</div>
    <div class="card-label">Passed</div>
  </div>
  <div class="card">
    <div class="card-val" style="color:#ef4444">{failed}</div>
    <div class="card-label">Failed</div>
  </div>
  <div class="card">
    <div class="card-val">{run.get('total_tests',0)}</div>
    <div class="card-label">Total Tests</div>
  </div>
  <div class="card">
    <div class="card-val" style="color:#f97316">{run.get('regressions',0)}</div>
    <div class="card-label">Regressions</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Test Case</th>
      <th style="text-align:center">Type</th>
      <th style="text-align:center">Priority</th>
      <th style="text-align:center">Result</th>
      <th style="text-align:right">Duration</th>
    </tr>
  </thead>
  <tbody>{rows}</tbody>
</table>
</body>
</html>"""
