# tools/scraper_v2/parsers/drops.py
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
from bs4 import BeautifulSoup


def _first_text(el) -> str:
    if el is None:
        return ""
    return " ".join(el.get_text(" ", strip=True).split())


def _likely_drop_table(tbl) -> bool:
    cls = " ".join(tbl.get("class", []))
    if "wikitable" not in cls:
        return False
    # common headers found in OSRS Wiki drop tables
    heads = [h.get_text(" ", strip=True).lower() for h in tbl.select("th")]
    score = 0
    for needle in ("drop", "item", "quantity", "rarity", "notes"):
        if any(needle in h for h in heads):
            score += 1
    return score >= 2


def _parse_qty(text: str) -> Optional[str]:
    # Keep as string (e.g., "1–3", "Noted (1)", etc.) to avoid lossy transforms
    t = text.strip()
    return t or None


def parse_drop_table(html: str) -> List[Dict[str, Any]]:
    """
    Parse the best drop table we can find on the page.
    Returns a list of {item, quantity, rarity, notes}.
    """
    soup = BeautifulSoup(html, "html.parser")
    candidates = soup.select("table.wikitable")
    drops: List[Dict[str, Any]] = []

    # Prefer tables near "Drops"/"Drop table" headings
    scored: List[Tuple[int, Any]] = []
    for tbl in candidates:
        score = 0
        if _likely_drop_table(tbl):
            score += 2
        # proximity to "Drops" section
        prev = tbl.find_previous(["h2", "h3"])
        if prev:
            htxt = _first_text(prev).lower()
            if "drop" in htxt:
                score += 2
        scored.append((score, tbl))

    if not scored:
        return drops

    # Choose highest score; if tie, first occurrence
    scored.sort(key=lambda x: x[0], reverse=True)
    best_tbl = scored[0][1]

    # Identify column indices
    headers = [ _first_text(th).lower() for th in best_tbl.select("tr > th") ]
    col_item = col_qty = col_rarity = col_notes = None
    for idx, h in enumerate(headers):
        if col_item is None and ("item" in h or "drop" in h):
            col_item = idx
        if col_qty is None and ("qty" in h or "quantity" in h or "amount" in h):
            col_qty = idx
        if col_rarity is None and ("rarity" in h or "chance" in h or "rate" in h):
            col_rarity = idx
        if col_notes is None and ("notes" in h or "info" in h or "remarks" in h):
            col_notes = idx

    for tr in best_tbl.select("tr"):
        tds = tr.find_all("td")
        if not tds:
            continue
        # Map across, guarding for missing cols
        def get_col(ci: Optional[int]) -> str:
            if ci is None:
                return ""
            return _first_text(tds[ci]) if ci < len(tds) else ""

        item = get_col(col_item)
        if not item:
            continue

        entry = {
            "item": item,
            "quantity": _parse_qty(get_col(col_qty)),
            "rarity": get_col(col_rarity) or None,
            "notes": get_col(col_notes) or None,
        }
        drops.append(entry)

    return drops
