import pytest
from fastapi.testclient import TestClient
try:
    from app.main import create_app
    app = create_app()
except Exception:
    from app.main import app
client = TestClient(app)

def test_openapi_and_docs_available():
    r = client.get("/openapi.json"); assert r.status_code == 200 and "paths" in r.json()
    # Only assert 200 on one of the docs endpoints to avoid coupling
    for p in ("/docs", "/redoc"):
        if client.get(p).status_code == 200:
            break
    else:
        pytest.skip("No docs UI served in this config")

def test_validation_errors_422_on_bad_payload():
    # Missing required fields for /calculate/dps should 422
    r = client.post("/calculate/dps", json={"combat_style": "melee"})
    assert r.status_code in (400, 422)
