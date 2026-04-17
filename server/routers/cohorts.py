"""CRUD API routes for cohorts."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.models import Cohort, CoachCohort, User
from schemas.schemas import CohortCreate, CohortUpdate, CohortResponse
from auth import require_role

router = APIRouter(prefix="/api/cohorts", tags=["cohorts"])

_read = Depends(require_role("admin", "coach"))
_write = Depends(require_role("admin"))


@router.get("/", response_model=list[CohortResponse])
def list_cohorts(db: Session = Depends(get_db), _u: User = _read):
    if _u.role == "coach":
        assigned_ids = [
            cc.cohort_id
            for cc in db.query(CoachCohort).filter(CoachCohort.user_id == _u.id).all()
        ]
        return db.query(Cohort).filter(Cohort.id.in_(assigned_ids)).all()
    return db.query(Cohort).all()


@router.get("/{cohort_id}", response_model=CohortResponse)
def get_cohort(cohort_id: int, db: Session = Depends(get_db), _u: User = _read):
    record = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Cohort not found")
    if _u.role == "coach":
        assigned = db.query(CoachCohort).filter(
            CoachCohort.user_id == _u.id, CoachCohort.cohort_id == cohort_id
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="Not assigned to this cohort")
    return record


@router.post("/", response_model=CohortResponse, status_code=201)
def create_cohort(payload: CohortCreate, db: Session = Depends(get_db), _u: User = _write):
    record = Cohort(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{cohort_id}", response_model=CohortResponse)
def update_cohort(cohort_id: int, payload: CohortUpdate, db: Session = Depends(get_db), _u: User = _write):
    record = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Cohort not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{cohort_id}", status_code=204)
def delete_cohort(cohort_id: int, db: Session = Depends(get_db), _u: User = _write):
    record = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Cohort not found")
    db.delete(record)
    db.commit()
    return None
