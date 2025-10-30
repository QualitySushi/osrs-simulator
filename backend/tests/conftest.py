# backend/tests/conftest.py
import sys
from pathlib import Path
import os
import pytest

# repo root = .../osrs-simulator
ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
TOOLS = ROOT / "tools"

for p in (str(ROOT), str(BACKEND), str(TOOLS)):
    if p not in sys.path:
        sys.path.insert(0, p)

# ---- CI guards early (before any app import) ----
os.environ.setdefault("SCAPELAB_TESTING", "1")
os.environ.setdefault("DISABLE_STARTUP_DB_CONNECT", "1")

# ---- Optional repo stubs (applied around every test) ----
try:
    from backend.tests._db_stubs import apply_repo_stubs
except Exception:
    apply_repo_stubs = None

@pytest.fixture(autouse=True)
def _repos_stubbed():
    if apply_repo_stubs is None:
        yield
    else:
        with apply_repo_stubs():
            yield

# ---- Hard block DB calls in unit tests ----
@pytest.fixture(autouse=True)
def _block_db(monkeypatch):
    try:
        import pyodbc
        monkeypatch.setattr(
            pyodbc,
            "connect",
            lambda *a, **k: (_ for _ in ()).throw(RuntimeError("DB blocked in tests")),
        )
    except Exception:
        pass
    try:
        import aioodbc
        async def _no_pool(*a, **k):
            raise RuntimeError("DB blocked in tests")
        monkeypatch.setattr(aioodbc, "create_pool", _no_pool)
    except Exception:
        pass

# ---- Test clients (lazy app creation inside fixtures) ----
from contextlib import contextmanager

@contextmanager
def _build_app():
    """
    Create the FastAPI app lazily so repo stubs + env guards are active.
    """
    try:
        from app.main import create_app
        app = create_app()
    except Exception:
        from app.main import app  # fallback
    yield app

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    with _build_app() as app:
        with TestClient(app) as c:
            yield c

@pytest.fixture
async def async_client():
    try:
        from httpx import AsyncClient
    except Exception:
        pytest.skip("httpx not available for async client")
    with _build_app() as app:
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac
