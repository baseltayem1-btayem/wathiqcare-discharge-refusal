def test_login_success(client, admin_user):
    response = client.post("/auth/token", data={"username": "admin", "password": "adminpass"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials(client, admin_user):
    response = client.post("/auth/token", data={"username": "admin", "password": "wrongpass"})
    assert response.status_code == 401


def test_login_unknown_user(client):
    response = client.post("/auth/token", data={"username": "nobody", "password": "pass"})
    assert response.status_code == 401


def test_register_first_user_no_auth(client):
    # When no users exist, registration is allowed without auth
    response = client.post(
        "/auth/register",
        json={
            "username": "firstadmin",
            "email": "first@test.com",
            "password": "pass123",
            "role": "admin",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "firstadmin"
    assert data["role"] == "admin"


def test_register_as_admin(client, admin_token):
    response = client.post(
        "/auth/register",
        json={
            "username": "newdoc",
            "email": "newdoc@test.com",
            "password": "pass123",
            "role": "doctor",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201


def test_register_as_non_admin_forbidden(client, doctor_token):
    response = client.post(
        "/auth/register",
        json={
            "username": "another",
            "email": "another@test.com",
            "password": "pass123",
            "role": "nurse",
        },
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert response.status_code == 403


def test_register_duplicate_username(client, admin_user, admin_token):
    response = client.post(
        "/auth/register",
        json={
            "username": "admin",
            "email": "other@test.com",
            "password": "pass123",
            "role": "doctor",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400


def test_access_protected_no_token(client):
    response = client.get("/patients")
    assert response.status_code == 401
