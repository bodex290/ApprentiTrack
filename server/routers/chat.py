"""Chat API routes – AI assistant with persistent conversation history."""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.database import get_db
from models.models import (
    User, ChatConversation, ChatMessage,
    Apprentice, EvidenceSubmission, KSB, SubmissionKSB,
    InterventionFlag, CoachCohort, Cohort, CoachFeedback,
    Module, Assessment,
)
from auth import require_role
from services.llm import get_chat_completion
from schemas.schemas import (
    ChatMessageCreate, ChatMessageResponse,
    ChatConversationListItem, ChatConversationResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

_allowed = Depends(require_role("admin", "coach", "apprentice"))


# ── Role-specific system prompts ───────────────────────

def _build_system_prompt(user: User, context: str) -> str:
    """Build a system prompt tailored to the user's role."""
    base = (
        "You are an AI assistant for ApprentiTrack, an apprenticeship management platform "
        "that tracks Knowledge, Skills, and Behaviours (KSB) progress.\n"
        "IMPORTANT RULES:\n"
        "- Always cite specific numbers, names, and data from the context below.\n"
        "- Never say 'I don't have data' if the data IS provided in the context.\n"
        "- Use markdown: headings, tables, bullet points, bold for emphasis.\n"
        "- Be specific, actionable, and concise (under 400 words unless detail is requested).\n"
        "- When comparing items, use ranked lists or tables.\n"
        "- If the user asks about something not covered by the context data, say so clearly.\n\n"
    )

    role_prompts = {
        "coach": (
            "You are helping a COACH who oversees apprentices across their assigned cohorts.\n"
            "You have access to detailed per-apprentice data including submission counts, "
            "KSB coverage, intervention flags, and feedback ratings.\n"
            "Use this to answer questions about individual apprentices, compare performance, "
            "identify at-risk learners, and suggest coaching priorities.\n"
            "Always reference apprentice names and specific metrics when answering.\n"
        ),
        "admin": (
            "You are helping a SYSTEM ADMINISTRATOR with full platform visibility.\n"
            "You have access to per-cohort breakdowns, per-coach workload data, "
            "all apprentice details, interventions, and feedback.\n"
            "Use this to answer about system health, coach workload distribution, "
            "cohort comparisons, and programme-wide trends.\n"
            "Always reference specific coach names, cohort names, and numbers.\n"
        ),
        "apprentice": (
            "You are helping an APPRENTICE tracking their own progress.\n"
            "You have access to their full submission history, KSB coverage details, "
            "feedback received, and intervention flags.\n"
            "Use this to answer about their progress, suggest which KSBs to target next, "
            "explain feedback, and help plan their portfolio strategy.\n"
            "Be encouraging but honest about gaps. Reference specific submissions and KSB codes.\n"
        ),
    }

    prompt = base + role_prompts.get(user.role, role_prompts["coach"])

    if context:
        prompt += f"\n--- CURRENT DATA CONTEXT ---\n{context}\n---\n"
        prompt += "Use this data to ground your answers. If the user asks about something not in the data, say so.\n"

    return prompt


def _gather_context(user: User, db: Session) -> str:
    """Gather comprehensive analytics context based on user role."""
    lines: list[str] = []
    all_ksbs = db.query(KSB).all()
    total_ksbs = len(all_ksbs)
    ksb_map = {k.id: k for k in all_ksbs}  # id → KSB object

    # ── Helper: per-apprentice detail block ──────────────
    def _apprentice_detail(apprentice: Apprentice, cohort_name: str) -> list[str]:
        """Return context lines for one apprentice."""
        out: list[str] = []
        subs = db.query(EvidenceSubmission).filter(
            EvidenceSubmission.apprentice_id == apprentice.id
        ).all()
        status_counts: dict[str, int] = {}
        for s in subs:
            status_counts[s.status] = status_counts.get(s.status, 0) + 1

        sub_ids = [s.id for s in subs]
        covered_ids = set()
        if sub_ids:
            covered_ids = {row[0] for row in db.query(SubmissionKSB.ksb_id).filter(
                SubmissionKSB.submission_id.in_(sub_ids)).distinct().all()}

        missing_ksbs = [ksb_map[kid] for kid in ksb_map if kid not in covered_ids]
        missing_str = ", ".join(f"{k.code} ({k.type})" for k in missing_ksbs[:8])
        if len(missing_ksbs) > 8:
            missing_str += f" … +{len(missing_ksbs)-8} more"

        flags = db.query(InterventionFlag).filter(
            InterventionFlag.apprentice_id == apprentice.id
        ).all()
        open_flags = [f for f in flags if f.status in ("open", "in_progress")]

        fb_rows = db.query(CoachFeedback).join(EvidenceSubmission).filter(
            EvidenceSubmission.apprentice_id == apprentice.id
        ).all()
        avg_rating = round(sum(f.rating for f in fb_rows if f.rating) / max(len([f for f in fb_rows if f.rating]), 1), 1)

        out.append(
            f"  • {apprentice.first_name} {apprentice.last_name} "
            f"(Cohort: {cohort_name}, Employer: {apprentice.employer or 'N/A'})"
        )
        out.append(
            f"    Submissions: {len(subs)} total — {status_counts}  |  "
            f"KSB coverage: {len(covered_ids)}/{total_ksbs} ({round(len(covered_ids)/max(total_ksbs,1)*100)}%)"
        )
        if missing_ksbs:
            out.append(f"    Missing KSBs: {missing_str}")
        if open_flags:
            flag_detail = "; ".join(
                f"{fl.reason} [{fl.severity}]" for fl in open_flags
            )
            out.append(f"    ⚠ Open interventions ({len(open_flags)}): {flag_detail}")
        if fb_rows:
            out.append(f"    Feedback: {len(fb_rows)} reviews, avg rating {avg_rating}/5")
        return out

    # ── APPRENTICE role ──────────────────────────────────
    if user.role == "apprentice" and user.apprentice_id:
        apprentice = db.query(Apprentice).filter(Apprentice.id == user.apprentice_id).first()
        if not apprentice:
            return "No apprentice record found."

        cohort = db.query(Cohort).filter(Cohort.id == apprentice.cohort_id).first()
        cohort_name = f"{cohort.name} ({cohort.programme})" if cohort else "N/A"
        lines.append(f"Apprentice: {apprentice.first_name} {apprentice.last_name}")
        lines.append(f"Cohort: {cohort_name}")
        lines.append(f"Employer: {apprentice.employer or 'N/A'}")

        subs = (db.query(EvidenceSubmission)
                .filter(EvidenceSubmission.apprentice_id == apprentice.id)
                .order_by(EvidenceSubmission.submitted_at.desc()).all())
        status_counts: dict[str, int] = {}
        for s in subs:
            status_counts[s.status] = status_counts.get(s.status, 0) + 1
        lines.append(f"\nSubmissions: {len(subs)} total — {status_counts}")

        # Per-submission detail (last 10)
        lines.append("Recent submissions:")
        for s in subs[:10]:
            mod_name = s.module.title if s.module else "N/A"
            ksb_codes = [sk.ksb.code for sk in s.ksb_links] if s.ksb_links else []
            fb = s.feedback
            fb_str = ""
            if fb:
                latest = fb[-1]
                fb_str = f" | Feedback: rating {latest.rating}/5" if latest.rating else ""
            lines.append(
                f"  - [{s.status.upper()}] \"{s.title or 'Untitled'}\" "
                f"(Module: {mod_name}, KSBs: {', '.join(ksb_codes) or 'none'}, "
                f"Date: {s.submitted_at.strftime('%d %b %Y') if s.submitted_at else '?'}{fb_str})"
            )

        # KSB coverage
        sub_ids = [s.id for s in subs]
        covered_ids = set()
        if sub_ids:
            covered_ids = {row[0] for row in db.query(SubmissionKSB.ksb_id).filter(
                SubmissionKSB.submission_id.in_(sub_ids)).distinct().all()}
        missing = [ksb_map[kid] for kid in ksb_map if kid not in covered_ids]
        lines.append(f"\nKSB Coverage: {len(covered_ids)}/{total_ksbs} ({round(len(covered_ids)/max(total_ksbs,1)*100)}%)")
        if missing:
            lines.append("Missing KSBs:")
            for k in missing:
                lines.append(f"  - {k.code} ({k.type}): {k.description[:80]}")

        # Feedback summary
        all_fb = (db.query(CoachFeedback).join(EvidenceSubmission)
                  .filter(EvidenceSubmission.apprentice_id == apprentice.id)
                  .order_by(CoachFeedback.created_at.desc()).all())
        if all_fb:
            ratings = [f.rating for f in all_fb if f.rating]
            avg = round(sum(ratings)/max(len(ratings),1), 1)
            lines.append(f"\nFeedback Summary: {len(all_fb)} reviews, avg rating {avg}/5")
            lines.append("Latest feedback comments:")
            for fb in all_fb[:3]:
                if fb.comments:
                    lines.append(f"  - \"{fb.comments[:120]}\" (by {fb.coach_name})")

        # Interventions
        flags = db.query(InterventionFlag).filter(
            InterventionFlag.apprentice_id == apprentice.id).all()
        open_flags = [f for f in flags if f.status in ("open", "in_progress")]
        if flags:
            lines.append(f"\nInterventions: {len(flags)} total, {len(open_flags)} open")
            for fl in open_flags:
                lines.append(f"  - [{fl.severity.upper()}] {fl.reason}: {fl.detail or 'No detail'}")

    # ── COACH role ───────────────────────────────────────
    elif user.role == "coach":
        cohort_links = db.query(CoachCohort).filter(CoachCohort.user_id == user.id).all()
        cohort_ids = [cc.cohort_id for cc in cohort_links]
        cohorts = db.query(Cohort).filter(Cohort.id.in_(cohort_ids)).all() if cohort_ids else []
        cohort_map_local = {c.id: c for c in cohorts}

        lines.append(f"Coach: {user.first_name} {user.last_name}")
        lines.append(f"Assigned Cohorts: {', '.join(c.name for c in cohorts) or 'None'}")

        if not cohort_ids:
            lines.append("No cohorts assigned — no apprentice data available.")
            return "\n".join(lines)

        apprentices = db.query(Apprentice).filter(Apprentice.cohort_id.in_(cohort_ids)).all()
        app_ids = [a.id for a in apprentices]
        lines.append(f"Total Apprentices: {len(apprentices)}")

        # Cohort-level summaries
        lines.append("\n── Per-Cohort Summary ──")
        for c in cohorts:
            c_apps = [a for a in apprentices if a.cohort_id == c.id]
            c_app_ids = [a.id for a in c_apps]
            c_subs = db.query(EvidenceSubmission).filter(
                EvidenceSubmission.apprentice_id.in_(c_app_ids)).all() if c_app_ids else []
            c_accepted = len([s for s in c_subs if s.status == "accepted"])
            c_flags = db.query(InterventionFlag).filter(
                InterventionFlag.apprentice_id.in_(c_app_ids),
                InterventionFlag.status.in_(["open", "in_progress"])
            ).count() if c_app_ids else 0
            lines.append(
                f"  {c.name} ({c.programme}): {len(c_apps)} apprentices, "
                f"{len(c_subs)} submissions ({c_accepted} accepted), "
                f"{c_flags} open interventions"
            )

        # Overall submission breakdown
        all_subs = db.query(EvidenceSubmission).filter(
            EvidenceSubmission.apprentice_id.in_(app_ids)).all() if app_ids else []
        status_counts = {}
        for s in all_subs:
            status_counts[s.status] = status_counts.get(s.status, 0) + 1
        lines.append(f"\n── Submission Overview ──")
        lines.append(f"Total: {len(all_subs)} — {status_counts}")

        # KSB coverage across all apprentices
        sub_ids = [s.id for s in all_subs]
        if sub_ids:
            ksb_covered = db.query(func.count(func.distinct(SubmissionKSB.ksb_id))).filter(
                SubmissionKSB.submission_id.in_(sub_ids)).scalar()
        else:
            ksb_covered = 0
        lines.append(f"Overall KSB Coverage: {ksb_covered}/{total_ksbs}")

        # Intervention breakdown by severity
        all_flags = db.query(InterventionFlag).filter(
            InterventionFlag.apprentice_id.in_(app_ids)).all() if app_ids else []
        open_flags = [f for f in all_flags if f.status in ("open", "in_progress")]
        sev_counts = {}
        for f in open_flags:
            sev_counts[f.severity] = sev_counts.get(f.severity, 0) + 1
        lines.append(f"Open Interventions: {len(open_flags)} — by severity: {sev_counts}")

        # Per-apprentice detail
        lines.append("\n── Per-Apprentice Detail ──")
        for a in apprentices:
            c_name = cohort_map_local.get(a.cohort_id)
            c_name_str = c_name.name if c_name else "?"
            lines.extend(_apprentice_detail(a, c_name_str))

    # ── ADMIN role ───────────────────────────────────────
    elif user.role == "admin":
        lines.append(f"Admin: {user.first_name} {user.last_name}")

        # System-wide counts
        all_apprentices = db.query(Apprentice).all()
        all_cohorts = db.query(Cohort).all()
        all_subs = db.query(EvidenceSubmission).all()
        all_flags = db.query(InterventionFlag).all()
        all_feedback = db.query(CoachFeedback).all()
        coaches = db.query(User).filter(User.role == "coach", User.is_active == True).all()

        status_counts = {}
        for s in all_subs:
            status_counts[s.status] = status_counts.get(s.status, 0) + 1
        open_flags = [f for f in all_flags if f.status in ("open", "in_progress")]
        sev_counts = {}
        for f in open_flags:
            sev_counts[f.severity] = sev_counts.get(f.severity, 0) + 1

        lines.append(f"\n── System Overview ──")
        lines.append(f"Cohorts: {len(all_cohorts)}")
        lines.append(f"Apprentices: {len(all_apprentices)}")
        lines.append(f"Coaches: {len(coaches)}")
        lines.append(f"Submissions: {len(all_subs)} — {status_counts}")
        lines.append(f"Open Interventions: {len(open_flags)} — by severity: {sev_counts}")
        ratings = [f.rating for f in all_feedback if f.rating]
        avg_rating = round(sum(ratings)/max(len(ratings),1), 1) if ratings else 0
        lines.append(f"Feedback: {len(all_feedback)} reviews, avg rating {avg_rating}/5")

        # KSB coverage system-wide
        ksb_covered = db.query(func.count(func.distinct(SubmissionKSB.ksb_id))).scalar()
        lines.append(f"KSB Coverage: {ksb_covered}/{total_ksbs}")

        # Per-cohort breakdown
        lines.append(f"\n── Per-Cohort Breakdown ──")
        for c in all_cohorts:
            c_apps = [a for a in all_apprentices if a.cohort_id == c.id]
            c_app_ids = [a.id for a in c_apps]
            c_subs = [s for s in all_subs if s.apprentice_id in set(c_app_ids)]
            c_accepted = len([s for s in c_subs if s.status == "accepted"])
            c_open = len([f for f in open_flags if f.apprentice_id in set(c_app_ids)])
            # Find assigned coaches
            coach_ids = {cc.user_id for cc in db.query(CoachCohort).filter(
                CoachCohort.cohort_id == c.id).all()}
            coach_names = [f"{u.first_name} {u.last_name}" for u in coaches if u.id in coach_ids]
            lines.append(
                f"  {c.name} ({c.programme}, {c.start_date} → {c.end_date or 'ongoing'}): "
                f"{len(c_apps)} apprentices, {len(c_subs)} subs ({c_accepted} accepted), "
                f"{c_open} open flags  |  Coaches: {', '.join(coach_names) or 'unassigned'}"
            )

        # Per-coach workload
        lines.append(f"\n── Coach Workload ──")
        for coach in coaches:
            c_cohort_ids = [cc.cohort_id for cc in
                            db.query(CoachCohort).filter(CoachCohort.user_id == coach.id).all()]
            c_cohort_names = [c.name for c in all_cohorts if c.id in set(c_cohort_ids)]
            c_app_ids = [a.id for a in all_apprentices if a.cohort_id in set(c_cohort_ids)]
            c_sub_count = len([s for s in all_subs if s.apprentice_id in set(c_app_ids)])
            c_open_flags = len([f for f in open_flags if f.apprentice_id in set(c_app_ids)])
            c_fb_count = len([f for f in all_feedback
                              if any(s.apprentice_id in set(c_app_ids)
                                     for s in all_subs if s.id == f.submission_id)])
            lines.append(
                f"  {coach.first_name} {coach.last_name}: "
                f"cohorts=[{', '.join(c_cohort_names)}], "
                f"{len(c_app_ids)} apprentices, {c_sub_count} submissions, "
                f"{c_open_flags} open interventions, {c_fb_count} feedback given"
            )

        # Top-level intervention details
        if open_flags:
            lines.append(f"\n── Open Intervention Details ──")
            for fl in open_flags[:15]:
                app = next((a for a in all_apprentices if a.id == fl.apprentice_id), None)
                app_name = f"{app.first_name} {app.last_name}" if app else f"ID#{fl.apprentice_id}"
                lines.append(
                    f"  [{fl.severity.upper()}] {app_name}: {fl.reason} — "
                    f"{fl.detail or 'No detail'} (status: {fl.status})"
                )

    return "\n".join(lines)


# ── Endpoints ──────────────────────────────────────────

@router.post("", response_model=ChatMessageResponse)
def send_message(
    body: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = _allowed,
):
    """Send a message and get an AI response. Creates a new conversation if needed."""
    # Get or create conversation
    if body.conversation_id:
        conversation = db.query(ChatConversation).filter(
            ChatConversation.id == body.conversation_id,
            ChatConversation.user_id == current_user.id,
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        # Create a new conversation with auto-title
        title = body.message[:50] + ("..." if len(body.message) > 50 else "")
        conversation = ChatConversation(
            user_id=current_user.id,
            title=title,
        )
        db.add(conversation)
        db.flush()  # get id

    # Save user message
    user_msg = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=body.message,
    )
    db.add(user_msg)
    db.flush()

    # Build conversation history for LLM (last 20 messages)
    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(20)
        .all()
    )
    history.reverse()  # chronological order

    # Gather role-specific context
    context = _gather_context(current_user, db)
    system_prompt = _build_system_prompt(current_user, context)

    # Build messages for LLM
    llm_messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        if msg.role in ("user", "assistant"):
            llm_messages.append({"role": msg.role, "content": msg.content})

    # Get AI response
    ai_response = get_chat_completion(llm_messages)

    if ai_response is None:
        ai_response = (
            "I'm sorry, I'm unable to process your request right now. "
            "The AI service may be temporarily unavailable. Please try again in a moment, "
            "or contact your system administrator if this persists."
        )

    # Save assistant message
    assistant_msg = ChatMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=ai_response,
    )
    db.add(assistant_msg)

    # Update conversation timestamp
    conversation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assistant_msg)

    return assistant_msg


@router.get("/conversations", response_model=list[ChatConversationListItem])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = _allowed,
):
    """List all conversations for the current user, newest first."""
    conversations = (
        db.query(ChatConversation)
        .filter(ChatConversation.user_id == current_user.id)
        .order_by(ChatConversation.updated_at.desc())
        .all()
    )
    result = []
    for conv in conversations:
        msg_count = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.conversation_id == conv.id).scalar()
        result.append(ChatConversationListItem(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=msg_count,
        ))
    return result


@router.get("/conversations/{conversation_id}", response_model=ChatConversationResponse)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = _allowed,
):
    """Get a full conversation with all messages."""
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id,
        ChatConversation.user_id == current_user.id,
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    # Replace generic "user" role with the actual user role (admin/coach/apprentice)
    messages = [
        ChatMessageResponse(
            id=m.id,
            role=current_user.role if m.role == "user" else m.role,
            content=m.content,
            created_at=m.created_at,
        )
        for m in conversation.messages
    ]
    return ChatConversationResponse(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=messages,
    )


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = _allowed,
):
    """Delete a conversation and all its messages."""
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id,
        ChatConversation.user_id == current_user.id,
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conversation)
    db.commit()
    return {"detail": "Conversation deleted"}
