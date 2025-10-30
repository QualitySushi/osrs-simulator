import json
import time
from pathlib import Path

import pytest
import requests

from tools.scraper_v2.parsers.drops import parse_drop_table

UA = {"User-Agent": "ScapeLab test suite"}
WIKI_API = "https://oldschool.runescape.wiki/api.php"
FIXTURES_DIR = Path(__file__).parent / "fixtures"
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

def fetch_html(title: str) -> str:
    params = {"action": "parse", "page": title, "prop": "text", "format": "json"}
    r = requests.get(WIKI_API, params=params, headers=UA, timeout=25)
    r.raise_for_status()
    return r.json()["parse"]["text"]["*"]

@pytest.fixture(autouse=True, scope="module")
def _polite_delay():
    yield
    time.sleep(0.3)

@pytest.mark.parametrize("npc_title, expect_item_substrs", [
    ("Abyssal_demon", ["Abyssal whip"]),     # classic, stable
    ("Demonic_gorilla", ["Zenyte shard"]),   # stable unique
])
def test_parse_drop_table_live(npc_title, expect_item_substrs):
    html = fetch_html(npc_title)
    drops = parse_drop_table(html)
    assert isinstance(drops, list) and len(drops) > 0, f"{npc_title}: expected some drops"

    items_lower = [ (d.get("item") or "").lower() for d in drops ]
    for needle in expect_item_substrs:
        assert any(needle.lower() in i for i in items_lower), f"{npc_title}: missing expected item '{needle}'"

    # sanity on structure of a row
    row = drops[0]
    assert "item" in row and "quantity" in row and "rarity" in row
    rarity = row["rarity"]
    assert {"numerator", "denominator", "one_over", "percent", "text"} <= set(rarity.keys())
