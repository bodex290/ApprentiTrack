"""Admin-managed routes for user management (coaches + apprentices)."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from db.database import get_db
from models.models import User, Apprentice, CoachCohort
from schemas.schemas import (
    CoachCreate, CoachUpdate, ApprenticeUserCreate, ApprenticeUserUpdate,
    UserResponse, CoachCohortAssign,
)
from auth import hash_password, require_role, get_current_user
from audit import log_action

router = APIRouter(prefix="/api/users", tags=["users"])

_admin_only = Depends(require_role("admin"))


# ── List / Get ──────────────────────────────────────────

@router.get("/", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), _current_user: User = _admin_only):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), _current_user: User = _admin_only):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── Create Coach ────────────────────────────────────────

@router.post("/coaches", response_model=UserResponse, status_code=201)
def create_coach(
    payload: CoachCreate, request: Request,
    db: Session = Depends(get_db), current_user: User = _admin_only,
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="coach",
        first_name=payload.first_name,
        last_name=payload.last_name,
        is_active=True,
        must_change_password=True,
    )
    db.add(user)
    db.flush()
    log_action(db, user_id=current_user.id, action="create_user",
               target_type="user", target_id=user.id,
               detail=f"Created coach {payload.email}",
               ip_address=request.client.host if request.client else None)
    db.commit()
    db.refresh(user)
    return user


# ── Create Apprentice ──────────────────────────────────

@router.post("/apprentices", response_model=UserResponse, status_code=201)
def create_apprentice_user(
    payload: ApprenticeUserCreate, request: Request,
    db: Session = Depends(get_db), current_user: User = _admin_only,
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create linked Apprentice record
    apprentice = Apprentice(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        cohort_id=payload.cohort_id,
        employer=payload.employer,
    )
    db.add(apprentice)
    db.flush()

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="apprentice",
        first_name=payload.first_name,
        last_name=payload.last_name,
        is_active=True,
        must_change_password=True,
        apprentice_id=apprentice.id,
    )
    db.add(user)
    db.flush()
    log_action(db, user_id=current_user.id, action="create_user",
               target_type="user", target_id=user.id,
               detail=f"Created apprentice {payload.email}",
               ip_address=request.client.host if request.client else None)
    db.commit()
    db.refresh(user)
    return user


# ── Update Coach ────────────────────────────────────────

@router.put("/coaches/{user_id}", response_model=UserResponse)
def update_coach(
    user_id: int, payload: CoachUpdate, request: Request,
    db: Session = Depends(get_db), current_user: User = _admin_only,
):
    user = db.query(User).filter(User.id == user_id, User.role == "coach").first()
    if not user:
        raise HTTPException(status_code=404, detail="Coach not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    log_action(db, user_id=current_user.id, action="update_user",
               target_type="user", target_id=user_id,
               detail=f"Updated coach {user.email}",
               ip_address=request.client.host if request.client else None)
    db.commit()
    db.refresh(user)
    return user


# ── Update Apprentice ──────────────────────────────────

@router.put("/apprentices/{user_id}", response_model=UserResponse)
def update_apprentice_user(
    user_id: int, payload: ApprenticeUserUpdate, request: Request,
    db: Session = Depends(get_db), current_user: User = _admin_only,
):
    user = db.query(User).filter(User.id == user_id, User.role == "apprentice").first()
    if not user:
        raise HTTPException(status_code=404, detail="Apprentice not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "employer":
            # Sync employer to linked Apprentice record
            if user.apprentice_id:
                apprentice = db.query(Apprentice).filter(Apprentice.id == user.apprentice_id).first()
                if apprentice:
                    apprentice.employer = value
        else:
            setattr(user, field, value)
            # Sync name/email to Apprentice record
            if field in ("first_name", "last_name", "email") and user.apprentice_id:
                apprentice = db.query(Apprentice).filter(Apprentice.id == user.apprentice_id).first()
                if apprentice:
                    setattr(apprentice, field, value)
    log_action(db, user_id=current_user.id, action="update_user",
               target_type="user", target_id=user_id,
               detail=f"Updated apprentice {user.email}",
               ip_address=request.client.host if request.client else None)
    db.commit()
    db.refresh(user)
    return user


# ── Delete ──────────────────────────────────────────────

@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int, request: Request,
    db: Session = Depends(get_db), current_user: User = _admin_only,
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    email = user.email
    db.delete(user)
    log_action(db, user_id=current_user.id, action="delete_user",
               target_type="user", target_id=user_id,
               detail=f"Deleted user {email}",
               ip_address=request.client.host if request.client else None)
    db.commit()


# ── Coach → Cohort assignment ───────────────────────────

@router.post("/{user_id}/assign-cohorts")
def assign_coach_cohorts(
    user_id: int,
    payload: CoachCohortAssign,
    db: Session = Depends(get_db),
    _current_user: User = _admin_only,
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "coach":
        raise HTTPException(status_code=400, detail="Cohort assignment is only for coaches")

    db.query(CoachCohort).filter(CoachCohort.user_id == user_id).delete()
    for cid in payload.cohort_ids:
        db.add(CoachCohort(user_id=user_id, cohort_id=cid))
    db.commit()
    return {"detail": f"Assigned {len(payload.cohort_ids)} cohort(s) to coach"}


@router.get("/{user_id}/cohorts")
def get_coach_cohorts(
    user_id: int,
    db: Session = Depends(get_db),
    _current_user: User = _admin_only,
):
    assignments = db.query(CoachCohort).filter(CoachCohort.user_id == user_id).all()
    return [{"cohort_id": a.cohort_id} for a in assignments]
