"""CRUD API routes for KSBs (Knowledge, Skills and Behaviours)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.models import KSB, User
from schemas.schemas import KSBCreate, KSBUpdate, KSBResponse
from auth import require_role

router = APIRouter(prefix="/api/ksbs", tags=["ksbs"])

_read = Depends(require_role("admin", "coach"))
_write = Depends(require_role("admin"))


@router.get("/", response_model=list[KSBResponse])
def list_ksbs(db: Session = Depends(get_db), _u: User = _read):
    return db.query(KSB).order_by(KSB.code).all()


@router.get("/{ksb_id}", response_model=KSBResponse)
def get_ksb(ksb_id: int, db: Session = Depends(get_db), _u: User = _read):
    record = db.query(KSB).filter(KSB.id == ksb_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="KSB not found")
    return record


@router.post("/", response_model=KSBResponse, status_code=201)
def create_ksb(payload: KSBCreate, db: Session = Depends(get_db), _u: User = _write):
    record = KSB(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{ksb_id}", response_model=KSBResponse)
def update_ksb(ksb_id: int, payload: KSBUpdate, db: Session = Depends(get_db), _u: User = _write):
    record = db.query(KSB).filter(KSB.id == ksb_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="KSB not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{ksb_id}", status_code=204)
def delete_ksb(ksb_id: int, db: Session = Depends(get_db), _u: User = _write):
    record = db.query(KSB).filter(KSB.id == ksb_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="KSB not found")
    db.delete(record)
    db.commit()
    return None
