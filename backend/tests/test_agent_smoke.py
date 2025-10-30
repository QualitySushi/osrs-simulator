import json
from backend.app.agent import run_agent_chat

import os, pytest
if os.getenv("SCAPELAB_TESTING") == "1" and not os.getenv("ALLOW_AGENT_TESTS"):
    pytest.skip("Skipping agent smoke in CI (set ALLOW_AGENT_TESTS=1 to run)", allow_module_level=True)


def test_smoke_lookup_boss(monkeypatch):
    # Monkeypatch TOOL_IMPLS to avoid DB calls if needed.
    from backend.app.tools import TOOL_IMPLS
    TOOL_IMPLS["lookup_boss"] = lambda a: {"name":"Vorkath","style":"dragon","defence":200}

    res = run_agent_chat([{"role":"user","content":"What is BIS for Vorkath with 10m budget?"}])
    assert "Vorkath" in res["content"]
