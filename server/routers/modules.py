"""CRUD API routes for modules – includes detail endpoint with assessments & KSB mappings."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.database import get_db
from models.models import Module, ModuleKSB, Assessment, EvidenceSubmission, SubmissionKSB, KSB, User
from schemas.schemas import ModuleCreate, ModuleUpdate, ModuleResponse
from auth import require_role

router = APIRouter(prefix="/api/modules", tags=["modules"])

_read = Depends(require_role("admin", "coach"))
_write = Depends(require_role("admin"))


@router.get("/", response_model=list[ModuleResponse])
def list_modules(db: Session = Depends(get_db), _u: User = _read):
    return db.query(Module).all()


@router.get("/{module_id}", response_model=ModuleResponse)
def get_module(module_id: int, db: Session = Depends(get_db), _u: User = _read):
    record = db.query(Module).filter(Module.id == module_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Module not found")
    return record


@router.get("/{module_id}/detail")
def get_module_detail(module_id: int, db: Session = Depends(get_db), _u: User = _read):
    """Return module with its assessments, official KSBs, and submissions."""
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    assessments = db.query(Assessment).filter(Assessment.module_id == module_id).all()
    assessment_ids = [a.id for a in assessments]

    # Submissions linked via assessment or module_id
    submissions = []
    submission_ksb_counts: dict[int, int] = {}  # ksb_id -> count of submissions that evidence it

    subs = (
        db.query(EvidenceSubmission)
        .filter(
            (EvidenceSubmission.assessment_id.in_(assessment_ids) if assessment_ids else False)
            | (EvidenceSubmission.module_id == module_id)
        )
        .all()
    )
    submissions = [
        {
            "id": s.id,
            "title": s.title or "Untitled",
            "status": s.status,
            "apprentice_id": s.apprentice_id,
            "assessment_id": s.assessment_id,
        }
        for s in subs
    ]

    sub_ids = [s.id for s in subs]
    if sub_ids:
        links = (
            db.query(SubmissionKSB)
            .filter(SubmissionKSB.submission_id.in_(sub_ids))
            .all()
        )
        for link in links:
            submission_ksb_counts[link.ksb_id] = submission_ksb_counts.get(link.ksb_id, 0) + 1

    # Official KSB mappings
    official_links = (
        db.query(ModuleKSB, KSB)
        .join(KSB, KSB.id == ModuleKSB.ksb_id)
        .filter(ModuleKSB.module_id == module_id)
        .order_by(KSB.code)
        .all()
    )
    mapped_ksbs = [
        {
            "id": ksb.id,
            "code": ksb.code,
            "type": ksb.type,
            "description": ksb.description,
            "submission_count": submission_ksb_counts.get(ksb.id, 0),
        }
        for _link, ksb in official_links
    ]

    return {
        "id": module.id,
        "code": module.code,
        "title": module.title,
        "credits": module.credits,
        "assessments": [
            {
                "id": a.id,
                "title": a.title,
                "description": a.description,
                "due_date": str(a.due_date) if a.due_date else None,
            }
            for a in assessments
        ],
        "submissions": submissions,
        "mapped_ksbs": mapped_ksbs,
    }


@router.post("/", response_model=ModuleResponse, status_code=201)
def create_module(payload: ModuleCreate, db: Session = Depends(get_db), _u: User = _write):
    record = Module(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{module_id}", response_model=ModuleResponse)
def update_module(module_id: int, payload: ModuleUpdate, db: Session = Depends(get_db), _u: User = _write):
    record = db.query(Module).filter(Module.id == module_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Module not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{module_id}", status_code=204)
def delete_module(module_id: int, db: Session = Depends(get_db), _u: User = _write):
    record = db.query(Module).filter(Module.id == module_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Module not found")
    db.delete(record)
    db.commit()
    return None
