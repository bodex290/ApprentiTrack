"""Tests for authentication endpoints — login, /me, change-password, role guards."""

from tests.conftest import auth_header


class TestLogin:
    """POST /api/auth/login"""

    def test_coach_login_success(self, client, seed_coach):
        r = client.post("/api/auth/login", json={"email": "coach@test.com", "password": "Coach123!"})
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "coach"
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_apprentice_login_success(self, client, seed_apprentice):
        r = client.post("/api/auth/login", json={"email": "apprentice@test.com", "password": "Test1234!"})
        assert r.status_code == 200
        assert r.json()["role"] == "apprentice"

    def test_login_wrong_password(self, client, seed_coach):
        r = client.post("/api/auth/login", json={"email": "coach@test.com", "password": "wrong"})
        assert r.status_code == 401
        assert "Invalid" in r.json()["detail"]

    def test_login_nonexistent_user(self, client):
        r = client.post("/api/auth/login", json={"email": "nobody@test.com", "password": "x"})
        assert r.status_code == 401

    def test_login_inactive_user(self, client, db, seed_coach):
        seed_coach.is_active = False
        db.commit()
        r = client.post("/api/auth/login", json={"email": "coach@test.com", "password": "Coach123!"})
        assert r.status_code == 403
        assert "disabled" in r.json()["detail"].lower()

    def test_login_returns_must_change_password(self, client, db, seed_coach):
        seed_coach.must_change_password = True
        db.commit()
        r = client.post("/api/auth/login", json={"email": "coach@test.com", "password": "Coach123!"})
        assert r.status_code == 200
        assert r.json()["must_change_password"] is True


class TestMe:
    """GET /api/auth/me"""

    def test_me_returns_user(self, client, coach_token, seed_coach):
        r = client.get("/api/auth/me", headers=auth_header(coach_token))
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "coach@test.com"
        assert data["role"] == "coach"
        assert data["id"] == seed_coach.id

    def test_me_no_token(self, client):
        r = client.get("/api/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self, client):
        r = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
        assert r.status_code == 401


class TestChangePassword:
    """POST /api/auth/change-password"""

    def test_change_password_success(self, client, coach_token, db, seed_coach):
        seed_coach.must_change_password = True
        db.commit()
        r = client.post(
            "/api/auth/change-password",
            json={"current_password": "Coach123!", "new_password": "NewPass1!"},
            headers=auth_header(coach_token),
        )
        assert r.status_code == 200
        # Verify must_change_password is now False
        db.refresh(seed_coach)
        assert seed_coach.must_change_password is False
        # Verify new password works
        r2 = client.post("/api/auth/login", json={"email": "coach@test.com", "password": "NewPass1!"})
        assert r2.status_code == 200

    def test_change_password_wrong_current(self, client, coach_token):
        r = client.post(
            "/api/auth/change-password",
            json={"current_password": "wrong", "new_password": "NewPass1!"},
            headers=auth_header(coach_token),
        )
        assert r.status_code == 400

    def test_change_password_too_short(self, client, coach_token):
        r = client.post(
            "/api/auth/change-password",
            json={"current_password": "Coach123!", "new_password": "ab"},
            headers=auth_header(coach_token),
        )
        assert r.status_code == 400


class TestRoleGuards:
    """Verify that role restrictions are enforced across protected endpoints."""

    def test_apprentice_cannot_access_coach_endpoints(self, client, apprentice_token):
        h = auth_header(apprentice_token)
        endpoints = [
            ("GET", "/api/apprentices/"),
            ("GET", "/api/cohorts/"),
            ("GET", "/api/submissions/"),
            ("GET", "/api/analytics/summary"),
            ("GET", "/api/users/"),
        ]
        for method, url in endpoints:
            r = client.request(method, url, headers=h)
            assert r.status_code == 403, f"{method} {url} should be 403 for apprentice, got {r.status_code}"

    def test_coach_cannot_access_apprentice_endpoints(self, client, coach_token):
        h = auth_header(coach_token)
        endpoints = [
            ("GET", "/api/my/dashboard"),
            ("GET", "/api/my/submissions/"),
            ("GET", "/api/my/portfolio"),
            ("GET", "/api/my/modules"),
        ]
        for method, url in endpoints:
            r = client.request(method, url, headers=h)
            assert r.status_code == 403, f"{method} {url} should be 403 for coach, got {r.status_code}"

    def test_unauthenticated_cannot_access_protected(self, client):
        endpoints = [
            "/api/apprentices/",
            "/api/cohorts/",
            "/api/users/",
            "/api/my/dashboard",
            "/api/analytics/summary",
        ]
        for url in endpoints:
            r = client.get(url)
            assert r.status_code == 401, f"GET {url} should be 401 without token, got {r.status_code}"
