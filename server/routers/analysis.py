"""Server-side AI-powered analytics analysis.

Each chart type gets its own analysis endpoint that:
1. Fetches raw analytics data from the database
2. Sends it to the LLM with a structured prompt
3. Returns InsightItems, summary, recommendations, and breakdown
4. Falls back to rule-based analysis if the LLM is unavailable
"""

import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from models.models import User
from auth import require_role
from services.llm import get_json_completion

# Re-use the existing analytics query functions
from routers.analytics import (
    dashboard_summary,
    submission_trends,
    ksb_coverage_by_type,
    submissions_by_module,
    cohort_comparison,
    apprentice_scatter,
    intervention_analysis,
    apprentice_progress,
    ksb_heatmap,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analysis"])

_allowed = Depends(require_role("admin", "coach"))

# ── Simple in-memory cache (chart_id → {data, timestamp}) ──
_cache: dict[str, dict] = {}
CACHE_TTL = 900  # 15 minutes


def _get_cached(key: str) -> Optional[dict]:
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return entry["data"]
    return None


def _set_cached(key: str, data: dict):
    _cache[key] = {"data": data, "ts": time.time()}


# ── LLM prompt templates ───────────────────────────────

ANALYSIS_SYSTEM_PROMPT = """You are a senior data analyst for ApprentiTrack, an apprenticeship management platform.
You analyse dashboard data and produce structured JSON insights for coaches and administrators.

ALWAYS respond with valid JSON in this EXACT format (no markdown, no code fences):
{
  "insights": [
    {"label": "Metric Name", "value": "display value", "detail": "optional context", "color": "#hex"}
  ],
  "summary": "A 2-3 sentence narrative paragraph analysing the data.",
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2", "Actionable recommendation 3"],
  "breakdown": [
    {"label": "Row label", "values": {"Column1": "value1", "Column2": "value2"}}
  ]
}

Rules:
- Return EXACTLY 4 insights with appropriate colors (#10b981 green for positive, #ef4444 red for negative, #3b82f6 blue neutral, #f59e0b amber for warning, #8b5cf6 purple for highlight)
- Return 3-4 actionable recommendations specific to the data
- The summary should reference specific numbers from the data
- The breakdown should be a tabular view of the key data points
- Keep all text concise and professional
- Return ONLY the JSON object, no other text"""


def _build_user_prompt(chart_id: str, data: dict | list) -> str:
    """Build the user prompt by describing the chart context and injecting data."""
    descriptions = {
        "trends": "Submission Trends over time. Monthly submission counts broken down by status (draft, submitted, reviewed, accepted).",
        "ksbType": "KSB Coverage by Type. How many Knowledge, Skill, and Behaviour competencies have evidence mapped to them.",
        "modules": "Submissions by Module. Count of evidence submissions per module.",
        "cohorts": "Cohort Comparison. Cross-cohort comparison of submissions, acceptance rates, KSB coverage, and interventions.",
        "scatter": "Apprentice Performance Scatter. Per-apprentice submissions vs KSB coverage percentage.",
        "severity": "Intervention Severity Breakdown. Interventions grouped by severity (low/medium/high) and status (open/in_progress/resolved).",
        "monthlyInt": "Monthly Intervention Trends. Number of interventions raised per month broken down by severity.",
        "progress": "Apprentice Progress. Per-apprentice submission counts and KSB coverage percentages.",
        "heatmap": "KSB Evidence Heatmap. Evidence density across modules and KSB codes — which module-KSB combinations have evidence.",
    }
    desc = descriptions.get(chart_id, f"Analytics data for {chart_id}")
    import json
    data_str = json.dumps(data, default=str)
    # Truncate very large data to avoid token limits
    if len(data_str) > 8000:
        data_str = data_str[:8000] + "... (truncated)"
    return f"Analyse this '{desc}' data and generate insights:\n\n{data_str}"


# ── Fallback rule-based analysis ───────────────────────

def _fallback_trends(data: list) -> dict:
    if not data:
        return {"insights": [], "summary": "No trend data available.", "recommendations": [], "breakdown": []}
    peak = max(data, key=lambda t: t.get("total", 0))
    total = sum(t.get("total", 0) for t in data)
    latest = data[-1] if data else {}
    accept_rate = round((latest.get("accepted", 0) / latest.get("total", 1)) * 100) if latest.get("total") else 0
    return {
        "insights": [
            {"label": "Total Submissions", "value": str(total), "color": "#3b82f6"},
            {"label": "Peak Month", "value": peak.get("month", "N/A"), "detail": f"{peak.get('total', 0)} submissions", "color": "#8b5cf6"},
            {"label": "Months Tracked", "value": str(len(data)), "color": "#06b6d4"},
            {"label": "Current Accept Rate", "value": f"{accept_rate}%", "color": "#10b981"},
        ],
        "summary": f"Over {len(data)} months, {total} submissions have been recorded. The peak was {peak.get('month', 'N/A')} with {peak.get('total', 0)} submissions. The current acceptance rate is {accept_rate}%.",
        "recommendations": [
            "Monitor submission volume trends for early warning signs of disengagement.",
            "Review months with low submission counts to identify potential barriers.",
            "Aim to increase the acceptance rate by providing clearer submission guidelines.",
        ],
        "breakdown": [
            {"label": t.get("month", ""), "values": {"Draft": t.get("draft", 0), "Submitted": t.get("submitted", 0), "Reviewed": t.get("reviewed", 0), "Accepted": t.get("accepted", 0), "Total": t.get("total", 0)}}
            for t in data
        ],
    }


def _fallback_ksb_type(data: list) -> dict:
    if not data:
        return {"insights": [], "summary": "No KSB data available.", "recommendations": [], "breakdown": []}
    best = max(data, key=lambda t: (t.get("evidenced", 0) / t.get("total", 1)) * 100 if t.get("total") else 0)
    worst = min(data, key=lambda t: (t.get("evidenced", 0) / t.get("total", 1)) * 100 if t.get("total") else 0)
    best_pct = round((best.get("evidenced", 0) / best.get("total", 1)) * 100) if best.get("total") else 0
    worst_pct = round((worst.get("evidenced", 0) / worst.get("total", 1)) * 100) if worst.get("total") else 0
    avg = round(sum((t.get("evidenced", 0) / t.get("total", 1)) * 100 if t.get("total") else 0 for t in data) / len(data))
    return {
        "insights": [
            {"label": "Highest Coverage", "value": f"{best.get('type', 'N/A')}: {best_pct}%", "color": "#10b981"},
            {"label": "Lowest Coverage", "value": f"{worst.get('type', 'N/A')}: {worst_pct}%", "color": "#ef4444"},
            {"label": "Average Coverage", "value": f"{avg}%", "color": "#3b82f6"},
            {"label": "Coverage Gap", "value": f"{100 - avg}%", "detail": "Average gap to 100%", "color": "#f59e0b"},
        ],
        "summary": f"KSB coverage varies across types. {best.get('type', 'N/A')} leads at {best_pct}% while {worst.get('type', 'N/A')} lags at {worst_pct}%. Average coverage is {avg}%.",
        "recommendations": [
            f"Prioritise {worst.get('type', 'the weakest area')} evidence gathering to close the coverage gap.",
            "Review whether current activities naturally cover all three KSB types equally.",
            "Set stretch targets to push all types above 80% coverage.",
        ],
        "breakdown": [
            {"label": t.get("type", ""), "values": {"Total": t.get("total", 0), "Evidenced": t.get("evidenced", 0), "Coverage %": f"{round((t.get('evidenced', 0) / t.get('total', 1)) * 100) if t.get('total') else 0}%"}}
            for t in data
        ],
    }


def _fallback_generic(chart_id: str, data) -> dict:
    """Generic fallback for chart types without specific logic."""
    count = len(data) if isinstance(data, list) else 0
    return {
        "insights": [
            {"label": "Data Points", "value": str(count), "color": "#3b82f6"},
            {"label": "Chart Type", "value": chart_id, "color": "#8b5cf6"},
            {"label": "Status", "value": "Rule-based", "detail": "LLM unavailable", "color": "#f59e0b"},
            {"label": "Coverage", "value": "Basic", "color": "#64748b"},
        ],
        "summary": f"Analysis for {chart_id} with {count} data points. Connect an LLM API key for AI-powered insights.",
        "recommendations": [
            "Configure an OpenAI API key in .env for AI-generated analysis.",
            "Review the raw data in the chart for patterns.",
            "Use the breakdown table for detailed figures.",
        ],
        "breakdown": [],
    }


def _fallback_modules(data: list) -> dict:
    if not data:
        return _fallback_generic("modules", data)
    total = sum(m.get("submissions", 0) for m in data)
    avg = round(total / len(data)) if data else 0
    sorted_d = sorted(data, key=lambda m: m.get("submissions", 0), reverse=True)
    return {
        "insights": [
            {"label": "Most Active", "value": sorted_d[0].get("module", "N/A"), "detail": f"{sorted_d[0].get('submissions', 0)} submissions", "color": "#10b981"},
            {"label": "Least Active", "value": sorted_d[-1].get("module", "N/A"), "detail": f"{sorted_d[-1].get('submissions', 0)} submissions", "color": "#ef4444"},
            {"label": "Avg / Module", "value": str(avg), "color": "#3b82f6"},
            {"label": "Total", "value": str(total), "detail": f"Across {len(data)} modules", "color": "#8b5cf6"},
        ],
        "summary": f"Across {len(data)} modules, {total} submissions averaging {avg} per module. {sorted_d[0].get('module', '')} is most active, {sorted_d[-1].get('module', '')} least.",
        "recommendations": [
            "Investigate modules with below-average submissions for engagement issues.",
            "Ensure module deadlines are staggered to prevent clustering.",
            "Compare module activity with KSB mapping to ensure balanced coverage.",
        ],
        "breakdown": [
            {"label": m.get("module", ""), "values": {"Submissions": m.get("submissions", 0), "vs Average": f"{'+' if m.get('submissions', 0) >= avg else ''}{m.get('submissions', 0) - avg}"}}
            for m in sorted_d
        ],
    }


def _fallback_cohorts(data: list) -> dict:
    if not data:
        return _fallback_generic("cohorts", data)
    total_subs = sum(c.get("submissions", 0) for c in data)
    best = max(data, key=lambda c: c.get("ksb_coverage_pct", 0))
    return {
        "insights": [
            {"label": "Best Coverage", "value": best.get("cohort", "N/A"), "detail": f"{best.get('ksb_coverage_pct', 0)}%", "color": "#10b981"},
            {"label": "Total Submissions", "value": str(total_subs), "color": "#3b82f6"},
            {"label": "Cohorts", "value": str(len(data)), "color": "#8b5cf6"},
            {"label": "Total Interventions", "value": str(sum(c.get("interventions", 0) for c in data)), "color": "#ef4444"},
        ],
        "summary": f"{len(data)} cohorts with {total_subs} total submissions. {best.get('cohort', 'N/A')} leads in KSB coverage at {best.get('ksb_coverage_pct', 0)}%.",
        "recommendations": [
            "Compare best-performing cohort practices with underperformers.",
            "Review intervention distribution across cohorts.",
            "Set cohort-level KSB coverage targets.",
        ],
        "breakdown": [
            {"label": c.get("cohort", ""), "values": {"Apprentices": c.get("apprentices", 0), "Submissions": c.get("submissions", 0), "KSB %": f"{c.get('ksb_coverage_pct', 0)}%", "Interventions": c.get("interventions", 0)}}
            for c in data
        ],
    }


def _fallback_scatter(data: list) -> dict:
    if not data:
        return _fallback_generic("scatter", data)
    avg_cov = round(sum(s.get("ksb_coverage_pct", 0) for s in data) / len(data))
    avg_subs = round(sum(s.get("submissions", 0) for s in data) / len(data))
    at_risk = [s for s in data if s.get("ksb_coverage_pct", 0) < 30 and s.get("submissions", 0) < avg_subs]
    top = [s for s in data if s.get("ksb_coverage_pct", 0) >= 70]
    return {
        "insights": [
            {"label": "Avg KSB Coverage", "value": f"{avg_cov}%", "color": "#3b82f6"},
            {"label": "Avg Submissions", "value": str(avg_subs), "color": "#8b5cf6"},
            {"label": "Top Performers", "value": str(len(top)), "color": "#10b981"},
            {"label": "At Risk", "value": str(len(at_risk)), "color": "#ef4444" if at_risk else "#10b981"},
        ],
        "summary": f"{len(data)} apprentices tracked with average KSB coverage of {avg_cov}% and {avg_subs} submissions each. {len(at_risk)} at risk, {len(top)} performing strongly.",
        "recommendations": [
            f"Support the {len(at_risk)} at-risk apprentices with targeted coaching." if at_risk else "No apprentices at critical risk.",
            "Consider peer mentoring from top performers.",
            "Review apprentices with high submissions but low coverage for unfocused evidence.",
        ],
        "breakdown": [
            {"label": s.get("name", ""), "values": {"Submissions": s.get("submissions", 0), "KSB %": f"{s.get('ksb_coverage_pct', 0)}%", "Cohort": s.get("cohort", "")}}
            for s in sorted(data, key=lambda s: s.get("ksb_coverage_pct", 0), reverse=True)
        ],
    }


def _fallback_severity(data: dict) -> dict:
    sev_rows = data.get("by_severity", []) if isinstance(data, dict) else data
    if not sev_rows:
        return _fallback_generic("severity", [])
    total_all = sum(r.get("total", 0) for r in sev_rows)
    total_open = sum(r.get("open", 0) for r in sev_rows)
    total_resolved = sum(r.get("resolved", 0) for r in sev_rows)
    rate = round((total_resolved / total_all) * 100) if total_all else 0
    return {
        "insights": [
            {"label": "Open Flags", "value": str(total_open), "color": "#ef4444"},
            {"label": "Resolution Rate", "value": f"{rate}%", "color": "#10b981" if rate >= 60 else "#f59e0b"},
            {"label": "Total Flags", "value": str(total_all), "color": "#3b82f6"},
            {"label": "Resolved", "value": str(total_resolved), "color": "#10b981"},
        ],
        "summary": f"{total_all} intervention flags. {total_open} open, {total_resolved} resolved ({rate}% resolution rate).",
        "recommendations": [
            "Prioritise high-severity open interventions.",
            "Review resolution workflows to improve rate." if rate < 60 else "Resolution rate is healthy.",
            "Conduct weekly triage meetings for all open interventions.",
        ],
        "breakdown": [
            {"label": r.get("severity", "").title(), "values": {"Open": r.get("open", 0), "In Progress": r.get("in_progress", 0), "Resolved": r.get("resolved", 0), "Total": r.get("total", 0)}}
            for r in sev_rows
        ],
    }


def _fallback_monthly_int(data: dict) -> dict:
    monthly = data.get("monthly", []) if isinstance(data, dict) else data
    if not monthly:
        return _fallback_generic("monthlyInt", [])
    total = sum(m.get("total", 0) for m in monthly)
    peak = max(monthly, key=lambda m: m.get("total", 0))
    avg = round(total / len(monthly)) if monthly else 0
    return {
        "insights": [
            {"label": "Peak Month", "value": peak.get("month", "N/A"), "detail": f"{peak.get('total', 0)} interventions", "color": "#ef4444"},
            {"label": "Monthly Average", "value": str(avg), "color": "#3b82f6"},
            {"label": "Total", "value": str(total), "color": "#8b5cf6"},
            {"label": "Months Tracked", "value": str(len(monthly)), "color": "#06b6d4"},
        ],
        "summary": f"Over {len(monthly)} months, {total} interventions averaging {avg} per month. Peak was {peak.get('month', 'N/A')} with {peak.get('total', 0)}.",
        "recommendations": [
            "Compare intervention peaks with submission deadlines to identify correlation.",
            "Establish clear escalation paths for each severity level.",
            "Monitor trends monthly to detect emerging issues early.",
        ],
        "breakdown": [
            {"label": m.get("month", ""), "values": {"Low": m.get("low", 0), "Medium": m.get("medium", 0), "High": m.get("high", 0), "Total": m.get("total", 0)}}
            for m in monthly
        ],
    }


def _fallback_progress(data: list) -> dict:
    if not data:
        return _fallback_generic("progress", data)
    coverages = [a.get("ksb_coverage_pct", 0) for a in data]
    avg = round(sum(coverages) / len(coverages)) if coverages else 0
    mx = max(coverages) if coverages else 0
    mn = min(coverages) if coverages else 0
    above50 = sum(1 for c in coverages if c >= 50)
    return {
        "insights": [
            {"label": "Highest Coverage", "value": f"{mx}%", "color": "#10b981"},
            {"label": "Lowest Coverage", "value": f"{mn}%", "color": "#ef4444" if mn < 30 else "#f59e0b"},
            {"label": "Average Coverage", "value": f"{avg}%", "color": "#3b82f6"},
            {"label": "Above 50%", "value": f"{above50}/{len(data)}", "color": "#8b5cf6"},
        ],
        "summary": f"{len(data)} apprentices with average KSB coverage of {avg}%. Range from {mn}% to {mx}%. {above50} have reached 50%+.",
        "recommendations": [
            "Schedule catch-up sessions for apprentices below 30% coverage.",
            "Set milestone check-ins at 25%, 50%, and 75% coverage.",
            "Investigate individual barriers for the lowest performers.",
        ],
        "breakdown": [
            {"label": a.get("name", ""), "values": {"KSB %": f"{a.get('ksb_coverage_pct', 0)}%", "Submissions": a.get("total_submissions", 0), "Interventions": a.get("open_interventions", 0)}}
            for a in sorted(data, key=lambda a: a.get("ksb_coverage_pct", 0), reverse=True)
        ],
    }


def _fallback_heatmap(data: dict) -> dict:
    grid = data.get("grid", []) if isinstance(data, dict) else []
    modules = data.get("modules", []) if isinstance(data, dict) else []
    ksbs = data.get("ksbs", []) if isinstance(data, dict) else []
    if not grid:
        return _fallback_generic("heatmap", [])
    total = sum(c.get("value", 0) for c in grid)
    empty = sum(1 for c in grid if c.get("value", 0) == 0)
    empty_pct = round((empty / len(grid)) * 100) if grid else 0
    hot = max(grid, key=lambda c: c.get("value", 0))
    return {
        "insights": [
            {"label": "Hottest Cell", "value": f"{hot.get('module', '')} × {hot.get('ksb', '')}", "detail": f"{hot.get('value', 0)} evidence items", "color": "#3b82f6"},
            {"label": "Total Evidence", "value": str(total), "color": "#8b5cf6"},
            {"label": "Empty Cells", "value": f"{empty} ({empty_pct}%)", "color": "#ef4444" if empty_pct > 50 else "#f59e0b"},
            {"label": "Grid Size", "value": f"{len(modules)} × {len(ksbs)}", "color": "#06b6d4"},
        ],
        "summary": f"Heatmap covers {len(modules)} modules and {len(ksbs)} KSBs with {total} evidence items. {empty} cells ({empty_pct}%) have no evidence.",
        "recommendations": [
            "Design activities targeting empty module-KSB cells." if empty_pct > 50 else "Coverage distribution is acceptable.",
            "Use the strongest combination as a template for other areas.",
            "Review whether certain KSBs need alternative assessment methods.",
        ],
        "breakdown": [],
    }


FALLBACK_FNS = {
    "trends": _fallback_trends,
    "ksbType": _fallback_ksb_type,
    "modules": _fallback_modules,
    "cohorts": _fallback_cohorts,
    "scatter": _fallback_scatter,
    "severity": _fallback_severity,
    "monthlyInt": _fallback_monthly_int,
    "progress": _fallback_progress,
    "heatmap": _fallback_heatmap,
}


# ── Data fetchers (call existing analytics functions) ──

def _fetch_chart_data(chart_id: str, db: Session, user: User):
    """Fetch the raw data for a given chart ID using existing analytics logic."""
    fetchers = {
        "trends": lambda: submission_trends(db=db, current_user=user),
        "ksbType": lambda: ksb_coverage_by_type(db=db, current_user=user),
        "modules": lambda: submissions_by_module(db=db, current_user=user),
        "cohorts": lambda: cohort_comparison(db=db, current_user=user),
        "scatter": lambda: apprentice_scatter(db=db, current_user=user),
        "severity": lambda: intervention_analysis(db=db, current_user=user),
        "monthlyInt": lambda: intervention_analysis(db=db, current_user=user),
        "progress": lambda: apprentice_progress(db=db, current_user=user),
        "heatmap": lambda: ksb_heatmap(db=db, current_user=user),
    }
    fetcher = fetchers.get(chart_id)
    if fetcher is None:
        return None
    return fetcher()


# ── Main endpoint ──────────────────────────────────────

VALID_CHART_IDS = {"trends", "ksbType", "modules", "cohorts", "scatter", "severity", "monthlyInt", "progress", "heatmap"}


@router.get("/{chart_id}/analysis")
def get_chart_analysis(chart_id: str, db: Session = Depends(get_db), current_user: User = _allowed):
    """Return AI-generated analysis for a specific chart.

    Falls back to rule-based analysis if the LLM is unavailable.
    """
    if chart_id not in VALID_CHART_IDS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Unknown chart ID: {chart_id}")

    # Check cache first
    cache_key = f"{chart_id}:{current_user.id}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    # Fetch raw data
    raw_data = _fetch_chart_data(chart_id, db, current_user)
    if raw_data is None:
        return _fallback_generic(chart_id, [])

    # For severity/monthlyInt, the data comes from the same endpoint
    if chart_id == "severity":
        analysis_data = raw_data.get("by_severity", raw_data) if isinstance(raw_data, dict) else raw_data
    elif chart_id == "monthlyInt":
        analysis_data = raw_data.get("monthly", raw_data) if isinstance(raw_data, dict) else raw_data
    else:
        analysis_data = raw_data

    # Try LLM first
    user_prompt = _build_user_prompt(chart_id, analysis_data)
    llm_result = get_json_completion(ANALYSIS_SYSTEM_PROMPT, user_prompt)

    if llm_result and _validate_analysis(llm_result):
        _set_cached(cache_key, llm_result)
        return llm_result

    # Fallback to rule-based
    logger.info(f"Using rule-based fallback for chart {chart_id}")
    fallback_fn = FALLBACK_FNS.get(chart_id, lambda d: _fallback_generic(chart_id, d))

    # Some fallbacks expect the full response dict (severity, monthlyInt, heatmap)
    if chart_id in ("severity", "monthlyInt", "heatmap"):
        result = fallback_fn(raw_data)
    else:
        result = fallback_fn(analysis_data)

    _set_cached(cache_key, result)
    return result


def _validate_analysis(data: dict) -> bool:
    """Check that the LLM response has the required structure."""
    if not isinstance(data, dict):
        return False
    if "insights" not in data or "summary" not in data or "recommendations" not in data:
        return False
    if not isinstance(data["insights"], list) or len(data["insights"]) == 0:
        return False
    if not isinstance(data["recommendations"], list):
        return False
    return True
