"""Apprentice self-service routes – all scoped to the logged-in apprentice."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.database import get_db
from models.models import (
    User, Apprentice, EvidenceSubmission, SubmissionKSB, KSB,
    Assessment, Module, ModuleKSB, CoachFeedback, InterventionFlag,
)
from schemas.schemas import EvidenceSubmissionCreate
from auth import require_role

router = APIRouter(prefix="/api/my", tags=["apprentice-portal"])

_apprentice_only = Depends(require_role("apprentice"))


def _get_apprentice(current_user: User, db: Session) -> Apprentice:
    if not current_user.apprentice_id:
        raise HTTPException(status_code=400, detail="No apprentice profile linked")
    apprentice = db.query(Apprentice).filter(Apprentice.id == current_user.apprentice_id).first()
    if not apprentice:
        raise HTTPException(status_code=404, detail="Apprentice profile not found")
    return apprentice


# ── Dashboard ───────────────────────────────────────────
@router.get("/dashboard")
def my_dashboard(db: Session = Depends(get_db), current_user: User = _apprentice_only):
    apprentice = _get_apprentice(current_user, db)

    submissions = db.query(EvidenceSubmission).filter(
        EvidenceSubmission.apprentice_id == apprentice.id
    ).all()

    total_ksbs = db.query(func.count(KSB.id)).scalar()

    # ── Three-way KSB breakdown (matching portfolio logic) ─
    evidenced_ksb_ids: set[int] = set()
    in_progress_ksb_ids: set[int] = set()
    for sub in submissions:
        for lk in sub.ksb_links:
            if sub.status in ('accepted', 'reviewed'):
                evidenced_ksb_ids.add(lk.ksb_id)
            elif sub.status in ('submitted', 'draft'):
                in_progress_ksb_ids.add(lk.ksb_id)
    # accepted/reviewed overrides in_progress
    in_progress_ksb_ids -= evidenced_ksb_ids

    ksbs_evidenced = len(evidenced_ksb_ids)
    ksbs_in_progress = len(in_progress_ksb_ids)
    ksbs_not_started = total_ksbs - ksbs_evidenced - ksbs_in_progress

    open_interventions = db.query(func.count(InterventionFlag.id)).filter(
        InterventionFlag.apprentice_id == apprentice.id,
        InterventionFlag.status != "resolved",
    ).scalar()

    status_counts = {}
    for s in submissions:
        status_counts[s.status] = status_counts.get(s.status, 0) + 1

    # ── Module summaries ──
    modules = db.query(Module).all()
    module_summaries = []
    for m in modules:
        # Count submissions for this module
        mod_sub_count = sum(1 for s in submissions if s.module_id == m.id)
        # KSBs mapped to this module
        mod_ksb_links = (
            db.query(ModuleKSB, KSB)
            .join(KSB, KSB.id == ModuleKSB.ksb_id)
            .filter(ModuleKSB.module_id == m.id)
            .all()
        )
        total_mod_ksbs = len(mod_ksb_links)
        mod_ksb_ids = {k.id for _, k in mod_ksb_links}
        mod_evidenced = len(evidenced_ksb_ids & mod_ksb_ids)
        mod_in_progress = len(in_progress_ksb_ids & mod_ksb_ids)
        mod_not_started = total_mod_ksbs - mod_evidenced - mod_in_progress

        module_summaries.append({
            "id": m.id,
            "code": m.code,
            "title": m.title,
            "credits": m.credits,
            "total_ksbs": total_mod_ksbs,
            "evidenced_ksbs": mod_evidenced,
            "in_progress_ksbs": mod_in_progress,
            "not_started_ksbs": mod_not_started,
            "submissions": mod_sub_count,
        })

    return {
        "apprentice_id": apprentice.id,
        "name": f"{apprentice.first_name} {apprentice.last_name}",
        "cohort_id": apprentice.cohort_id,
        "employer": apprentice.employer,
        "total_submissions": len(submissions),
        "submission_statuses": status_counts,
        "total_ksbs": total_ksbs,
        "ksbs_evidenced": ksbs_evidenced,
        "ksbs_in_progress": ksbs_in_progress,
        "ksbs_not_started": ksbs_not_started,
        "ksb_coverage_pct": round(ksbs_evidenced / total_ksbs * 100, 1) if total_ksbs else 0,
        "open_interventions": open_interventions,
        "modules": module_summaries,
    }


# ── My Submissions ─────────────────────────────────────
@router.get("/submissions")
def my_submissions(db: Session = Depends(get_db), current_user: User = _apprentice_only):
    apprentice = _get_apprentice(current_user, db)
    subs = (
        db.query(EvidenceSubmission)
        .filter(EvidenceSubmission.apprentice_id == apprentice.id)
        .order_by(EvidenceSubmission.created_at.desc())
        .all()
    )
    results = []
    for s in subs:
        ksb_links = db.query(SubmissionKSB).filter(SubmissionKSB.submission_id == s.id).all()
        ksb_details = []
        for lk in ksb_links:
            ksb = db.query(KSB).filter(KSB.id == lk.ksb_id).first()
            ksb_details.append({
                "ksb_id": lk.ksb_id,
                "code": ksb.code if ksb else None,
                "type": ksb.type if ksb else None,
                "description": ksb.description if ksb else None,
                "notes": lk.notes,
            })
        feedback = db.query(CoachFeedback).filter(CoachFeedback.submission_id == s.id).all()

        # Resolve module name
        module_name = None
        if s.module_id:
            mod = db.query(Module).filter(Module.id == s.module_id).first()
            module_name = f"{mod.code} – {mod.title}" if mod else None

        results.append({
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "status": s.status,
            "file_url": s.file_url,
            "module_id": s.module_id,
            "module_name": module_name,
            "work_project": s.work_project,
            "assessment_id": s.assessment_id,
            "submitted_at": s.submitted_at,
            "created_at": s.created_at,
            "ksbs": ksb_details,
            "feedback": [
                {"coach_name": f.coach_name, "rating": f.rating, "comments": f.comments, "created_at": f.created_at}
                for f in feedback
            ],
        })
    return results


# ── Submit Evidence ─────────────────────────────────────
@router.post("/submissions", status_code=201)
def submit_evidence(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = _apprentice_only,
):
    apprentice = _get_apprentice(current_user, db)

    title = payload.get("title")  # optional
    description = payload.get("description")  # main journal entry
    module_id = payload.get("module_id")  # optional module mapping
    assessment_id = payload.get("assessment_id")  # optional assessment mapping
    file_url = payload.get("file_url")
    work_project = payload.get("work_project")  # optional work project name
    status_val = payload.get("status", "submitted")
    ksb_ids = payload.get("ksb_ids", [])
    ksb_notes = payload.get("ksb_notes", {})  # {ksb_id_str: "notes"}

    if not description and not title:
        raise HTTPException(status_code=400, detail="Please provide a description for your evidence entry")

    if not ksb_ids:
        raise HTTPException(status_code=400, detail="Please select at least one KSB")

    submission = EvidenceSubmission(
        apprentice_id=apprentice.id,
        assessment_id=assessment_id if assessment_id else None,
        module_id=module_id if module_id else None,
        title=title,
        description=description,
        file_url=file_url,
        work_project=work_project,
        status=status_val,
    )
    db.add(submission)
    db.flush()

    for kid in ksb_ids:
        db.add(SubmissionKSB(
            submission_id=submission.id,
            ksb_id=kid,
            notes=ksb_notes.get(str(kid)),
        ))

    db.commit()
    db.refresh(submission)
    return {"id": submission.id, "title": submission.title, "status": submission.status, "created_at": str(submission.created_at)}


# ── Update My Submission ────────────────────────────────
@router.put("/submissions/{submission_id}")
def update_my_submission(
    submission_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = _apprentice_only,
):
    apprentice = _get_apprentice(current_user, db)
    sub = db.query(EvidenceSubmission).filter(
        EvidenceSubmission.id == submission_id,
        EvidenceSubmission.apprentice_id == apprentice.id,
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    for field in ("title", "description", "file_url", "status", "work_project", "module_id", "assessment_id"):
        if field in payload:
            setattr(sub, field, payload[field] if payload[field] else None)

    # Update KSB mappings if provided
    if "ksb_ids" in payload:
        db.query(SubmissionKSB).filter(SubmissionKSB.submission_id == sub.id).delete()
        ksb_notes = payload.get("ksb_notes", {})
        for kid in payload["ksb_ids"]:
            db.add(SubmissionKSB(submission_id=sub.id, ksb_id=kid, notes=ksb_notes.get(str(kid))))

    db.commit()
    db.refresh(sub)
    return {"id": sub.id, "title": sub.title, "status": sub.status}


# ── Portfolio ───────────────────────────────────────────
@router.get("/portfolio")
def my_portfolio(db: Session = Depends(get_db), current_user: User = _apprentice_only):
    """All KSBs with the apprentice's evidence mapped to each."""
    apprentice = _get_apprentice(current_user, db)
    all_ksbs = db.query(KSB).order_by(KSB.code).all()

    # Build a map: ksb_id -> [{submission info}]
    links = (
        db.query(SubmissionKSB, EvidenceSubmission)
        .join(EvidenceSubmission, EvidenceSubmission.id == SubmissionKSB.submission_id)
        .filter(EvidenceSubmission.apprentice_id == apprentice.id)
        .all()
    )

    ksb_evidence: dict[int, list] = {}
    submission_ids = set()
    for link, sub in links:
        submission_ids.add(sub.id)
        # Resolve module name
        module_name = None
        if sub.module_id:
            mod = db.query(Module).filter(Module.id == sub.module_id).first()
            module_name = f"{mod.code} – {mod.title}" if mod else None

        ksb_evidence.setdefault(link.ksb_id, []).append({
            "submission_id": sub.id,
            "title": sub.title,
            "description": sub.description,
            "status": sub.status,
            "notes": link.notes,
            "module_name": module_name,
            "work_project": sub.work_project,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
        })

    # Fetch feedback for these submissions
    feedback_map: dict[int, list] = {}
    if submission_ids:
        feedbacks = db.query(CoachFeedback).filter(CoachFeedback.submission_id.in_(submission_ids)).all()
        for f in feedbacks:
            feedback_map.setdefault(f.submission_id, []).append({
                "coach_name": f.coach_name,
                "rating": f.rating,
                "comments": f.comments,
            })

    result = []
    for ksb in all_ksbs:
        evidence = ksb_evidence.get(ksb.id, [])
        # Attach feedback to each evidence item
        for ev in evidence:
            ev["feedback"] = feedback_map.get(ev["submission_id"], [])

        has_accepted = any(e["status"] == "accepted" for e in evidence)
        has_evidence = len(evidence) > 0
        coverage_status = "evidenced" if has_accepted else ("in_progress" if has_evidence else "not_started")

        result.append({
            "id": ksb.id,
            "code": ksb.code,
            "type": ksb.type,
            "description": ksb.description,
            "coverage_status": coverage_status,
            "evidence": evidence,
        })

    return result


