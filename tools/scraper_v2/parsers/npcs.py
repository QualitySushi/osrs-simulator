# tools/scraper_v2/parsers/npcs.py
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple

from bs4 import BeautifulSoup


@dataclass
class NpcDoc:
    title: str
    name: Optional[str]
    combat_level: Optional[int]
    hitpoints: Optional[int]
    max_hit: Optional[int]
    attributes: Dict[str, Any]
    drops: List[Dict[str, Any]]
    lineage: Optional[Dict[str, Any]]


def _int_or_none(text: Optional[str]) -> Optional[int]:
    if not text:
        return None
    # Keep first number we see
    n = ""
    for ch in text:
        if ch.isdigit():
            n += ch
        elif n:
            break
    return int(n) if n else None


def _first_text(cell) -> str:
    if cell is None:
        return ""
    return " ".join(cell.get_text(" ", strip=True).split())


def _extract_infobox_numbers(soup: BeautifulSoup) -> Tuple[Optional[int], Optional[int], Optional[int]]:
    lvl = hp = max_hit = None
    info = soup.select_one("table.infobox, table.infobox-npc, table.infobox-entity")
    if not info:
        return None, None, None

    for row in info.select("tr"):
        th = row.find("th")
        td = row.find("td")
        if not th or not td:
            continue
        label = _first_text(th).lower()
        val = _first_text(td)

        if "combat level" in label or label == "level":
            lvl = _int_or_none(val)
        elif "hitpoints" in label or "lifepoints" in label:
            hp = _int_or_none(val)
        elif "max hit" in label or label.startswith("max"):
            max_hit = _int_or_none(val)

    return lvl, hp, max_hit


def _guess_title(soup: BeautifulSoup) -> Optional[str]:
    h1 = soup.select_one("#firstHeading") or soup.select_one("h1")
    t = _first_text(h1)
    return t or None


def _extract_attributes(soup: BeautifulSoup) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    info = soup.select_one("table.infobox, table.infobox-npc, table.infobox-entity")
    if not info:
        return out

    for row in info.select("tr"):
        th = row.find("th")
        td = row.find("td")
        if not th or not td:
            continue
        label = _first_text(th).strip(":")
        val = _first_text(td)
        if not label:
            continue
        lower = label.lower()
        if any(k in lower for k in ("combat level", "hitpoints", "max hit")):
            # already parsed numerics separately
            continue
        out[label] = val
    return out


class NpcParser:
    """HTML-first NPC parser used by build_from_targets."""

    def parse(self, html: str, *, title_hint: Optional[str] = None,
              drops: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        soup = BeautifulSoup(html, "html.parser")

        title = title_hint or _guess_title(soup) or "__unknown__"
        name = title  # keep simple: title is the display name
        lvl, hp, max_hit = _extract_infobox_numbers(soup)
        attributes = _extract_attributes(soup)

        doc = NpcDoc(
            title=title,
            name=name,
            combat_level=lvl,
            hitpoints=hp,
            max_hit=max_hit,
            attributes=attributes,
            drops=drops or [],
            lineage=None,
        )
        return asdict(doc)
