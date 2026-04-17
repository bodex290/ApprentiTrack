"""Admin-only routes – audit log, system statistics."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.database import get_db
from models.models import (
    AuditLog, User, Apprentice, Cohort, Module, KSB,
    EvidenceSubmission, InterventionFlag,
)
from schemas.schemas import AuditLogResponse
from auth import require_role

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_role("admin"))],
)


@router.get("/audit-log", response_model=list[AuditLogResponse])
def get_audit_log(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    action: str | None = None,
    db: Session = Depends(get_db),
):
    """Paginated audit log, newest first."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    return (
        query.order_by(AuditLog.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/system-stats")
def system_stats(db: Session = Depends(get_db)):
    """High-level system counts for admin dashboard."""
    return {
        "total_users": db.query(func.count(User.id)).scalar(),
        "total_admins": db.query(func.count(User.id)).filter(User.role == "admin").scalar(),
        "total_coaches": db.query(func.count(User.id)).filter(User.role == "coach").scalar(),
        "total_apprentice_users": db.query(func.count(User.id)).filter(User.role == "apprentice").scalar(),
        "total_apprentices": db.query(func.count(Apprentice.id)).scalar(),
        "total_cohorts": db.query(func.count(Cohort.id)).scalar(),
        "total_modules": db.query(func.count(Module.id)).scalar(),
        "total_ksbs": db.query(func.count(KSB.id)).scalar(),
        "total_submissions": db.query(func.count(EvidenceSubmission.id)).scalar(),
        "open_interventions": db.query(func.count(InterventionFlag.id)).filter(
            InterventionFlag.status.in_(["open", "in_progress"])
        ).scalar(),
        "total_audit_entries": db.query(func.count(AuditLog.id)).scalar(),
    }
