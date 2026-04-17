"""CRUD API routes for evidence submissions."""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.database import get_db
from models.models import EvidenceSubmission, User, CoachCohort, Apprentice
from schemas.schemas import EvidenceSubmissionUpdate, EvidenceSubmissionResponse
from auth import require_role
from audit import log_action

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

_allowed = Depends(require_role("admin", "coach"))
_coach_only = Depends(require_role("coach"))


def _visible_apprentice_ids(db: Session, user: User) -> list[int] | None:
    if user.role == "admin":
        return None
    cohort_ids = [cc.cohort_id for cc in
                  db.query(CoachCohort).filter(CoachCohort.user_id == user.id).all()]
    if not cohort_ids:
        return []
    return [a.id for a in
            db.query(Apprentice.id).filter(Apprentice.cohort_id.in_(cohort_ids)).all()]


@router.get("/")
def list_submissions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = _allowed,
):
    app_ids = _visible_apprentice_ids(db, current_user)
    query = db.query(EvidenceSubmission)
    if app_ids is not None:
        if not app_ids:
            return JSONResponse(content={"items": [], "total": 0, "limit": limit, "offset": offset})
        query = query.filter(EvidenceSubmission.apprentice_id.in_(app_ids))
    total = query.count()
    items = query.order_by(EvidenceSubmission.created_at.desc()).offset(offset).limit(limit).all()
    return JSONResponse(content={
        "items": [EvidenceSubmissionResponse.model_validate(i).model_dump(mode="json") for i in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    })


@router.get("/{submission_id}", response_model=EvidenceSubmissionResponse)
def get_submission(submission_id: int, db: Session = Depends(get_db), _u: User = _allowed):
    record = db.query(EvidenceSubmission).filter(EvidenceSubmission.id == submission_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Submission not found")
    return record


@router.put("/{submission_id}", response_model=EvidenceSubmissionResponse)
def update_submission(
    submission_id: int, payload: EvidenceSubmissionUpdate, request: Request,
    db: Session = Depends(get_db), current_user: User = _coach_only,
):
    record = db.query(EvidenceSubmission).filter(EvidenceSubmission.id == submission_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Submission not found")
    old_status = record.status
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    # Audit status changes
    if record.status != old_status:
        log_action(db, user_id=current_user.id, action="update_submission_status",
                   target_type="submission", target_id=submission_id,
                   detail=f"Status: {old_status} \u2192 {record.status}",
                   ip_address=request.client.host if request.client else None)
    db.commit()
    db.refresh(record)
    return record



