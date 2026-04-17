"""CRUD API routes for intervention flags – comprehensive workflow support."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.models import InterventionFlag, User, CoachCohort, Apprentice
from schemas.schemas import InterventionFlagCreate, InterventionFlagResponse, InterventionFlagUpdate
from auth import require_role

router = APIRouter(prefix="/api/interventions", tags=["interventions"])

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


@router.get("/", response_model=list[InterventionFlagResponse])
def list_interventions(status: str | None = None, db: Session = Depends(get_db), current_user: User = _allowed):
    app_ids = _visible_apprentice_ids(db, current_user)
    query = db.query(InterventionFlag)
    if app_ids is not None:
        if not app_ids:
            return []
        query = query.filter(InterventionFlag.apprentice_id.in_(app_ids))
    if status:
        query = query.filter(InterventionFlag.status == status)
    return query.order_by(InterventionFlag.created_at.desc()).all()


@router.get("/{flag_id}", response_model=InterventionFlagResponse)
def get_intervention(flag_id: int, db: Session = Depends(get_db), _u: User = _allowed):
    record = db.query(InterventionFlag).filter(InterventionFlag.id == flag_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Intervention flag not found")
    return record


@router.post("/", response_model=InterventionFlagResponse, status_code=201)
def create_intervention(payload: InterventionFlagCreate, db: Session = Depends(get_db), _u: User = _coach_only):
    record = InterventionFlag(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/{flag_id}", response_model=InterventionFlagResponse)
def update_intervention(flag_id: int, payload: InterventionFlagUpdate, db: Session = Depends(get_db), _u: User = _coach_only):
    record = db.query(InterventionFlag).filter(InterventionFlag.id == flag_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Intervention flag not found")
    update_data = payload.model_dump(exclude_unset=True)

    # Auto-set timestamps based on status transitions
    new_status = update_data.get("status")
    if new_status == "in_progress" and record.status == "open":
        update_data["started_at"] = datetime.utcnow()
    if new_status == "resolved" and record.status != "resolved":
        update_data["resolved_at"] = datetime.utcnow()
    # Allow re-opening: clear timestamps
    if new_status == "open":
        update_data["started_at"] = None
        update_data["resolved_at"] = None
        update_data["resolution_notes"] = None

    for key, value in update_data.items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{flag_id}", status_code=204)
def delete_intervention(flag_id: int, db: Session = Depends(get_db), _u: User = _coach_only):
    record = db.query(InterventionFlag).filter(InterventionFlag.id == flag_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Intervention flag not found")
    db.delete(record)
    db.commit()
    return None
