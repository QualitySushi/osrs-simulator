import time
import requests
import pytest

from tools.scraper_v2.parsers.npcs import NpcParser  # assumes your file exposes NpcParser

UA = {"User-Agent": "ScapeLab test suite"}
WIKI_API = "https://oldschool.runescape.wiki/api.php"

def fetch_html(title: str) -> str:
    params = {"action": "parse", "page": title, "prop": "text", "format": "json"}
    r = requests.get(WIKI_API, params=params, headers=UA, timeout=25)
    r.raise_for_status()
    return r.json()["parse"]["text"]["*"]

@pytest.fixture(autouse=True, scope="module")
def _polite_delay():
    yield
    time.sleep(0.3)

@pytest.mark.parametrize("npc_title", [
    "Abyssal_demon",
    "Thermonuclear_smoke_devil",
])
def test_npc_parser_core_fields_live(npc_title):
    html = fetch_html(npc_title)
    parsed = NpcParser().parse(html)

    # Required basics
    assert parsed.get("name") or parsed.get("title")  # depending on your schema
    # Common numeric fields (be tolerant if a page is odd)
    for key in ["combat_level", "hitpoints", "max_hit"]:
        val = parsed.get(key)
        if val is not None:
            assert isinstance(val, int) and val >= 0

    # Styles / attributes are often present
    attrs = parsed.get("attributes") or {}
    assert isinstance(attrs, dict)

    # Drops link presence (not the actual table here)
    assert "drops" in parsed or "drop_table" in parsed
