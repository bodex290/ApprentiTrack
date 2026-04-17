"""Pydantic request/response schemas for ApprentiTrack."""

from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


# ── Cohort ──────────────────────────────────────────────
class CohortBase(BaseModel):
    name: str
    programme: str
    start_date: date
    end_date: Optional[date] = None

class CohortCreate(CohortBase):
    pass

class CohortUpdate(BaseModel):
    name: Optional[str] = None
    programme: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class CohortResponse(CohortBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Apprentice ──────────────────────────────────────────
class ApprenticeBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    cohort_id: int
    employer: Optional[str] = None

class ApprenticeCreate(ApprenticeBase):
    pass

class ApprenticeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    cohort_id: Optional[int] = None
    employer: Optional[str] = None

class ApprenticeResponse(ApprenticeBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Module ──────────────────────────────────────────────
class ModuleBase(BaseModel):
    code: str
    title: str
    credits: Optional[int] = None

class ModuleCreate(ModuleBase):
    pass

class ModuleUpdate(BaseModel):
    code: Optional[str] = None
    title: Optional[str] = None
    credits: Optional[int] = None

class ModuleResponse(ModuleBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Assessment ──────────────────────────────────────────
class AssessmentBase(BaseModel):
    module_id: int
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None

class AssessmentCreate(AssessmentBase):
    pass

class AssessmentUpdate(BaseModel):
    module_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None

class AssessmentResponse(AssessmentBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── KSB ─────────────────────────────────────────────────
class KSBBase(BaseModel):
    code: str
    type: str  # Knowledge | Skill | Behaviour
    description: str

class KSBCreate(KSBBase):
    pass

class KSBUpdate(BaseModel):
    code: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None

class KSBResponse(KSBBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Evidence Submission ─────────────────────────────────
class EvidenceSubmissionBase(BaseModel):
    apprentice_id: int
    assessment_id: Optional[int] = None
    module_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    file_url: Optional[str] = None
    work_project: Optional[str] = None
    status: Optional[str] = "submitted"

class EvidenceSubmissionCreate(EvidenceSubmissionBase):
    pass

class EvidenceSubmissionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    file_url: Optional[str] = None
    work_project: Optional[str] = None
    module_id: Optional[int] = None
    assessment_id: Optional[int] = None
    status: Optional[str] = None

class EvidenceSubmissionResponse(EvidenceSubmissionBase):
    id: int
    submitted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Submission–KSB link ─────────────────────────────────
class SubmissionKSBBase(BaseModel):
    submission_id: int
    ksb_id: int
    notes: Optional[str] = None

class SubmissionKSBCreate(SubmissionKSBBase):
    pass

class SubmissionKSBResponse(SubmissionKSBBase):
    id: int
    class Config:
        from_attributes = True


# ── Coach Feedback ──────────────────────────────────────
class CoachFeedbackBase(BaseModel):
    submission_id: int
    coach_name: str
    rating: Optional[int] = None
    comments: Optional[str] = None

class CoachFeedbackCreate(CoachFeedbackBase):
    pass

class CoachFeedbackResponse(CoachFeedbackBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Intervention Flag ───────────────────────────────────
class InterventionFlagBase(BaseModel):
    apprentice_id: int
    reason: str
    severity: Optional[str] = "medium"
    detail: Optional[str] = None
    status: Optional[str] = "open"
    raised_by: Optional[str] = None

class InterventionFlagCreate(InterventionFlagBase):
    pass

class InterventionFlagUpdate(BaseModel):
    status: Optional[str] = None
    detail: Optional[str] = None
    severity: Optional[str] = None
    assigned_to: Optional[str] = None
    action_notes: Optional[str] = None
    resolution_notes: Optional[str] = None

class InterventionFlagResponse(InterventionFlagBase):
    id: int
    assigned_to: Optional[str] = None
    action_notes: Optional[str] = None
    resolution_notes: Optional[str] = None
    started_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Auth / Users ────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    must_change_password: bool

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# ── Shared user response ────────────────────────────────
class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    must_change_password: bool
    apprentice_id: Optional[int] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ── Coach management (create / update) ──────────────────
class CoachCreate(BaseModel):
    email: str
    first_name: str
    last_name: str
    password: str

class CoachUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None

class CoachCohortAssign(BaseModel):
    cohort_ids: list[int]

# ── Apprentice management (create / update) ─────────────
class ApprenticeUserCreate(BaseModel):
    email: str
    first_name: str
    last_name: str
    password: str
    cohort_id: int
    employer: Optional[str] = None

class ApprenticeUserUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    employer: Optional[str] = None
    is_active: Optional[bool] = None


# ── Audit Log ───────────────────────────────────────────
class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    detail: Optional[str] = None
    ip_address: Optional[str] = None
    class Config:
        from_attributes = True


# ── Analytics Analysis (AI-generated) ──────────────────
class InsightItem(BaseModel):
    label: str
    value: str
    detail: Optional[str] = None
    color: Optional[str] = None

class BreakdownRow(BaseModel):
    label: str
    values: dict[str, str | int | float]

class AnalysisResponse(BaseModel):
    insights: list[InsightItem]
    summary: str
    recommendations: list[str]
    breakdown: Optional[list[BreakdownRow]] = None


# ── Chat / AI ──────────────────────────────────────────
class ChatMessageCreate(BaseModel):
    message: str
    conversation_id: Optional[int] = None

class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    class Config:
        from_attributes = True

class ChatConversationListItem(BaseModel):
    id: int
    title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    message_count: Optional[int] = 0
    class Config:
        from_attributes = True

class ChatConversationResponse(BaseModel):
    id: int
    title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    messages: list[ChatMessageResponse] = []
    class Config:
        from_attributes = True