# ── My Modules / Assessments ───────────────────────────
@router.get("/modules")
def my_modules(db: Session = Depends(get_db), current_user: User = _apprentice_only):
    """Return all modules with official KSBs and the apprentice's progress on each."""
    apprentice = _get_apprentice(current_user, db)

    # Get all KSB ids this apprentice has evidenced (submitted/reviewed/accepted)
    evidenced_ksb_ids: set[int] = set()
    in_progress_ksb_ids: set[int] = set()
    apprentice_subs = (
        db.query(EvidenceSubmission)
        .filter(EvidenceSubmission.apprentice_id == apprentice.id)
        .all()
    )
    for sub in apprentice_subs:
        for link in sub.ksb_links:
            if sub.status in ('accepted', 'reviewed'):
                evidenced_ksb_ids.add(link.ksb_id)
            elif sub.status in ('submitted', 'draft'):
                in_progress_ksb_ids.add(link.ksb_id)
    # accepted/reviewed overrides in_progress
    in_progress_ksb_ids -= evidenced_ksb_ids

    # Get all KSBs for overall progress
    all_ksbs = db.query(KSB).all()
    total_ksbs = len(all_ksbs)
    overall_evidenced = len(evidenced_ksb_ids)
    overall_in_progress = len(in_progress_ksb_ids)
    overall_not_started = total_ksbs - overall_evidenced - overall_in_progress

    modules = db.query(Module).all()
    result = []
    for m in modules:
        assessments = db.query(Assessment).filter(Assessment.module_id == m.id).all()

        # Official KSB mappings for this module
        official_links = (
            db.query(ModuleKSB, KSB)
            .join(KSB, KSB.id == ModuleKSB.ksb_id)
            .filter(ModuleKSB.module_id == m.id)
            .order_by(KSB.code)
            .all()
        )

        ksbs_for_module = []
        mod_evidenced = 0
        mod_in_progress = 0
        mod_not_started = 0
        for _link, ksb in official_links:
            if ksb.id in evidenced_ksb_ids:
                status = 'evidenced'
                mod_evidenced += 1
            elif ksb.id in in_progress_ksb_ids:
                status = 'in_progress'
                mod_in_progress += 1
            else:
                status = 'not_started'
                mod_not_started += 1
            ksbs_for_module.append({
                "id": ksb.id,
                "code": ksb.code,
                "type": ksb.type,
                "description": ksb.description,
                "status": status,
            })

        result.append({
            "id": m.id,
            "code": m.code,
            "title": m.title,
            "credits": m.credits,
            "assessments": [
                {"id": a.id, "title": a.title, "description": a.description, "due_date": str(a.due_date) if a.due_date else None}
                for a in assessments
            ],
            "ksbs": ksbs_for_module,
            "progress": {
                "total": len(ksbs_for_module),
                "evidenced": mod_evidenced,
                "in_progress": mod_in_progress,
                "not_started": mod_not_started,
            },
        })

    return {
        "modules": result,
        "overall_progress": {
            "total": total_ksbs,
            "evidenced": overall_evidenced,
            "in_progress": overall_in_progress,
            "not_started": overall_not_started,
        },
    }


