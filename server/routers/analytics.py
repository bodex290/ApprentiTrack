"""Analytics API routes – aggregated data for the dashboard and reports."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, cast, String, extract

from db.database import get_db, DATABASE_URL
from models.models import (
    Apprentice, Cohort, Module, Assessment, KSB,
    EvidenceSubmission, SubmissionKSB, CoachFeedback, InterventionFlag,
    User, CoachCohort,
)
from auth import require_role

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

_allowed = Depends(require_role("admin", "coach"))


def _coach_apprentice_ids(db: Session, user: User) -> list[int] | None:
    """Return apprentice IDs visible to a coach, or None for admin (= all)."""
    if user.role == "admin":
        return None  # no filter
    cohort_ids = [cc.cohort_id for cc in
                  db.query(CoachCohort).filter(CoachCohort.user_id == user.id).all()]
    if not cohort_ids:
        return []
    return [a.id for a in
            db.query(Apprentice.id).filter(Apprentice.cohort_id.in_(cohort_ids)).all()]


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db), current_user: User = _allowed):
    """High-level metrics for the dashboard."""
    app_ids = _coach_apprentice_ids(db, current_user)

    if app_ids is not None:
        total_apprentices = len(app_ids)
        if not app_ids:
            return {"total_apprentices": 0, "total_submissions": 0, "total_ksbs": 0,
                    "ksbs_evidenced": 0, "ksb_coverage_pct": 0, "open_interventions": 0,
                    "avg_feedback_rating": None}
        sub_q = db.query(EvidenceSubmission).filter(EvidenceSubmission.apprentice_id.in_(app_ids))
        total_submissions = sub_q.count()
        sub_ids = [s.id for s in sub_q.all()]
        ksbs_evidenced = db.query(func.count(func.distinct(SubmissionKSB.ksb_id))).filter(
            SubmissionKSB.submission_id.in_(sub_ids)).scalar() if sub_ids else 0
        open_interventions = db.query(func.count(InterventionFlag.id)).filter(
            InterventionFlag.apprentice_id.in_(app_ids),
            InterventionFlag.status.in_(["open", "in_progress"])
        ).scalar()
        avg_rating = db.query(func.avg(CoachFeedback.rating)).filter(
            CoachFeedback.submission_id.in_(sub_ids)).scalar() if sub_ids else None
    else:
        total_apprentices = db.query(func.count(Apprentice.id)).scalar()
        total_submissions = db.query(func.count(EvidenceSubmission.id)).scalar()
        ksbs_evidenced = db.query(func.count(func.distinct(SubmissionKSB.ksb_id))).scalar()
        open_interventions = db.query(func.count(InterventionFlag.id)).filter(
            InterventionFlag.status.in_(["open", "in_progress"])
        ).scalar()
        avg_rating = db.query(func.avg(CoachFeedback.rating)).scalar()

    total_ksbs = db.query(func.count(KSB.id)).scalar()

    return {
        "total_apprentices": total_apprentices,
        "total_submissions": total_submissions,
        "total_ksbs": total_ksbs,
        "ksbs_evidenced": ksbs_evidenced,
        "ksb_coverage_pct": round((ksbs_evidenced / total_ksbs * 100), 1) if total_ksbs else 0,
        "open_interventions": open_interventions,
        "avg_feedback_rating": round(avg_rating, 2) if avg_rating else None,
    }


@router.get("/submissions-by-status")
def submissions_by_status(db: Session = Depends(get_db), current_user: User = _allowed):
    """Count of evidence submissions grouped by status."""
    app_ids = _coach_apprentice_ids(db, current_user)
    query = db.query(EvidenceSubmission.status, func.count(EvidenceSubmission.id))
    if app_ids is not None:
        if not app_ids:
            return {}
        query = query.filter(EvidenceSubmission.apprentice_id.in_(app_ids))
    rows = query.group_by(EvidenceSubmission.status).all()
    return {status: count for status, count in rows}


@router.get("/submissions-by-module")
def submissions_by_module(db: Session = Depends(get_db), current_user: User = _allowed):
    """Count of submissions per module, broken down by status."""
    app_ids = _coach_apprentice_ids(db, current_user)
    query = (
        db.query(
            Module.code,
            Module.title,
            EvidenceSubmission.status,
            func.count(EvidenceSubmission.id).label("count"),
        )
        .join(Assessment, Assessment.module_id == Module.id)
        .join(EvidenceSubmission, EvidenceSubmission.assessment_id == Assessment.id)
    )
    if app_ids is not None:
        if not app_ids:
            return []
        query = query.filter(EvidenceSubmission.apprentice_id.in_(app_ids))
    rows = query.group_by(Module.code, Module.title, EvidenceSubmission.status).all()
    result = {}
    for code, title, status, count in rows:
        if code not in result:
            result[code] = {"code": code, "title": title, "statuses": {}}
        result[code]["statuses"][status] = count
    return list(result.values())


@router.get("/ksb-coverage")
def ksb_coverage(db: Session = Depends(get_db), current_user: User = _allowed):
    """For each KSB, how many unique apprentices have evidence mapped to it."""
    app_ids = _coach_apprentice_ids(db, current_user)
    all_ksbs = db.query(KSB).order_by(KSB.code).all()

    coverage_query = (
        db.query(
            SubmissionKSB.ksb_id,
            func.count(func.distinct(EvidenceSubmission.apprentice_id)).label("apprentice_count"),
        )
        .join(EvidenceSubmission, EvidenceSubmission.id == SubmissionKSB.submission_id)
    )
    if app_ids is not None:
        if not app_ids:
            total_apprentices = 0
            return [
                {"id": k.id, "code": k.code, "type": k.type, "description": k.description,
                 "apprentices_evidenced": 0, "total_apprentices": 0, "coverage_pct": 0}
                for k in all_ksbs
            ]
        coverage_query = coverage_query.filter(EvidenceSubmission.apprentice_id.in_(app_ids))
        total_apprentices = len(app_ids)
    else:
        total_apprentices = db.query(func.count(Apprentice.id)).scalar()

    coverage = coverage_query.group_by(SubmissionKSB.ksb_id).all()
    coverage_map = {ksb_id: cnt for ksb_id, cnt in coverage}

    return [
        {
            "id": k.id,
            "code": k.code,
            "type": k.type,
            "description": k.description,
            "apprentices_evidenced": coverage_map.get(k.id, 0),
            "total_apprentices": total_apprentices,
            "coverage_pct": round(coverage_map.get(k.id, 0) / total_apprentices * 100, 1) if total_apprentices else 0,
        }
        for k in all_ksbs
    ]


@router.get("/ksb-coverage-by-type")
def ksb_coverage_by_type(db: Session = Depends(get_db), current_user: User = _allowed):
    """Summarised KSB coverage grouped by type (Knowledge/Skill/Behaviour)."""
    app_ids = _coach_apprentice_ids(db, current_user)
    all_ksbs = db.query(KSB).all()

    if app_ids is not None and not app_ids:
        evidenced_ids: set[int] = set()
    elif app_ids is not None:
        evidenced_ids = {
            row[0] for row in
            db.query(func.distinct(SubmissionKSB.ksb_id))
            .join(EvidenceSubmission, EvidenceSubmission.id == SubmissionKSB.submission_id)
            .filter(EvidenceSubmission.apprentice_id.in_(app_ids))
            .all()
        }
    else:
        evidenced_ids = {
            row[0] for row in db.query(func.distinct(SubmissionKSB.ksb_id)).all()
        }

    summary: dict = {}
    for k in all_ksbs:
        if k.type not in summary:
            summary[k.type] = {"total": 0, "evidenced": 0}
        summary[k.type]["total"] += 1
        if k.id in evidenced_ids:
            summary[k.type]["evidenced"] += 1

    return [
        {"type": t, "total": v["total"], "evidenced": v["evidenced"]}
        for t, v in summary.items()
    ]


@router.get("/apprentice-progress")
def apprentice_progress(db: Session = Depends(get_db), current_user: User = _allowed):
    """Per-apprentice submission counts and KSB coverage."""
    app_ids = _coach_apprentice_ids(db, current_user)
    if app_ids is not None:
        if not app_ids:
            return []
        apprentices = db.query(Apprentice).filter(Apprentice.id.in_(app_ids)).all()
    else:
        apprentices = db.query(Apprentice).all()

    result = []
    total_ksbs = db.query(func.count(KSB.id)).scalar()
    for a in apprentices:
        submissions = (
            db.query(EvidenceSubmission)
            .filter(EvidenceSubmission.apprentice_id == a.id)
            .all()
        )
        submission_ids = [s.id for s in submissions]
        ksb_count = 0
        if submission_ids:
            ksb_count = (
                db.query(func.count(func.distinct(SubmissionKSB.ksb_id)))
                .filter(SubmissionKSB.submission_id.in_(submission_ids))
                .scalar()
            )
        status_counts: dict = {}
        for s in submissions:
            status_counts[s.status] = status_counts.get(s.status, 0) + 1

        open_flags = (
            db.query(func.count(InterventionFlag.id))
            .filter(
                InterventionFlag.apprentice_id == a.id,
                InterventionFlag.status.in_(["open", "in_progress"]),
            )
            .scalar()
        )

        result.append({
            "id": a.id,
            "name": f"{a.first_name} {a.last_name}",
            "email": a.email,
            "employer": a.employer,
            "cohort_id": a.cohort_id,
            "total_submissions": len(submissions),
            "submission_statuses": status_counts,
            "ksbs_covered": ksb_count,
            "total_ksbs": total_ksbs,
            "ksb_coverage_pct": round(ksb_count / total_ksbs * 100, 1) if total_ksbs else 0,
            "open_interventions": open_flags,
        })
    return result


@router.get("/feedback")
def feedback_list(db: Session = Depends(get_db), current_user: User = _allowed):
    """All coach feedback with submission and apprentice details."""
    app_ids = _coach_apprentice_ids(db, current_user)
    query = (
        db.query(CoachFeedback, EvidenceSubmission, Apprentice)
        .join(EvidenceSubmission, EvidenceSubmission.id == CoachFeedback.submission_id)
        .join(Apprentice, Apprentice.id == EvidenceSubmission.apprentice_id)
    )
    if app_ids is not None:
        if not app_ids:
            return []
        query = query.filter(EvidenceSubmission.apprentice_id.in_(app_ids))
    rows = query.all()
    return [
        {
            "id": fb.id,
            "coach_name": fb.coach_name,
            "rating": fb.rating,
            "comments": fb.comments,
            "submission_title": sub.title,
            "apprentice_name": f"{ap.first_name} {ap.last_name}",
        }
        for fb, sub, ap in rows
    ]


# ── NEW: Submission Trends ──────────────────────────────

@router.get("/submission-trends")
def submission_trends(db: Session = Depends(get_db), current_user: User = _allowed):
    """Monthly submission counts over time, broken down by status."""
    app_ids = _coach_apprentice_ids(db, current_user)

    # cross-DB month extraction: SQLite uses strftime, PostgresSQL uses to_char
    if DATABASE_URL.startswith("sqlite"):
        month_col = func.strftime('%Y-%m', EvidenceSubmission.submitted_at).label('month')
    else:
        month_col = func.to_char(EvidenceSubmission.submitted_at, 'YYYY-MM').label('month')

    query = db.query(
        month_col,
        EvidenceSubmission.status,
        func.count(EvidenceSubmission.id).label('count'),
    )
    if app_ids is not None:
        if not app_ids:
            return []
        query = query.filter(EvidenceSubmission.apprentice_id.in_(app_ids))

    rows = query.group_by('month', EvidenceSubmission.status).order_by('month').all()

    trends: dict = {}
    for month, status, count in rows:
        if not month:
            continue
        if month not in trends:
            trends[month] = {"month": month, "draft": 0, "submitted": 0,
                             "reviewed": 0, "accepted": 0, "total": 0}
        trends[month][status] = count
        trends[month]["total"] += count
    return list(trends.values())


# ── NEW: Cohort Comparison ──────────────────────────────

@router.get("/cohort-comparison")
def cohort_comparison(db: Session = Depends(get_db), current_user: User = _allowed):
    """Compare cohorts by submissions, accepted count, KSB coverage, interventions."""
    query = db.query(Cohort)
    if current_user.role == "coach":
        cohort_ids = [cc.cohort_id for cc in
                      db.query(CoachCohort).filter(CoachCohort.user_id == current_user.id).all()]
        query = query.filter(Cohort.id.in_(cohort_ids))
    cohorts = query.all()

    total_ksbs = db.query(func.count(KSB.id)).scalar() or 1
    result = []
    for cohort in cohorts:
        app_ids = [a.id for a in db.query(Apprentice.id).filter(
            Apprentice.cohort_id == cohort.id).all()]
        num_apprentices = len(app_ids)

        if app_ids:
            subs = db.query(func.count(EvidenceSubmission.id)).filter(
                EvidenceSubmission.apprentice_id.in_(app_ids)).scalar()
            accepted = db.query(func.count(EvidenceSubmission.id)).filter(
                EvidenceSubmission.apprentice_id.in_(app_ids),
                EvidenceSubmission.status == "accepted").scalar()
            covered = db.query(func.count(distinct(SubmissionKSB.ksb_id))).join(
                EvidenceSubmission, SubmissionKSB.submission_id == EvidenceSubmission.id
            ).filter(EvidenceSubmission.apprentice_id.in_(app_ids)).scalar()
            interventions = db.query(func.count(InterventionFlag.id)).filter(
                InterventionFlag.apprentice_id.in_(app_ids)).scalar()
            avg_rating = db.query(func.avg(CoachFeedback.rating)).join(
                EvidenceSubmission, CoachFeedback.submission_id == EvidenceSubmission.id
            ).filter(EvidenceSubmission.apprentice_id.in_(app_ids)).scalar()
        else:
            subs = accepted = covered = interventions = 0
            avg_rating = None

        result.append({
            "cohort": cohort.name,
            "apprentices": num_apprentices,
            "submissions": subs,
            "accepted": accepted,
            "ksb_coverage_pct": round((covered / total_ksbs) * 100, 1) if total_ksbs else 0,
            "interventions": interventions,
            "avg_submissions": round(subs / num_apprentices, 1) if num_apprentices else 0,
            "avg_rating": round(float(avg_rating), 1) if avg_rating else None,
        })
    return result


# ── NEW: KSB Evidence Heatmap ───────────────────────────

@router.get("/ksb-heatmap")
def ksb_heatmap(db: Session = Depends(get_db), current_user: User = _allowed):
    """KSB evidence density by module – returns a grid for heatmap display."""
    app_ids = _coach_apprentice_ids(db, current_user)
    modules = db.query(Module).order_by(Module.code).all()
    ksbs = db.query(KSB).order_by(KSB.code).all()

    grid = []
    for module in modules:
        assessment_ids = [a.id for a in
                          db.query(Assessment.id).filter(Assessment.module_id == module.id).all()]
        for ksb in ksbs:
            if not assessment_ids:
                count = 0
            else:
                q = (
                    db.query(func.count(distinct(EvidenceSubmission.id)))
                    .join(SubmissionKSB, SubmissionKSB.submission_id == EvidenceSubmission.id)
                    .filter(
                        SubmissionKSB.ksb_id == ksb.id,
                        EvidenceSubmission.assessment_id.in_(assessment_ids),
                    )
                )
                if app_ids is not None:
                    if not app_ids:
                        count = 0
                    else:
                        count = q.filter(
                            EvidenceSubmission.apprentice_id.in_(app_ids)).scalar() or 0
                else:
                    count = q.scalar() or 0
            grid.append({
                "module": module.code,
                "ksb": ksb.code,
                "ksb_type": ksb.type,
                "value": count,
            })

    return {
        "grid": grid,
        "modules": [{"code": m.code, "title": m.title} for m in modules],
        "ksbs": [{"code": k.code, "type": k.type, "description": k.description} for k in ksbs],
    }


# ── NEW: Apprentice Scatter ─────────────────────────────

@router.get("/apprentice-scatter")
def apprentice_scatter(db: Session = Depends(get_db), current_user: User = _allowed):
    """Per-apprentice submissions vs KSB coverage for scatter plot."""
    app_ids = _coach_apprentice_ids(db, current_user)
    if app_ids is not None:
        if not app_ids:
            return []
        apprentices = db.query(Apprentice).filter(Apprentice.id.in_(app_ids)).all()
    else:
        apprentices = db.query(Apprentice).all()

    total_ksbs = db.query(func.count(KSB.id)).scalar() or 1
    result = []
    for a in apprentices:
        sub_count = db.query(func.count(EvidenceSubmission.id)).filter(
            EvidenceSubmission.apprentice_id == a.id).scalar()
        accepted_count = db.query(func.count(EvidenceSubmission.id)).filter(
            EvidenceSubmission.apprentice_id == a.id,
            EvidenceSubmission.status == "accepted").scalar()
        covered = db.query(func.count(distinct(SubmissionKSB.ksb_id))).join(
            EvidenceSubmission, SubmissionKSB.submission_id == EvidenceSubmission.id
        ).filter(EvidenceSubmission.apprentice_id == a.id).scalar()
        avg_rating = db.query(func.avg(CoachFeedback.rating)).join(
            EvidenceSubmission, CoachFeedback.submission_id == EvidenceSubmission.id
        ).filter(EvidenceSubmission.apprentice_id == a.id).scalar()

        cohort_name = a.cohort.name if a.cohort else "Unknown"
        result.append({
            "name": f"{a.first_name} {a.last_name}",
            "submissions": sub_count,
            "accepted": accepted_count,
            "ksb_coverage_pct": round((covered / total_ksbs) * 100, 1),
            "avg_rating": round(float(avg_rating), 1) if avg_rating else None,
            "cohort": cohort_name,
        })
    return result


# ── NEW: Intervention Analysis ──────────────────────────

@router.get("/intervention-analysis")
def intervention_analysis(db: Session = Depends(get_db), current_user: User = _allowed):
    """Intervention breakdown by severity/status + monthly trend."""
    app_ids = _coach_apprentice_ids(db, current_user)

    query = db.query(InterventionFlag)
    if app_ids is not None:
        if not app_ids:
            return {"by_severity": [], "monthly": []}
        query = query.filter(InterventionFlag.apprentice_id.in_(app_ids))

    interventions = query.all()

    # Severity × status matrix
    severity_status: dict = {}
    for i in interventions:
        sev = i.severity or "medium"
        if sev not in severity_status:
            severity_status[sev] = {"severity": sev, "open": 0, "in_progress": 0,
                                     "resolved": 0, "total": 0}
        st = i.status or "open"
        severity_status[sev][st] = severity_status[sev].get(st, 0) + 1
        severity_status[sev]["total"] += 1

    # Monthly trend
    monthly: dict = {}
    for i in interventions:
        month = i.created_at.strftime('%Y-%m') if i.created_at else "Unknown"
        if month not in monthly:
            monthly[month] = {"month": month, "low": 0, "medium": 0, "high": 0, "total": 0}
        sev = i.severity or "medium"
        monthly[month][sev] = monthly[month].get(sev, 0) + 1
        monthly[month]["total"] += 1

    return {
        "by_severity": list(severity_status.values()),
        "monthly": sorted(monthly.values(), key=lambda x: x["month"]),
    }
