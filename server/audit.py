"""Audit logging helper – records key user actions to the audit_logs table."""

from typing import Optional
from sqlalchemy.orm import Session
from models.models import AuditLog


def log_action(
    db: Session,
    *,
    user_id: Optional[int],
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    detail: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Create an audit log entry and flush (caller must commit the transaction)."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
        ip_address=ip_address,
    )
    db.add(entry)
    db.flush()
    return entry