# ── My Feedback ─────────────────────────────────────────
@router.get("/feedback")
def my_feedback(db: Session = Depends(get_db), current_user: User = _apprentice_only):
    apprentice = _get_apprentice(current_user, db)
    feedbacks = (
        db.query(CoachFeedback, EvidenceSubmission)
        .join(EvidenceSubmission, EvidenceSubmission.id == CoachFeedback.submission_id)
        .filter(EvidenceSubmission.apprentice_id == apprentice.id)
        .order_by(CoachFeedback.created_at.desc())
        .all()
    )
    results = []
    for f, s in feedbacks:
        # Resolve module name
        module_name = None
        if s.module_id:
            mod = db.query(Module).filter(Module.id == s.module_id).first()
            module_name = f"{mod.code} – {mod.title}" if mod else None

        # Resolve KSBs for this submission
        ksb_links = db.query(SubmissionKSB).filter(SubmissionKSB.submission_id == s.id).all()
        ksb_details = []
        for lk in ksb_links:
            ksb = db.query(KSB).filter(KSB.id == lk.ksb_id).first()
            if ksb:
                ksb_details.append({"code": ksb.code, "type": ksb.type, "description": ksb.description})

        results.append({
            "id": f.id,
            "submission_id": f.submission_id,
            "submission_title": s.title,
            "coach_name": f.coach_name,
            "rating": f.rating,
            "comments": f.comments,
            "created_at": f.created_at,
            "evidence": {
                "description": s.description,
                "status": s.status,
                "submitted_at": s.submitted_at,
                "module_name": module_name,
                "work_project": s.work_project,
                "file_url": s.file_url,
                "ksbs": ksb_details,
            },
        })
    return results


# ── KSBs reference ─────────────────────────────────────
@router.get("/ksbs")
def my_ksbs(db: Session = Depends(get_db), current_user: User = _apprentice_only):
    """Return all KSBs for reference (used in evidence submission form)."""
    return [
        {"id": k.id, "code": k.code, "type": k.type, "description": k.description}
        for k in db.query(KSB).order_by(KSB.code).all()
    ]
