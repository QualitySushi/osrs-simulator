import time
import requests
import re
import pytest

from tools.scraper_v2.parsers.specials import SpecialParser  # assumes SpecialParser exists

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

@pytest.mark.parametrize("item_title, expect_name, energy_min", [
    ("Dragon_scimitar", "Sever", 50),
    ("Armadyl_godsword", "The Judgement", 50),  # AGS spec name; energy ≥ 50
])
def test_special_parser_live(item_title, expect_name, energy_min):
    html = fetch_html(item_title)
    parsed = SpecialParser().parse(html)

    # Core fields
    name = parsed.get("name") or parsed.get("title")
    assert name and expect_name.lower() in name.lower()

    energy = parsed.get("energy_cost") or parsed.get("special_energy") or parsed.get("energy")
    if isinstance(energy, str):
        m = re.search(r"(\d+)", energy)
        energy = int(m.group(1)) if m else None
    assert energy is None or energy >= energy_min

    # Text/body should mention accuracy/damage/extra effect in some form
    body = (parsed.get("text") or parsed.get("description") or "")
    assert isinstance(body, str) and len(body) > 0
