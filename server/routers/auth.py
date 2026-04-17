"""Authentication routes – login, change-password, me."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from db.database import get_db
from models.models import User
from schemas.schemas import LoginRequest, LoginResponse, ChangePasswordRequest, UserResponse
from auth import verify_password, hash_password, create_access_token, get_current_user
from audit import log_action

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    log_action(db, user_id=user.id, action="login",
               detail=f"Logged in as {user.role}",
               ip_address=request.client.host if request.client else None)
    db.commit()
    return LoginResponse(
        access_token=token,
        role=user.role,
        must_change_password=user.must_change_password,
    )


@router.post("/token")
def token(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2-compatible token endpoint for Swagger UI.\n\nUse the email as 'username'. Leave client_id/client_secret blank."""
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"detail": "Password changed successfully"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
