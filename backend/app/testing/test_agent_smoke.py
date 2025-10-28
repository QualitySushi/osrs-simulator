import json
from backend.app.agent import run_agent_chat

def test_smoke_lookup_boss(monkeypatch):
    # Monkeypatch TOOL_IMPLS to avoid DB calls if needed.
    from backend.app.tools import TOOL_IMPLS
    TOOL_IMPLS["lookup_boss"] = lambda a: {"name":"Vorkath","style":"dragon","defence":200}

    res = run_agent_chat([{"role":"user","content":"What is BIS for Vorkath with 10m budget?"}])
    assert "Vorkath" in res["content"]
