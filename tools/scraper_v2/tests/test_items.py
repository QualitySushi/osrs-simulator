# backend/tests/test_items.py
import json
import time
from pathlib import Path

import pytest
import requests

from tools.scraper_v2.parsers.items import ItemParser

UA = {"User-Agent": "ScapeLab test suite"}
WIKI_API = "https://oldschool.runescape.wiki/api.php"
FIXTURES_DIR = Path(__file__).parent / "fixtures"
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)


def fetch_page_html(title: str) -> str:
    params = {"action": "parse", "page": title, "prop": "text", "format": "json"}
    r = requests.get(WIKI_API, params=params, headers=UA, timeout=25)
    r.raise_for_status()
    return r.json()["parse"]["text"]["*"]


def load_fixture_html(name: str) -> str:
    p = FIXTURES_DIR / name
    with p.open("r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            if isinstance(data, dict) and "html" in data:
                return data["html"]
            if isinstance(data, str):
                return data
        except json.JSONDecodeError:
            return f.read()


def get_html(title: str, fixture: str | None = None) -> str:
    if fixture and (FIXTURES_DIR / fixture).exists():
        return load_fixture_html(fixture)
    return fetch_page_html(title)


@pytest.fixture(autouse=True, scope="module")
def _polite_delay_between_calls():
    yield
    time.sleep(0.3)


@pytest.mark.parametrize("title, expected_slot, min_styles, exp_speed_min, exp_range_min", [
    ("Dragon_scimitar", "weapon", 3, 4, 1),
    ("Abyssal_whip",    "weapon", 3, 4, 1),
    ("Rune_crossbow",   "weapon", 3, 5, 5),  # tolerant: pages show 6–7 commonly
    ("Crystal_halberd", "2h",     3, 6, 1),  # tolerant: melee reach often 2
])
def test_item_core_fields_live(title, expected_slot, min_styles, exp_speed_min, exp_range_min):
    html = get_html(title)
    parsed = ItemParser().parse(html)

    assert parsed.get("title")

    slot = (parsed.get("combat_bonuses") or {}).get("slot")
    assert slot, f"{title}: slot missing"
    assert expected_slot in slot, f"{title}: expected '{expected_slot}' in slot, got '{slot}'"

    styles = (parsed.get("combat_styles") or {}).get("styles") or []
    assert len(styles) >= min_styles, f"{title}: too few styles"

    for s in styles:
        assert s.get("name")
        assert s.get("weapon_style")

    cs = parsed.get("combat_styles") or {}
    spd = cs.get("attack_speed_ticks")
    rng = cs.get("attack_range_tiles")
    assert isinstance(spd, int) and spd >= exp_speed_min
    assert isinstance(rng, int) and rng >= exp_range_min


def test_item_drops_and_shops_live():
    html_scim = get_html("Dragon_scimitar")
    p_scim = ItemParser().parse(html_scim)
    drops_scim = ((p_scim.get("sources") or {}).get("drops") or [])
    assert isinstance(drops_scim, list) and len(drops_scim) >= 1

    html_ch = get_html("Crystal_halberd")
    p_ch = ItemParser().parse(html_ch)
    drops_ch = ((p_ch.get("sources") or {}).get("drops") or [])
    assert isinstance(drops_ch, list)

    shops_scim = ((p_scim.get("sources") or {}).get("shops") or [])
    assert isinstance(shops_scim, list)
    if shops_scim:
        first = shops_scim[0]
        assert "seller" in first and "price_sold_coins" in first


def test_item_numeric_fields_live():
    html = get_html("Dragon_scimitar")
    p = ItemParser().parse(html)

    for k in ["value_coins", "ge_price_coins", "buy_limit", "daily_volume"]:
        v = p.get(k)
        if v is not None:
            assert isinstance(v, int) and v >= 0

    w = p.get("weight_kg")
    if w is not None:
        assert isinstance(w, (int, float))
