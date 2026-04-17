"""Tests for coach-facing CRUD endpoints — apprentices, cohorts, modules, KSBs, submissions, interventions."""

from tests.conftest import auth_header


class TestApprenticesCRUD:
    """GET/POST/PUT/DELETE /api/apprentices/"""

    def test_list_apprentices(self, client, coach_token, seed_apprentice):
        r = client.get("/api/apprentices/", headers=auth_header(coach_token))
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_get_apprentice(self, client, coach_token, seed_apprentice):
        aid = seed_apprentice["apprentice"].id
        r = client.get(f"/api/apprentices/{aid}", headers=auth_header(coach_token))
        assert r.status_code == 200
        assert r.json()["email"] == "apprentice@test.com"

    def test_create_apprentice(self, client, coach_token, seed_cohort):
        r = client.post(
            "/api/apprentices/",
            json={"first_name": "New", "last_name": "Student", "email": "new@test.com", "cohort_id": seed_cohort.id},
            headers=auth_header(coach_token),
        )
        assert r.status_code == 201
        assert r.json()["email"] == "new@test.com"

    def test_update_apprentice(self, client, coach_token, seed_apprentice):
        aid = seed_apprentice["apprentice"].id
        r = client.put(
            f"/api/apprentices/{aid}",
            json={"employer": "Updated Corp"},
            headers=auth_header(coach_token),
        )
        assert r.status_code == 200
        assert r.json()["employer"] == "Updated Corp"

    def test_delete_apprentice(self, client, coach_token, seed_apprentice):
        aid = seed_apprentice["apprentice"].id
        r = client.delete(f"/api/apprentices/{aid}", headers=auth_header(coach_token))
        assert r.status_code == 204

    def test_get_nonexistent_apprentice(self, client, coach_token):
        r = client.get("/api/apprentices/9999", headers=auth_header(coach_token))
        assert r.status_code == 404


class TestCohortsCRUD:
    """GET/POST/PUT/DELETE /api/cohorts/"""

    def test_list_cohorts(self, client, coach_token, seed_cohort):
        r = client.get("/api/cohorts/", headers=auth_header(coach_token))
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_create_cohort(self, client, coach_token):
        r = client.post(
            "/api/cohorts/",
            json={"name": "Cohort B", "programme": "L4 DevOps", "start_date": "2026-01-01"},
            headers=auth_header(coach_token),
        )
        assert r.status_code == 201
        assert r.json()["name"] == "Cohort B"


class TestModulesCRUD:
    """GET/POST/PUT/DELETE /api/modules/"""

    def test_list_modules(self, client, coach_token, seed_module):
        r = client.get("/api/modules/", headers=auth_header(coach_token))
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_create_module(self, client, coach_token):
        r = client.post(
            "/api/modules/",
            json={"code": "NEW100", "title": "New Module", "credits": 15},
            headers=auth_header(coach_token),
        )
        assert r.status_code == 201
        assert r.json()["code"] == "NEW100"


class TestKSBsCRUD:
    """GET/POST/PUT/DELETE /api/ksbs/"""

    def test_list_ksbs(self, client, coach_token, seed_ksbs):
        r = client.get("/api/ksbs/", headers=auth_header(coach_token))
        assert r.status_code == 200
        assert len(r.json()) == 3

    def test_create_ksb(self, client, coach_token):
        r = client.post(
            "/api/ksbs/",
            json={"code": "K99", "type": "Knowledge", "description": "Test KSB"},
            headers=auth_header(coach_token),
        )
        assert r.status_code == 201

    def test_update_ksb(self, client, coach_token, seed_ksbs):
        kid = seed_ksbs[0].id
        r = client.put(
            f"/api/ksbs/{kid}",
            json={"description": "Updated description"},
            headers=auth_header(coach_token),
        )
        assert r.status_code == 200
        assert r.json()["description"] == "Updated description"


class TestSubmissionsCRUD:
    """GET/POST /api/submissions/"""

    def test_list_submissions(self, client, coach_token):
        r = client.get("/api/submissions/", headers=auth_header(coach_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestInterventions:
    """GET/POST/PATCH /api/interventions/"""

    def test_list_interventions(self, client, coach_token):
        r = client.get("/api/interventions/", headers=auth_header(coach_token))
        assert r.status_code == 200

    def test_create_intervention(self, client, coach_token, seed_apprentice):
        aid = seed_apprentice["apprentice"].id
        r = client.post(
            "/api/interventions/",
            json={
                "apprentice_id": aid,
                "reason": "Low engagement",
                "severity": "medium",
            },
            headers=auth_header(coach_token),
        )
        assert r.status_code == 201
        assert r.json()["reason"] == "Low engagement"


class TestUserManagement:
    """Coach-managed user CRUD — /api/users/"""

    def test_list_users(self, client, coach_token, seed_coach):
        r = client.get("/api/users/", headers=auth_header(coach_token))
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_create_coach(self, client, coach_token):
        r = client.post(
            "/api/users/coaches",
            json={"email": "new.coach@test.com", "first_name": "New", "last_name": "Coach", "password": "Pass123!"},
            headers=auth_header(coach_token),
        )
        assert r.status_code == 201
        assert r.json()["role"] == "coach"

    def test_create_apprentice_user(self, client, coach_token, seed_cohort):
        r = client.post(
            "/api/users/apprentices",
            json={
                "email": "new.apprentice@test.com",
                "first_name": "New",
                "last_name": "Apprentice",
                "password": "Pass123!",
                "cohort_id": seed_cohort.id,
            },
            headers=auth_header(coach_token),
        )
        assert r.status_code == 201
        assert r.json()["role"] == "apprentice"

    def test_cannot_create_duplicate_email(self, client, coach_token, seed_coach):
        r = client.post(
            "/api/users/coaches",
            json={"email": "coach@test.com", "first_name": "Dup", "last_name": "Coach", "password": "Pass123!"},
            headers=auth_header(coach_token),
        )
        assert r.status_code == 400


class TestAnalytics:
    """GET /api/analytics/*"""

    def test_summary(self, client, coach_token, seed_apprentice):
        r = client.get("/api/analytics/summary", headers=auth_header(coach_token))
        assert r.status_code == 200
        data = r.json()
        assert "total_apprentices" in data
        assert "total_submissions" in data
        assert "ksb_coverage_pct" in data

    def test_ksb_coverage_by_type(self, client, coach_token, seed_ksbs):
        r = client.get("/api/analytics/ksb-coverage-by-type", headers=auth_header(coach_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)
