"""CRUD API routes for coach feedback on evidence submissions."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from db.database import get_db
from models.models import CoachFeedback, EvidenceSubmission, User, CoachCohort, Apprentice
from schemas.schemas import CoachFeedbackCreate, CoachFeedbackResponse
from auth import require_role
from audit import log_action

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

_allowed = Depends(require_role("admin", "coach"))
_coach_only = Depends(require_role("coach"))


def _visible_apprentice_ids(db: Session, user: User) -> list[int] | None:
    """Return apprentice IDs visible to the current user, or None for admin (all)."""
    if user.role == "admin":
        return None
    cohort_ids = [cc.cohort_id for cc in
                  db.query(CoachCohort).filter(CoachCohort.user_id == user.id).all()]
    if not cohort_ids:
        return []
    return [a.id for a in
            db.query(Apprentice.id).filter(Apprentice.cohort_id.in_(cohort_ids)).all()]


def _can_access_submission(db: Session, user: User, submission_id: int) -> EvidenceSubmission:
    """Verify the submission exists and the current user can access it."""
    submission = db.query(EvidenceSubmission).filter(
        EvidenceSubmission.id == submission_id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    app_ids = _visible_apprentice_ids(db, user)
    if app_ids is not None and submission.apprentice_id not in app_ids:
        raise HTTPException(status_code=403, detail="Not authorised for this submission")
    return submission


# ── List feedback ───────────────────────────────────────
@router.get("/", response_model=list[CoachFeedbackResponse])
def list_feedback(
    submission_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = _allowed,
):
    """List all feedback, optionally filtered by submission_id.
    Coaches only see feedback for submissions belonging to their cohort apprentices.
    """
    app_ids = _visible_apprentice_ids(db, current_user)

    query = (
        db.query(CoachFeedback)
        .join(EvidenceSubmission, EvidenceSubmission.id == CoachFeedback.submission_id)
    )

    if app_ids is not None:
        if not app_ids:
            return []
        query = query.filter(EvidenceSubmission.apprentice_id.in_(app_ids))

    if submission_id is not None:
        query = query.filter(CoachFeedback.submission_id == submission_id)

    return query.order_by(CoachFeedback.created_at.desc()).all()


# ── Get single feedback ────────────────────────────────
@router.get("/{feedback_id}", response_model=CoachFeedbackResponse)
def get_feedback(feedback_id: int, db: Session = Depends(get_db), current_user: User = _allowed):
    record = db.query(CoachFeedback).filter(CoachFeedback.id == feedback_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Feedback not found")

    # Verify coach can see this submission's apprentice
    _can_access_submission(db, current_user, record.submission_id)
    return record


# ── Create feedback ─────────────────────────────────────
@router.post("/", response_model=CoachFeedbackResponse, status_code=201)
def create_feedback(
    payload: CoachFeedbackCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = _coach_only,
):
    # Verify submission exists and coach can access it
    _can_access_submission(db, current_user, payload.submission_id)

    # Auto-populate coach_name from current user if not explicitly given
    data = payload.model_dump()
    if not data.get("coach_name"):
        data["coach_name"] = f"{current_user.first_name} {current_user.last_name}"

    record = CoachFeedback(**data)
    db.add(record)
    db.flush()

    log_action(
        db,
        user_id=current_user.id,
        action="create_feedback",
        target_type="feedback",
        target_id=record.id,
        detail=f"Feedback on submission #{payload.submission_id} – rating {payload.rating}",
        ip_address=request.client.host if request.client else None,
    )

    db.commit()
    db.refresh(record)
    return record


# ── Update feedback ─────────────────────────────────────
@router.put("/{feedback_id}", response_model=CoachFeedbackResponse)
def update_feedback(
    feedback_id: int,
    payload: CoachFeedbackCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = _coach_only,
):
    record = db.query(CoachFeedback).filter(CoachFeedback.id == feedback_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Feedback not found")

    _can_access_submission(db, current_user, record.submission_id)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)

    log_action(
        db,
        user_id=current_user.id,
        action="update_feedback",
        target_type="feedback",
        target_id=feedback_id,
        detail=f"Updated feedback on submission #{record.submission_id}",
        ip_address=request.client.host if request.client else None,
    )

    db.commit()
    db.refresh(record)
    return record


# ── Delete feedback ─────────────────────────────────────
@router.delete("/{feedback_id}", status_code=204)
def delete_feedback(
    feedback_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = _coach_only,
):
    record = db.query(CoachFeedback).filter(CoachFeedback.id == feedback_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Feedback not found")

    _can_access_submission(db, current_user, record.submission_id)

    log_action(
        db,
        user_id=current_user.id,
        action="delete_feedback",
        target_type="feedback",
        target_id=feedback_id,
        detail=f"Deleted feedback on submission #{record.submission_id}",
        ip_address=request.client.host if request.client else None,
    )

    db.delete(record)
    db.commit()
    return None
