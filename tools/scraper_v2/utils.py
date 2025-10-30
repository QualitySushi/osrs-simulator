# tools/scraper_v2/utils.py
from __future__ import annotations
import re
from typing import Any, Dict, Optional
from bs4 import BeautifulSoup, Tag

_INT = re.compile(r"-?\d+")
_FLOAT = re.compile(r"-?\d+(?:\.\d+)?")

def to_int(x: Any) -> Optional[int]:
    if x is None:
        return None
    if isinstance(x, int):
        return x
    s = str(x).replace(",", "")
    m = _INT.search(s)
    return int(m.group()) if m else None

def num_or_none(x: Any) -> Optional[float]:
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).replace(",", "")
    m = _FLOAT.search(s)
    return float(m.group()) if m else None

def wkt_first_template(soup: BeautifulSoup, name: str) -> Optional[Tag]:
    """
    Return the first 'template-like' element by heuristic. Some of your older
    scrapers searched for wiki templates; here we just try common containers.
    """
    # try exact id
    el = soup.find(id=name) or soup.find("span", {"id": name})
    if el:
        return el
    # otherwise try headings that contain the name
    for hx in ["h2", "h3", "h4"]:
        h = soup.find(hx, string=lambda t: t and name.replace("_", " ").lower() in str(t).lower())
        if h:
            return h
    return None

def wkt_dict(rows: list[Tag]) -> Dict[str, str]:
    """
    Turn a list of <tr> rows into a {header: value} dict (simple infobox helper).
    """
    out: Dict[str, str] = {}
    for tr in rows:
        th = tr.find("th")
        td = tr.find("td")
        if not (th and td):
            continue
        key = " ".join(th.get_text(" ", strip=True).split())
        val = " ".join(td.get_text(" ", strip=True).split())
        if key:
            out[key] = val
    return out
