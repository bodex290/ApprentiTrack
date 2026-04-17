"""SQLAlchemy ORM models for ApprentiTrack."""

from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime, ForeignKey, Boolean,
    CheckConstraint, UniqueConstraint
)
from sqlalchemy.orm import relationship
from db.database import Base


# ── Auth ────────────────────────────────────────────────

class User(Base):
    """Application user – can be admin, coach, or apprentice."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # admin, coach, apprentice
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=True)
    apprentice_id = Column(Integer, ForeignKey("apprentices.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'coach', 'apprentice')", name="ck_user_role"),
    )

    apprentice = relationship("Apprentice", back_populates="user", uselist=False)
    coach_cohorts = relationship("CoachCohort", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    chat_conversations = relationship("ChatConversation", back_populates="user")


class CoachCohort(Base):
    """Junction table mapping coaches to their assigned cohorts."""
    __tablename__ = "coach_cohorts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cohort_id = Column(Integer, ForeignKey("cohorts.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "cohort_id", name="uq_coach_cohort"),
    )

    user = relationship("User", back_populates="coach_cohorts")
    cohort = relationship("Cohort", back_populates="coach_assignments")


class Cohort(Base):
    __tablename__ = "cohorts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    programme = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    apprentices = relationship("Apprentice", back_populates="cohort")
    coach_assignments = relationship("CoachCohort", back_populates="cohort")


class Apprentice(Base):
    __tablename__ = "apprentices"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    cohort_id = Column(Integer, ForeignKey("cohorts.id"), nullable=False)
    employer = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cohort = relationship("Cohort", back_populates="apprentices")
    submissions = relationship("EvidenceSubmission", back_populates="apprentice")
    intervention_flags = relationship("InterventionFlag", back_populates="apprentice")
    user = relationship("User", back_populates="apprentice", uselist=False)


class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    credits = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    assessments = relationship("Assessment", back_populates="module")
    ksb_links = relationship("ModuleKSB", back_populates="module")


class ModuleKSB(Base):
    """Official mapping of KSBs to modules (programme-level, not submission-derived)."""
    __tablename__ = "module_ksbs"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    ksb_id = Column(Integer, ForeignKey("ksbs.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("module_id", "ksb_id", name="uq_module_ksb"),
    )

    module = relationship("Module", back_populates="ksb_links")
    ksb = relationship("KSB", back_populates="module_links")


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    module = relationship("Module", back_populates="assessments")
    submissions = relationship("EvidenceSubmission", back_populates="assessment")


class KSB(Base):
    __tablename__ = "ksbs"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)
    type = Column(String, nullable=False)  # Knowledge, Skill, Behaviour
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("type IN ('Knowledge', 'Skill', 'Behaviour')", name="ck_ksb_type"),
    )

    submission_links = relationship("SubmissionKSB", back_populates="ksb")
    module_links = relationship("ModuleKSB", back_populates="ksb")


class EvidenceSubmission(Base):
    __tablename__ = "evidence_submissions"

    id = Column(Integer, primary_key=True, index=True)
    apprentice_id = Column(Integer, ForeignKey("apprentices.id"), nullable=False)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)  # main journal entry content
    file_url = Column(String, nullable=True)
    work_project = Column(String, nullable=True)  # name of work project if applicable
    submitted_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="submitted")  # draft, submitted, reviewed, accepted
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'submitted', 'reviewed', 'accepted')",
            name="ck_submission_status",
        ),
    )

    apprentice = relationship("Apprentice", back_populates="submissions")
    assessment = relationship("Assessment", back_populates="submissions")
    module = relationship("Module")
    ksb_links = relationship("SubmissionKSB", back_populates="submission")
    feedback = relationship("CoachFeedback", back_populates="submission")


class SubmissionKSB(Base):
    """Junction table mapping evidence submissions to KSB competencies."""
    __tablename__ = "submission_ksbs"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("evidence_submissions.id"), nullable=False)
    ksb_id = Column(Integer, ForeignKey("ksbs.id"), nullable=False)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("submission_id", "ksb_id", name="uq_submission_ksb"),
    )

    submission = relationship("EvidenceSubmission", back_populates="ksb_links")
    ksb = relationship("KSB", back_populates="submission_links")


class CoachFeedback(Base):
    __tablename__ = "coach_feedback"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("evidence_submissions.id"), nullable=False)
    coach_name = Column(String, nullable=False)
    rating = Column(Integer, nullable=True)  # 1–5
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_feedback_rating"),
    )

    submission = relationship("EvidenceSubmission", back_populates="feedback")


class InterventionFlag(Base):
    """Flags raised for apprentices requiring additional support or intervention."""
    __tablename__ = "intervention_flags"

    id = Column(Integer, primary_key=True, index=True)
    apprentice_id = Column(Integer, ForeignKey("apprentices.id"), nullable=False)
    reason = Column(String, nullable=False)  # e.g. "Low KSB coverage", "Overdue submissions"
    severity = Column(String, default="medium")  # low, medium, high
    detail = Column(Text, nullable=True)
    status = Column(String, default="open")  # open, in_progress, resolved
    raised_by = Column(String, nullable=True)  # coach name
    assigned_to = Column(String, nullable=True)
    action_notes = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("severity IN ('low', 'medium', 'high')", name="ck_intervention_severity"),
        CheckConstraint("status IN ('open', 'in_progress', 'resolved')", name="ck_intervention_status"),
    )

    apprentice = relationship("Apprentice", back_populates="intervention_flags")


# ── Audit Log ──────────────────────────────────────────

class AuditLog(Base):
    """Tracks key user actions for security and compliance auditing."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)  # e.g. "login", "create_user", "update_submission_status"
    target_type = Column(String, nullable=True)  # e.g. "user", "submission", "feedback"
    target_id = Column(Integer, nullable=True)
    detail = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)

    user = relationship("User", back_populates="audit_logs")


# ── Chat / AI ──────────────────────────────────────────

class ChatConversation(Base):
    """A chat conversation between a user and the AI assistant."""
    __tablename__ = "chat_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=True)               # auto-generated from 1st message
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="chat_conversations")
    messages = relationship("ChatMessage", back_populates="conversation",
                            order_by="ChatMessage.created_at",
                            cascade="all, delete-orphan")


class ChatMessage(Base):
    """A single message within a chat conversation."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("chat_conversations.id"), nullable=False)
    role = Column(String, nullable=False)   # system, user, assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("role IN ('system', 'user', 'assistant')", name="ck_chat_msg_role"),
    )

    conversation = relationship("ChatConversation", back_populates="messages")

