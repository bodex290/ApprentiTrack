"""CRUD API routes for apprentices."""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from db.database import get_db
from models.models import Apprentice, User, CoachCohort
from schemas.schemas import ApprenticeCreate, ApprenticeUpdate, ApprenticeResponse
from auth import require_role

router = APIRouter(prefix="/api/apprentices", tags=["apprentices"])

_read = Depends(require_role("admin", "coach"))
_write = Depends(require_role("admin"))


@router.get("/")
def list_apprentices(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = _read,
):
    # Admin sees all; coach sees only apprentices in their assigned cohorts
    query = db.query(Apprentice)
    if current_user.role != "admin":
        cohort_ids = [cc.cohort_id for cc in
                      db.query(CoachCohort).filter(CoachCohort.user_id == current_user.id).all()]
        if not cohort_ids:
            return JSONResponse(content={"items": [], "total": 0, "limit": limit, "offset": offset})
        query = query.filter(Apprentice.cohort_id.in_(cohort_ids))
    total = query.count()
    items = query.offset(offset).limit(limit).all()
    return JSONResponse(content={
        "items": [ApprenticeResponse.model_validate(i).model_dump(mode="json") for i in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    })


@router.get("/{apprentice_id}", response_model=ApprenticeResponse)
def get_apprentice(apprentice_id: int, db: Session = Depends(get_db), current_user: User = _read):
    record = db.query(Apprentice).filter(Apprentice.id == apprentice_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Apprentice not found")
    # Coach can only access apprentices in their cohorts
    if current_user.role == "coach":
        cohort_ids = [cc.cohort_id for cc in
                      db.query(CoachCohort).filter(CoachCohort.user_id == current_user.id).all()]
        if record.cohort_id not in cohort_ids:
            raise HTTPException(status_code=403, detail="Not in your assigned cohorts")
    return record


@router.post("/", response_model=ApprenticeResponse, status_code=201)
def create_apprentice(payload: ApprenticeCreate, db: Session = Depends(get_db), _u: User = _write):
    record = Apprentice(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{apprentice_id}", response_model=ApprenticeResponse)
def update_apprentice(apprentice_id: int, payload: ApprenticeUpdate, db: Session = Depends(get_db), _u: User = _write):
    record = db.query(Apprentice).filter(Apprentice.id == apprentice_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Apprentice not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{apprentice_id}", status_code=204)
def delete_apprentice(apprentice_id: int, db: Session = Depends(get_db), _u: User = _write):
    record = db.query(Apprentice).filter(Apprentice.id == apprentice_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Apprentice not found")
    db.delete(record)
    db.commit()
    return None
