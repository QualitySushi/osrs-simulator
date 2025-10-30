# backend/app/testing/test_scrapers.py
import json
import os
import re
import time
from pathlib import Path

import pytest
import requests

# ---- Parsers under test (adjust import paths if different) ----
from tools.scraper_v2.parsers.items import ItemParser
# If you have these, uncomment and add assertions below as you expand:
# from tools.scraper_v2.parsers.npcs import NpcParser
# from tools.scraper_v2.parsers.prayers import PrayerParser
# from tools.scraper_v2.parsers.specials import SpecialParser
# from tools.scraper_v2.parsers.drops import parse_drop_table


UA = {"User-Agent": "ScapeLab test suite"}
WIKI_API = "https://oldschool.runescape.wiki/api.php"
FIXTURES_DIR = Path(__file__).parent / "fixtures"
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)


def fetch_page_html(title: str) -> str:
    """
    Fetch HTML from OSRS Wiki parse API (item/NPC page) with polite headers.
    Retries lightly on transient errors. Returns the 'parse.text[*]' HTML.
    """
    params = {"action": "parse", "page": title, "prop": "text", "format": "json"}
    delay = 0.5
    for attempt in range(3):
        try:
            r = requests.get(WIKI_API, params=params, headers=UA, timeout=20)
            r.raise_for_status()
            return r.json()["parse"]["text"]["*"]
        except Exception:
            if attempt == 2:
                raise
            time.sleep(delay)
            delay *= 2


def load_fixture_html(name: str) -> str:
    """
    Load a fixture from backend/app/testing/fixtures/<name>.json where the file
    contains a JSON with {"html": "<parse.text[*]>"} or a direct string.
    """
    p = FIXTURES_DIR / name
    if not p.exists():
        raise FileNotFoundError(p)
    with p.open("r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            if isinstance(data, dict) and "html" in data:
                return data["html"]
            if isinstance(data, str):
                return data
        except json.JSONDecodeError:
            # raw HTML string
            return f.read()
    raise ValueError(f"Fixture format not recognized: {p}")


def get_html(title: str, fixture: str | None = None) -> str:
    """
    Choose fixture if provided and exists; otherwise fetch live.
    """
    if fixture:
        try:
            return load_fixture_html(fixture)
        except FileNotFoundError:
            pass
    return fetch_page_html(title)


# --------------------------- Item parser tests ---------------------------

@pytest.mark.parametrize("title, expected_slot, min_styles, exp_speed_range", [
    # exp_speed_range = (speed_min, range_min)
    ("Dragon_scimitar", "weapon", 3, (4, 1)),
    ("Abyssal_whip",    "weapon", 3, (4, 1)),
    ("Rune_crossbow",   "weapon", 3, (5, 5)),  # usually 6/7 depending on page wording; just assert >=5
    ("Crystal_halberd", "2h",     3, (6, 1)),  # speed >=6, melee range >=1 (often 2)
])
def test_item_parser_core_fields_live(title, expected_slot, min_styles, exp_speed_range):
    html = get_html(title)
    parsed = ItemParser().parse(html)

    # Title present
    assert parsed.get("title"), f"{title}: missing title"

    # Slot is set (weapon/2h/offhand/etc.)
    slot = (parsed.get("combat_bonuses") or {}).get("slot")
    assert slot, f"{title}: slot was not parsed"
    assert expected_slot in slot, f"{title}: expected slot to contain '{expected_slot}', got '{slot}'"

    # Styles present and at least N entries
    styles = (parsed.get("combat_styles") or {}).get("styles") or []
    assert len(styles) >= min_styles, f"{title}: not enough styles parsed"

    # Weapon style names are non-empty for all parsed rows
    for s in styles:
        assert s.get("name"), f"{title}: style has no name"
        assert s.get("weapon_style"), f"{title}: style '{s.get('name')}' missing weapon_style"

    # Attack speed and range look reasonable (we only check minimums to be tolerant)
    cs = parsed.get("combat_styles") or {}
    spd = cs.get("attack_speed_ticks")
    rng = cs.get("attack_range_tiles")

    assert isinstance(spd, int), f"{title}: attack_speed_ticks not int: {spd!r}"
    assert isinstance(rng, int), f"{title}: attack_range_tiles not int: {rng!r}"

    spd_min, rng_min = exp_speed_range
    assert spd >= spd_min, f"{title}: speed too low ({spd})"
    assert rng >= rng_min, f"{title}: range too low ({rng})"


def test_item_parser_drops_and_shops_live():
    """
    Sanity: items with known drops should have non-zero drops; items without
    drops may still have shops data.
    """
    # Known: Dragon scimitar has drops on its item page
    html_scim = get_html("Dragon_scimitar")
    p_scim = ItemParser().parse(html_scim)
    drops_scim = ((p_scim.get("sources") or {}).get("drops") or [])
    assert len(drops_scim) >= 1, "Dragon scimitar: expected drops on item page"

    # Known: Crystal halberd usually has no item-drops; ensure parser doesn't error
    html_ch = get_html("Crystal_halberd")
    p_ch = ItemParser().parse(html_ch)
    drops_ch = ((p_ch.get("sources") or {}).get("drops") or [])
    assert isinstance(drops_ch, list), "Crystal halberd: drops should be a list (possibly empty)"

    # Shops table should parse when present (Daga's Scimitar Smithy for scimitar)
    shops_scim = ((p_scim.get("sources") or {}).get("shops") or [])
    assert isinstance(shops_scim, list), "Dragon scimitar: shops should be a list (possibly empty)"
    if shops_scim:
        first = shops_scim[0]
        assert "seller" in first and "price_sold_coins" in first, "Shop row missing expected keys"


def test_item_parser_numeric_fields_live():
    # Check a couple of common fields are numeric when present
    html = get_html("Dragon_scimitar")
    p = ItemParser().parse(html)

    val = p.get("value_coins")
    if val is not None:
        assert isinstance(val, int) and val >= 0

    ge = p.get("ge_price_coins")
    if ge is not None:
        assert isinstance(ge, int) and ge >= 0

    w = p.get("weight_kg")
    if w is not None:
        assert isinstance(w, (int, float))


# ----------------------- Fixture-based (optional) ------------------------

def test_item_parser_fixture_if_present():
    """
    If you drop a fixture at backend/app/testing/fixtures/dragon_scimitar.json
    containing either {"html": "<parse.text[*]>"} or a raw string, we’ll test
    with it as well. This allows running without network.
    """
    fx = FIXTURES_DIR / "dragon_scimitar.json"
    if not fx.exists():
        pytest.skip("Fixture not present")
    html = load_fixture_html("dragon_scimitar.json")
    p = ItemParser().parse(html)
    assert p.get("title")
    slot = (p.get("combat_bonuses") or {}).get("slot")
    assert slot and "weapon" in slot
    cs = p.get("combat_styles") or {}
    assert isinstance(cs.get("attack_speed_ticks"), int)
    assert len(cs.get("styles") or []) >= 3


# -------------------------- Rate limiting guard --------------------------

@pytest.fixture(autouse=True, scope="module")
def _polite_delay_between_network_calls():
    """
    Keep it polite for CI/live runs: small delay between network calls.
    """
    yield
    time.sleep(0.3)
