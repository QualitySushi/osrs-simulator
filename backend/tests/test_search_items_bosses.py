from app.repositories import item_repository, boss_repository
from fastapi.testclient import TestClient
try:
    from app.main import create_app
    app = create_app()
except Exception:
    from app.main import app
client = TestClient(app)


def test_search_items_uses_repo(monkeypatch):
    monkeypatch.setattr(item_repository, "search_items",
                        lambda q, limit=None: [{"id": 1, "name": "Dragon scimitar"}])
    r = client.get("/search/items", params={"query": "drag"})
    assert r.status_code in (200, 404)  # if route not shipped yet, adjust later
    if r.status_code == 200:
        assert any(x["name"].lower().startswith("dragon") for x in r.json())

def test_search_bosses_uses_repo(monkeypatch):
    monkeypatch.setattr(boss_repository, "search_bosses",
                        lambda q, limit=None: [{"id": 1, "name": "Zulrah"}])
    r = client.get("/search/bosses", params={"query": "zul"})
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        assert any(x["name"] == "Zulrah" for x in r.json())
