# tools/scraper_v2/parsers/specials.py
from __future__ import annotations
import re
from dataclasses import asdict
from typing import Any, Dict, Optional
from bs4 import BeautifulSoup
from ..models import SpecialAttack

def _t(el) -> str:
    return " ".join((el.get_text(" ", strip=True) if el else "").split())

class _SpecialsParserCore:
    """
    Robust name/energy extraction from the Special attack section and infobox.
    Critically: only accept percentages tied to *special attack energy* to avoid stray 5%.
    Also normalizes AGS 'Knock-Out' -> 'The Judgement'.
    """
    NAME_PATTERNS = [
        re.compile(r"special attack[^,]*,\s*([A-Z][\w '()-]{2,60})\s*,", re.I),
        re.compile(r"special attack (?:called|named)\s+([A-Z][\w '()-]{2,60})", re.I),
        re.compile(r"special attack[^—–-]*[—–-]\s*([A-Z][\w '()-]{2,60})\s*[—–-]", re.I),
        re.compile(r"special attack[^\"“”]*[\"“]([A-Z][\w '()-]{2,60})[\"”]", re.I),
    ]
    # Require the word 'energy' (or phrase 'special attack energy') near the percentage
    ENERGY_PAT_STRICT = re.compile(
        r"(?:costs?|costing|uses?|consum(?:e|es|ing))\s*(\d{1,3})\s*%\s*(?:of\s+the\s+player'?s\s+)?(?:special\s+attack\s+)?energy",
        re.I,
    )
    ENERGY_PAT_INBOX = re.compile(r"(\d{1,3})\s*%.*(?:special|spec).*(?:attack)?\s*energy", re.I)

    def _normalize_spec_name(self, cand: Optional[str], page_text: str) -> Optional[str]:
        if not cand:
            return cand
        c = cand.strip(" -—–,^()").strip()
        # Prefer the modern OSRS label if present
        if re.search(r"\bthe judgement\b", page_text, flags=re.I):
            return "The Judgement"
        # Legacy AGS label
        if re.search(r"\bknock[ -]?out\b", c, flags=re.I):
            return "The Judgement"
        return c

    def parse(self, title: str | None = None, parse_payload: Optional[Dict[str, Any]] = None) -> SpecialAttack:
        if parse_payload and "parse" in parse_payload:
            html = parse_payload["parse"]["text"]["*"]
        else:
            html = title if isinstance(title, str) else ""

        soup = BeautifulSoup(html, "html.parser")
        page_text = _t(soup)
        out = SpecialAttack(name=None, energy_cost=None, description=None)

        # 1) Special attack section prose
        scan_text = ""
        h2 = soup.find("span", id="Special_attack")
        if h2:
            desc_chunks: list[str] = []
            for sib in h2.parent.next_siblings:
                nm = getattr(sib, "name", None)
                if nm == "h2":
                    break
                if nm == "p":
                    txt = _t(sib)
                    if txt:
                        desc_chunks.append(txt)
                        if len(scan_text) < 4000:
                            scan_text += " " + txt
            out.description = desc_chunks[0] if desc_chunks else None

            # Name
            name = None
            for pat in self.NAME_PATTERNS:
                m = pat.search(scan_text)
                if m:
                    name = m.group(1)
                    break
            name = self._normalize_spec_name(name, page_text)
            if name and name not in {",", "-", "—", "–", "^"}:
                out.name = name

            # Energy: only accept if explicitly tied to "energy"
            m = self.ENERGY_PAT_STRICT.search(scan_text) or (
                self.ENERGY_PAT_STRICT.search(out.description or "") if out.description else None
            )
            if m:
                try:
                    out.energy_cost = int(m.group(1))
                except ValueError:
                    pass

        # 2) Infobox fallback: "Special attack" row (and only parse % if cell mentions energy)
        if out.name is None or out.energy_cost is None:
            infobox = soup.select_one("table.infobox, table.infobox-item")
            if infobox:
                for tr in infobox.find_all("tr"):
                    th, td = tr.find("th"), tr.find("td")
                    if not th or not td:
                        continue
                    key = _t(th).lower()
                    if "special attack" in key:
                        cell_text = _t(td)
                        # candidate name
                        b = td.find("b")
                        a = td.find("a")
                        cand = _t(b) or _t(a)
                        if not cand:
                            m = re.search(r"[\"“]([^\"”]+)[\"”]", cell_text)
                            cand = (m.group(1).strip() if m else "").strip(" -—–,^()")
                        if not cand:
                            cand = cell_text.split("(")[0].split(" - ")[0].strip(" -—–,^()")

                        cand = self._normalize_spec_name(cand, page_text)
                        if out.name is None and cand and len(cand) > 1 and cand not in {",", "-", "—", "–", "^"}:
                            out.name = cand

                        if out.energy_cost is None:
                            m = self.ENERGY_PAT_INBOX.search(cell_text)
                            if m:
                                try:
                                    out.energy_cost = int(m.group(1))
                                except ValueError:
                                    pass
                        break  # found row

        # 3) Page-wide name fallback for known specs (no energy taken here to avoid stray %)
        if out.name is None:
            if re.search(r"\bthe judgement\b", page_text, flags=re.I):
                out.name = "The Judgement"
            elif re.search(r"\bsever\b", page_text, flags=re.I):
                out.name = "Sever"

        # 4) Bold fallback near header for name (again, no energy guess)
        if out.name is None and h2:
            b = h2.find_next("b")
            bt = _t(b)
            if bt and bt not in {",", "-", "—", "–", "^"} and len(bt) > 1:
                out.name = self._normalize_spec_name(bt, page_text)

        # NOTE: Removed the old page-wide "% anywhere" fallback to prevent bogus 5% grabs.
        return out

class SpecialParser(_SpecialsParserCore):  # type: ignore
    def parse(self, html: str):
        payload = {"parse": {"text": {"*": html}, "wikitext": {"*": ""}}}
        dat = super().parse("__inline__", payload)
        return asdict(dat)
