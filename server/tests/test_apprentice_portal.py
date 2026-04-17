"""Tests for the apprentice self-service portal — /api/my/*"""

from tests.conftest import auth_header
from models.models import EvidenceSubmission, SubmissionKSB, CoachFeedback, ModuleKSB


class TestMyDashboard:
    """GET /api/my/dashboard"""

    def test_dashboard_returns_data(self, client, apprentice_token, seed_apprentice, seed_ksbs):
        r = client.get("/api/my/dashboard", headers=auth_header(apprentice_token))
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Test Apprentice"
        assert "total_submissions" in data
        assert "ksbs_covered" in data
        assert "ksb_coverage_pct" in data

    def test_dashboard_requires_apprentice_role(self, client, coach_token):
        r = client.get("/api/my/dashboard", headers=auth_header(coach_token))
        assert r.status_code == 403


class TestMySubmissions:
    """GET /api/my/submissions"""

    def test_empty_submissions(self, client, apprentice_token, seed_apprentice):
        r = client.get("/api/my/submissions", headers=auth_header(apprentice_token))
        assert r.status_code == 200
        assert r.json() == []

    def test_submissions_with_data(self, client, apprentice_token, seed_apprentice, seed_ksbs, db):
        app = seed_apprentice["apprentice"]
        # Create a submission manually
        sub = EvidenceSubmission(
            apprentice_id=app.id,
            description="Test evidence entry",
            status="submitted",
        )
        db.add(sub)
        db.flush()
        db.add(SubmissionKSB(submission_id=sub.id, ksb_id=seed_ksbs[0].id))
        db.commit()

        r = client.get("/api/my/submissions", headers=auth_header(apprentice_token))
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["description"] == "Test evidence entry"
        assert len(data[0]["ksbs"]) == 1
        assert data[0]["ksbs"][0]["code"] == "K1"

    def test_submissions_include_feedback(self, client, apprentice_token, seed_apprentice, seed_ksbs, db):
        app = seed_apprentice["apprentice"]
        sub = EvidenceSubmission(apprentice_id=app.id, description="With feedback", status="reviewed")
        db.add(sub)
        db.flush()
        db.add(SubmissionKSB(submission_id=sub.id, ksb_id=seed_ksbs[0].id))
        db.add(CoachFeedback(submission_id=sub.id, coach_name="Dr. Patel", rating=4, comments="Good work"))
        db.commit()

        r = client.get("/api/my/submissions", headers=auth_header(apprentice_token))
        data = r.json()
        assert len(data[0]["feedback"]) == 1
        assert data[0]["feedback"][0]["coach_name"] == "Dr. Patel"
        assert data[0]["feedback"][0]["rating"] == 4


class TestSubmitEvidence:
    """POST /api/my/submissions"""

    def test_submit_evidence_success(self, client, apprentice_token, seed_apprentice, seed_ksbs):
        r = client.post(
            "/api/my/submissions",
            json={
                "title": "Sprint retro",
                "description": "Reviewed CI/CD pipeline improvements",
                "ksb_ids": [seed_ksbs[0].id, seed_ksbs[1].id],
                "status": "submitted",
            },
            headers=auth_header(apprentice_token),
        )
        assert r.status_code == 201
        assert r.json()["title"] == "Sprint retro"

    def test_submit_evidence_with_module(self, client, apprentice_token, seed_apprentice, seed_ksbs, seed_module):
        r = client.post(
            "/api/my/submissions",
            json={
                "description": "Module-linked evidence",
                "ksb_ids": [seed_ksbs[0].id],
                "module_id": seed_module["module"].id,
                "assessment_id": seed_module["assessment"].id,
            },
            headers=auth_header(apprentice_token),
        )
        assert r.status_code == 201

    def test_submit_evidence_no_ksbs_fails(self, client, apprentice_token, seed_apprentice):
        r = client.post(
            "/api/my/submissions",
            json={"description": "No KSBs", "ksb_ids": []},
            headers=auth_header(apprentice_token),
        )
        assert r.status_code == 400
        assert "KSB" in r.json()["detail"]

    def test_submit_evidence_no_description_fails(self, client, apprentice_token, seed_apprentice, seed_ksbs):
        r = client.post(
            "/api/my/submissions",
            json={"ksb_ids": [seed_ksbs[0].id]},
            headers=auth_header(apprentice_token),
        )
        assert r.status_code == 400

    def test_submit_as_draft(self, client, apprentice_token, seed_apprentice, seed_ksbs):
        r = client.post(
            "/api/my/submissions",
            json={"description": "WIP entry", "ksb_ids": [seed_ksbs[0].id], "status": "draft"},
            headers=auth_header(apprentice_token),
        )
        assert r.status_code == 201
        assert r.json()["status"] == "draft"


class TestMyKSBs:
    """GET /api/my/ksbs"""

    def test_ksbs_returns_list(self, client, apprentice_token, seed_apprentice, seed_ksbs):
        r = client.get("/api/my/ksbs", headers=auth_header(apprentice_token))
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 3
        codes = {k["code"] for k in data}
        assert codes == {"K1", "S1", "B1"}


class TestMyModules:
    """GET /api/my/modules"""

    def test_modules_returns_structure(self, client, apprentice_token, seed_apprentice, seed_module, seed_ksbs, db):
        # Link a KSB to the module
        db.add(ModuleKSB(module_id=seed_module["module"].id, ksb_id=seed_ksbs[0].id))
        db.commit()

        r = client.get("/api/my/modules", headers=auth_header(apprentice_token))
        assert r.status_code == 200
        data = r.json()
        assert "modules" in data
        assert "overall_progress" in data
        assert len(data["modules"]) >= 1


class TestMyPortfolio:
    """GET /api/my/portfolio"""

    def test_portfolio_empty(self, client, apprentice_token, seed_apprentice, seed_ksbs):
        r = client.get("/api/my/portfolio", headers=auth_header(apprentice_token))
        assert r.status_code == 200
        data = r.json()
        # Should return all KSBs even without submissions
        assert len(data) == 3

    def test_portfolio_with_evidence(self, client, apprentice_token, seed_apprentice, seed_ksbs, db):
        app = seed_apprentice["apprentice"]
        sub = EvidenceSubmission(apprentice_id=app.id, description="Portfolio evidence", status="submitted")
        db.add(sub)
        db.flush()
        db.add(SubmissionKSB(submission_id=sub.id, ksb_id=seed_ksbs[0].id))
        db.commit()

        r = client.get("/api/my/portfolio", headers=auth_header(apprentice_token))
        data = r.json()
        k1_entry = next(k for k in data if k["code"] == "K1")
        assert len(k1_entry["evidence"]) == 1


class TestMyFeedback:
    """GET /api/my/feedback"""

    def test_feedback_empty(self, client, apprentice_token, seed_apprentice):
        r = client.get("/api/my/feedback", headers=auth_header(apprentice_token))
        assert r.status_code == 200
        assert r.json() == []

    def test_feedback_with_data(self, client, apprentice_token, seed_apprentice, seed_ksbs, db):
        app = seed_apprentice["apprentice"]
        sub = EvidenceSubmission(apprentice_id=app.id, description="For feedback", status="reviewed")
        db.add(sub)
        db.flush()
        db.add(SubmissionKSB(submission_id=sub.id, ksb_id=seed_ksbs[0].id))
        db.add(CoachFeedback(submission_id=sub.id, coach_name="Dr. Test", rating=5, comments="Excellent"))
        db.commit()

        r = client.get("/api/my/feedback", headers=auth_header(apprentice_token))
        data = r.json()
        assert len(data) >= 1
