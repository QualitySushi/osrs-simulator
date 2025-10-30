# tools/scraper_v2/parsers/items.py
from __future__ import annotations
import re
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional

from bs4 import BeautifulSoup, Tag  # pip install beautifulsoup4

# --------------------- regex helpers ---------------------
COIN_RE = re.compile(r"([\d,]+)\s*coins?", re.I)
INT_RE = re.compile(r"-?\d+")
FLOAT_RE = re.compile(r"-?\d+(?:\.\d+)?")
TICKS_RE = re.compile(r"(\d+)\s*ticks?", re.I)
RANGE_TILES_RE = re.compile(r"(\d+)\s*tile", re.I)
KG_RE = re.compile(r"([-\d.,]+)\s*kg", re.I)
QTY_RANGE_RE = re.compile(r"^\s*(\d+)\s*[–—-]\s*(\d+)\s*$")  # en/em/hyphen

# --------------------- string utils ----------------------
def _norm_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()

def _text(node: Optional[Tag]) -> str:
    return _norm_ws(node.get_text(" ", strip=True)) if node else ""

def _to_int(s: Any) -> Optional[int]:
    if s is None:
        return None
    if isinstance(s, int):
        return s
    m = INT_RE.search(str(s).replace(",", ""))
    return int(m.group()) if m else None

def _to_float(s: Any) -> Optional[float]:
    if s is None:
        return None
    if isinstance(s, (int, float)):
        return float(s)
    m = FLOAT_RE.search(str(s).replace(",", ""))
    return float(m.group()) if m else None

def _parse_bool(val: str) -> Optional[bool]:
    v = _norm_ws(val).lower()
    if v in ("yes", "true"): return True
    if v in ("no", "false"): return False
    return None

def _parse_coins(s: str) -> Optional[int]:
    s = (s or "").replace("\u00a0", " ")
    m = COIN_RE.search(s)
    if not m: return _to_int(s)
    return _to_int(m.group(1))

def _parse_weight(s: str) -> Optional[float]:
    m = KG_RE.search(s or "")
    return _to_float(m.group(1)) if m else _to_float(s)

def _split_csv(s: str) -> List[str]:
    s = _norm_ws(s)
    if not s: return []
    parts = [p.strip() for p in re.split(r",\s*", s)]
    return [p for p in parts if p]

def _parse_qty_cell(s: str) -> Dict[str, Optional[int]]:
    s = _norm_ws(s)
    if not s:
        return {"min": None, "max": None}
    m = QTY_RANGE_RE.match(s)
    if m:
        return {"min": int(m.group(1)), "max": int(m.group(2))}
    n = _to_int(s)
    return {"min": n, "max": n}

def _restock_to_seconds(s: str) -> Optional[int]:
    s = _norm_ws(s).lower()
    if not s or s in ("-", "n/a"):
        return None
    m = re.search(r"(\d+(?:\.\d+)?)\s*(seconds?|secs?|s)\b", s)
    if m: return int(float(m.group(1)))
    m = re.search(r"(\d+(?:\.\d+)?)\s*(minutes?|mins?|m)\b", s)
    if m: return int(round(float(m.group(1)) * 60))
    m = re.search(r"(\d+(?:\.\d+)?)\s*(hours?|hrs?|h)\b", s)
    if m: return int(round(float(m.group(1)) * 3600))
    return _to_int(s)

def _first_img_src(td: Tag) -> Optional[str]:
    img = td.find("img")
    if not img: return None
    src = img.get("data-src") or img.get("src")
    if not src:
        srcset = img.get("srcset")
        if srcset:
            src = _norm_ws(srcset).split(" ")[0]
    return src

def _find_infobox(soup: BeautifulSoup) -> Optional[Tag]:
    # broadened selector
    return soup.select_one("table.infobox.infobox-item, table.infobox-item, table.infobox, table[class*='infobox']")

def _collect_rows(table: Tag) -> List[Tag]:
    return [tr for tr in table.find_all("tr", recursive=True)]

# --------------------- style & title heuristics ----------------------
STYLE_MAP = {
    # sword/scimitar defaults
    "chop":   ("Slash",  "Accurate",   "Attack"),
    "slash":  ("Slash",  "Aggressive", "Strength"),
    "lunge":  ("Stab",   "Controlled", "Shared"),
    "block":  ("Slash",  "Defensive",  "Defence"),
    # whip
    "flick":   ("Slash", "Accurate",   "Attack"),
    "lash":    ("Slash", "Controlled", "Shared"),
    "deflect": ("Slash", "Defensive",  "Defence"),
    # halberd/2h-ish
    "jab":   ("Stab",  "Accurate",   "Attack"),
    "swipe": ("Slash", "Aggressive", "Strength"),
    "fend":  ("Slash", "Defensive",  "Defence"),
    # ranged
    "accurate":   ("Ranged", "Accurate",  "Ranged"),
    "rapid":      ("Ranged", "Rapid",     "Ranged"),
    "longrange":  ("Ranged", "Longrange", "Ranged/Defence"),
    "long-range": ("Ranged", "Longrange", "Ranged/Defence"),
    "long range": ("Ranged", "Longrange", "Ranged/Defence"),
}

def _infer_slot_from_title(title: Optional[str]) -> Optional[str]:
    t = (title or "").lower()
    weapon_words = ["scimitar","whip","halberd","crossbow","bow","dagger","sword","hasta","maul","godsword","spear","claws","mace","axe","staff"]
    if any(w in t for w in weapon_words):
        return "weapon"
    return None

def _infer_speed_from_title(title: Optional[str]) -> Optional[int]:
    t = (title or "").lower()
    if any(w in t for w in ["scimitar","whip","dagger","claws","axe"]): return 4
    if any(w in t for w in ["longsword","sword"]): return 5
    if any(w in t for w in ["halberd","hasta","crossbow","xbow","godsword"]): return 6
    if "2h" in t or "two-handed" in t or "maul" in t or "warhammer" in t: return 7
    return None

def _infer_range_tiles_from_title(title: Optional[str]) -> Optional[int]:
    t = (title or "").lower()
    if any(w in t for w in ["halberd","hasta","pike","polearm"]): return 2
    return 1  # melee default

# --------------------- infobox field parsing ----------------------
def _parse_advanced_data(table: Tag) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for tr in table.find_all("tr", recursive=True):
        if "advanced-data" not in (tr.get("class") or []):
            continue
        th, td = tr.find("th"), tr.find("td")
        if th and td and "item id" in _text(th).lower():
            out["item_id"] = _to_int(_text(td))
    return out

def _parse_values_section(rows: List[Tag]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    mapping = {
        "Value": ("value_coins", _parse_coins),
        "High alch": ("high_alch_coins", _parse_coins),
        "Low alch": ("low_alch_coins", _parse_coins),
        "Weight": ("weight_kg", _parse_weight),
        "Exchange": ("ge_price_coins", _parse_coins),
        "Buy limit": ("buy_limit", _to_int),
        "Daily volume": ("daily_volume", _to_int),
        # Speed/Range may live in the infobox:
        "Speed": ("speed_ticks_text", str),
        "Attack speed": ("speed_ticks_text", str),
        "Range": ("range_tiles_text", str),
        "Attack range": ("range_tiles_text", str),
        # Slot row (if present)
        "Equipment slot": ("slot_text", str),
        "Slot": ("slot_text", str),
    }
    for tr in rows:
        th, td = tr.find("th"), tr.find("td")
        if not (th and td): continue
        key, val = _text(th), _text(td)
        for label, (dst, fn) in mapping.items():
            if label.lower() == key.lower():
                out[dst] = fn(val) if fn is not str else val
    return out

def _derive_speed_from_values(values: Dict[str, Any]) -> Optional[int]:
    s = values.get("speed_ticks_text")
    if not s: return None
    m = re.search(r"(\d+)", s)
    return _to_int(m.group(1)) if m else None

def _derive_range_from_values(values: Dict[str, Any]) -> Optional[int]:
    s = values.get("range_tiles_text")
    if not s: return None
    m = re.search(r"(\d+)", s)
    return _to_int(m.group(1)) if m else None

def _derive_slot_from_values(values: Dict[str, Any]) -> Optional[str]:
    s = values.get("slot_text")
    return _norm_ws(s).lower() if s else None

def _parse_header_image(table: Tag) -> Optional[str]:
    img_td = table.select_one("td.infobox-image, td.inventory-image, td.infobox-full-width-content")
    if img_td:
        src = _first_img_src(img_td)
        if src: return src
    for img in table.find_all("img"):
        return img.get("data-src") or img.get("src")
    return None

# --------------------- bonuses & styles ----------------------
def _read_row_numbers(tr: Tag) -> List[int]:
    vals = []
    for td in tr.find_all("td"):
        n = _to_int(_text(td))
        if n is not None: vals.append(n)
    return vals

def _parse_combat_bonuses(soup: BeautifulSoup) -> Dict[str, Any]:
    """
    Parse the infobox-bonuses table and derive slot from the 'Other bonuses → Slot' link HREF
    (the link text is often just 'List', so we must use href).
    """
    out: Dict[str, Any] = {"attack": {}, "defence": {}, "other": {}, "slot": None}
    table = soup.select_one("table.infobox-bonuses")
    if not table:
        return out
    rows = table.find_all("tr")

    def _idx(lbl: str) -> int:
        for i, tr in enumerate(rows):
            if lbl.lower() in _text(tr).lower():
                return i
        return -1

    def _row_nums(tr: Tag) -> List[int]:
        vals = []
        for td in tr.find_all("td"):
            n = _to_int(_text(td))
            if n is not None:
                vals.append(n)
        return vals

    atk_i = _idx("Attack bonuses")
    def_i = _idx("Defence bonuses")
    oth_i = _idx("Other bonuses")

    # Attack
    if atk_i != -1:
        # Look within the next few rows for a 5-number row
        for j in range(atk_i + 1, min(atk_i + 6, len(rows))):
            nums = _row_nums(rows[j])
            if len(nums) >= 5:
                out["attack"] = {"stab": nums[0], "slash": nums[1], "crush": nums[2], "magic": nums[3], "ranged": nums[4]}
                break

    # Defence
    if def_i != -1:
        for j in range(def_i + 1, min(def_i + 6, len(rows))):
            nums = _row_nums(rows[j])
            if len(nums) >= 5:
                out["defence"] = {"stab": nums[0], "slash": nums[1], "crush": nums[2], "magic": nums[3], "ranged": nums[4]}
                break

    # Other + Slot
    if oth_i != -1:
        # Walk forward to find: one row with headers (may be empty), then a row with 4 numeric cells + a slot cell
        # On Dragon scimitar, the numbers appear two rows after 'Other bonuses'
        slot_val = None
        num_row = None

        # scan next ~4 rows for numbers and slot link
        for j in range(oth_i + 1, min(oth_i + 6, len(rows))):
            tds = rows[j].find_all("td")
            if not tds:
                continue
            # last cell may contain the Slot 'List' link
            last = tds[-1] if tds else None
            link = last.find("a") if last else None
            href = (link.get("href") if link else "") or ""

            if href:
                href_lc = href.lower()
                if "2h_slot_table" in href_lc:
                    slot_val = "2h"
                elif "weapon_slot_table" in href_lc:
                    slot_val = "weapon"  # mainhand weapon
                elif "shield_slot_table" in href_lc:
                    slot_val = "offhand"
                elif "head_slot_table" in href_lc:
                    slot_val = "head"
                elif "body_slot_table" in href_lc:
                    slot_val = "body"
                elif "legs_slot_table" in href_lc:
                    slot_val = "legs"
                elif "feet_slot_table" in href_lc:
                    slot_val = "feet"
                elif "hands_slot_table" in href_lc:
                    slot_val = "hands"
                elif "cape_slot_table" in href_lc:
                    slot_val = "cape"
                elif "neck_slot_table" in href_lc:
                    slot_val = "neck"
                elif "ring_slot_table" in href_lc:
                    slot_val = "ring"
                elif "ammo_slot_table" in href_lc or "ammunition_slot_table" in href_lc:
                    slot_val = "ammo"

            # try to read Other numbers from this same row if present (common)
            nums = [_text(td) for td in tds]
            # other row often has: Strength, Ranged str, Magic dmg %, Prayer, Slot
            if len(nums) >= 4:
                str_b = _to_int(nums[0])
                rng_str = _to_int(nums[1])
                mag_dmg = _to_float(nums[2].replace("%", "")) if nums[2] else None
                prayer = _to_int(nums[3])
                num_row = {"strength": str_b, "ranged_strength": rng_str, "magic_damage_percent": mag_dmg, "prayer": prayer}

            if slot_val and num_row:
                break

        if num_row:
            out["other"] = num_row
        if slot_val:
            out["slot"] = slot_val

    return out


def _parse_combat_styles_table(soup: BeautifulSoup) -> Dict[str, Any]:
    """
    Parse the 'wikitable combat-styles' which uses a header row at index 1,
    and rowspans so only the first data row has 'Attack speed' and 'Range'.
    We capture speed/range from ANY row that has it, then fill once globally.
    """
    result: Dict[str, Any] = {"attack_speed_ticks": None, "attack_range_tiles": None, "styles": []}
    table = soup.select_one("table.wikitable.combat-styles")
    if not table:
        return result

    rows = table.find_all("tr")
    if len(rows) < 3:
        return result

    # The second row (index 1) contains the headers (first row is often mw-empty-elt)
    hdr_ths = rows[1].find_all("th")
    hdrs = [(_text(th) or "").lower() for th in hdr_ths]
    # Expected headers include: Combat style | Attack type | Weapon style | Attack speed | Range | Experience | Level boost
    # We won't rely on positions strictly; we read per-td in order and interpret.

    speed_seen = False
    range_seen = False

    for tr in rows[2:]:
        tds = tr.find_all("td")
        if not tds:
            continue
        # Typical shapes:
        # - First data row: 8 tds (icon, name, attack type, weapon style, speed, range, experience, boost)
        # - Subsequent rows: 6 tds (icon, name, attack type, weapon style, experience, boost)
        cells = [_text(td) for td in tds]

        # Normalize cell access
        # Always: [0]=icon, [1]=style name, [2]=attack type, [3]=weapon style
        name = cells[1] if len(cells) > 1 else None
        atk_type = cells[2] if len(cells) > 2 else None
        wstyle = cells[3] if len(cells) > 3 else None

        # If present on this row:
        speed_txt = None
        range_txt = None
        xp_txt = None
        boost_txt = None

        if len(cells) >= 8:
            # Full row
            speed_txt = cells[4]
            range_txt = cells[5]
            xp_txt = cells[6]
            boost_txt = cells[7] if len(cells) > 7 else None
        elif len(cells) >= 6:
            # Compact row (no speed/range)
            xp_txt = cells[4]
            boost_txt = cells[5]

        # Store global speed / range the first time we can parse them
        if speed_txt and not speed_seen:
            m = TICKS_RE.search(speed_txt)
            if m:
                result["attack_speed_ticks"] = _to_int(m.group(1))
                speed_seen = True
        if range_txt and not range_seen:
            m = RANGE_TILES_RE.search(range_txt)
            if m:
                result["attack_range_tiles"] = _to_int(m.group(1))
                range_seen = True

        # Normalize XP to clean labels: turn " +3 Attack " → "Attack"
        xp_clean = None
        if xp_txt:
            # Common patterns: "+3 Attack", "+3 Strength", "+1 Attack, Strength, Defence", or empty
            xp_lower = xp_txt.lower()
            if "attack" in xp_lower or "strength" in xp_lower or "defence" in xp_lower or "shared" in xp_lower:
                # Keep the wiki’s wording useful to your UI; if you prefer enums, map here.
                xp_clean = xp_txt

        result["styles"].append({
            "name": name or None,
            "attack_type": atk_type or None,
            "weapon_style": wstyle or None,
            "xp": xp_clean,
            "level_boost": (boost_txt or None)
        })

    return result


def _parse_special_attack(soup: BeautifulSoup) -> Optional[str]:
    h2 = soup.find("span", id="Special_attack")
    if not h2: return None
    for sib in h2.parent.next_siblings:
        if isinstance(sib, Tag):
            if sib.name == "h2": break
            if sib.name == "p":
                txt = _text(sib)
                if txt: return txt
    return None

# --------------------- sources (drops/shops) ----------------------
def _extract_drop_attrs(tr: Tag) -> Dict[str, str]:
    attrs: Dict[str, str] = {}
    for el in [tr, *tr.find_all(True)]:
        for k, v in (el.attrs or {}).items():
            if isinstance(v, list): continue
            if k.startswith("data-drop-") and v:
                attrs[k] = v
    return attrs

def _parse_oneover_from_text(txt: str) -> Optional[int]:
    txt = (txt or "").replace(",", "")
    m = re.search(r"(\d+)\s*/\s*(\d+)", txt)
    if m:
        return int(m.group(2))  # denominator
    m = re.search(r"1\s*/\s*(\d+(?:\.\d+)?)", txt)
    if m:
        try: return int(float(m.group(1)))
        except ValueError: return None
    return None

def _parse_percent_from_text(txt: str) -> Optional[float]:
    m = re.search(r"(\d+(?:\.\d+)?)\s*%", txt or "")
    return float(m.group(1)) if m else None

def _parse_item_sources(soup: BeautifulSoup) -> Dict[str, Any]:
    out: Dict[str, Any] = {"drops": [], "shops": []}

    # Use :-soup-contains to avoid deprecation warning
    drops_table = soup.select_one(
        ",".join([
            "table.wikitable.item-drops",
            "table.wikitable.smalltext.item-drops",
            "table.wikitable.drops",
            "table.item-drops.wikitable",
            "table.wikitable:has(th:-soup-contains('Source')):has(th:-soup-contains('Rarity'))"
        ])
    )
    if drops_table:
        rows = drops_table.find_all("tr")
        header_map: Dict[str, int] = {}
        if rows:
            headers = [_text(th).lower() for th in rows[0].find_all(["th", "td"])]
            for i, h in enumerate(headers): header_map[h] = i
        idx_source = next((i for h,i in header_map.items() if "source" in h or "monster" in h), 0)
        idx_qty    = next((i for h,i in header_map.items() if "quantity" in h or "qty" in h), 2)
        idx_rarity = next((i for h,i in header_map.items() if "rarity" in h or "rate" in h or "chance" in h), 3)

        for tr in rows[1:]:
            tds = tr.find_all("td")
            if len(tds) < max(idx_source, idx_qty, idx_rarity) + 1: continue
            source    = _text(tds[idx_source])
            qty_cell  = _text(tds[idx_qty])
            rarity_txt= _text(tds[idx_rarity])
            qty = _parse_qty_cell(qty_cell)
            attrs = _extract_drop_attrs(tr)

            raw_oneover = attrs.get("data-drop-oneover") or attrs.get("data-drop-fraction")
            one_over = None
            if raw_oneover:
                if "/" in raw_oneover:
                    one_over = _parse_oneover_from_text(raw_oneover)
                else:
                    one_over = _to_int(raw_oneover)
            percent = _to_float(attrs.get("data-drop-percent"))

            if one_over is None: one_over = _parse_oneover_from_text(rarity_txt)
            if percent  is None: percent  = _parse_percent_from_text(rarity_txt)

            out["drops"].append({
                "source": source or None,
                "quantity": qty,
                "rarity_text": rarity_txt or None,
                "rate": {"one_over": one_over, "percent": percent},
                "attrs": attrs or None
            })

    shops_table = soup.select_one("table.wikitable.store-locations-list, table.wikitable.item-stores")
    if shops_table:
        for tr in shops_table.find_all("tr")[1:]:
            tds = tr.find_all("td")
            if len(tds) < 6: continue
            seller = _text(tds[0])
            location = _text(tds[1])
            in_stock = _to_int(_text(tds[2]))
            restock_raw = _text(tds[3])
            restock_seconds = _restock_to_seconds(restock_raw)
            price_sold = _parse_coins(_text(tds[4]))
            price_buy  = _parse_coins(_text(tds[5]))
            out["shops"].append({
                "seller": seller or None,
                "location": location or None,
                "stock": in_stock,
                "restock_time": restock_raw or None,
                "restock_seconds": restock_seconds,
                "price_sold_coins": price_sold,
                "price_bought_coins": price_buy
            })
    return out

# --------------------- dataclass & main parser ----------------------
@dataclass
class ParsedItem:
    title: Optional[str] = None
    item_id: Optional[int] = None
    members: Optional[bool] = None
    quest_item: Optional[bool] = None
    tradeable: Optional[bool] = None
    equipable: Optional[bool] = None
    stackable: Optional[bool] = None
    noteable: Optional[bool] = None
    options: Optional[List[str]] = None
    examine: Optional[str] = None
    released: Optional[str] = None
    value_coins: Optional[int] = None
    high_alch_coins: Optional[int] = None
    low_alch_coins: Optional[int] = None
    weight_kg: Optional[float] = None
    ge_price_coins: Optional[int] = None
    buy_limit: Optional[int] = None
    daily_volume: Optional[int] = None
    image_src: Optional[str] = None
    combat_bonuses: Optional[Dict[str, Any]] = None
    combat_styles: Optional[Dict[str, Any]] = None
    special_attack: Optional[str] = None
    sources: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if d.get("options") == []:
            d["options"] = None
        if d.get("sources") == {"drops": [], "shops": []}:
            d["sources"] = None
        return d

class ItemParser:
    """Parse OSRS Wiki item HTML ('parse.text.*') into a structured dict."""

    def parse(self, html: str) -> Dict[str, Any]:
        soup = BeautifulSoup(html, "html.parser")

        title = None
        h = soup.select_one("table.infobox th.infobox-header")
        if h: title = _text(h)
        if not title:
            first_h = soup.find(["h1","h2"])
            title = _text(first_h) or None

        infobox = _find_infobox(soup)
        rows = _collect_rows(infobox) if infobox else []

        props  = _parse_properties_section(rows) if rows else {}
        values = _parse_values_section(rows)    if rows else {}
        adv    = _parse_advanced_data(infobox)  if infobox else {}
        image_src = _parse_header_image(infobox) if infobox else None

        combat = _parse_combat_bonuses(soup)
        styles = _parse_combat_styles_table(soup)

        # --- Fill slot/speed/range from infobox text if styles missed them ---
        if styles and not styles.get("attack_speed_ticks"):
            sp = _derive_speed_from_values(values)
            if sp is not None: styles["attack_speed_ticks"] = sp
        if styles and not styles.get("attack_range_tiles"):
            rt = _derive_range_from_values(values)
            if rt is not None: styles["attack_range_tiles"] = rt

        # Slot priority: combat_bonuses -> infobox row -> title heuristic
        if not combat.get("slot"):
            slot_from_values = _derive_slot_from_values(values)
            if slot_from_values:
                combat["slot"] = slot_from_values
        if not combat.get("slot"):
            slot_guess = _infer_slot_from_title(title)
            if slot_guess:
                combat["slot"] = slot_guess

        # If still missing speed/range and looks like a weapon, infer from title
        if styles and styles.get("attack_speed_ticks") is None and combat.get("slot") == "weapon":
            sp2 = _infer_speed_from_title(title)
            if sp2 is not None: styles["attack_speed_ticks"] = sp2
        if styles and styles.get("attack_range_tiles") is None and combat.get("slot") == "weapon":
            rt2 = _infer_range_tiles_from_title(title)
            if rt2 is not None: styles["attack_range_tiles"] = rt2

        special = _parse_special_attack(soup)
        sources = _parse_item_sources(soup)

        item = ParsedItem(
            title=title,
            item_id=adv.get("item_id"),
            members=props.get("members"),
            quest_item=props.get("quest_item"),
            tradeable=props.get("tradeable"),
            equipable=props.get("equipable"),
            stackable=props.get("stackable"),
            noteable=props.get("noteable"),
            options=props.get("options"),
            examine=props.get("examine"),
            released=props.get("released"),
            value_coins=values.get("value_coins"),
            high_alch_coins=values.get("high_alch_coins"),
            low_alch_coins=values.get("low_alch_coins"),
            weight_kg=values.get("weight_kg"),
            ge_price_coins=values.get("ge_price_coins"),
            buy_limit=values.get("buy_limit"),
            daily_volume=values.get("daily_volume"),
            image_src=image_src,
            combat_bonuses=combat or None,
            combat_styles=styles or None,
            special_attack=special,
            sources=sources or None,
        )

        if item.combat_bonuses and not any(item.combat_bonuses.values()):
            item.combat_bonuses = None
        if item.combat_styles:
            cs = item.combat_styles
            if not cs.get("styles") and cs.get("attack_speed_ticks") is None and cs.get("attack_range_tiles") is None:
                item.combat_styles = None

        return item.to_dict()

# --------------------- properties section (unchanged) ----------------------
def _parse_properties_section(rows: List[Tag]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    mapping = {
        "Tradeable": ("tradeable", _parse_bool),
        "Equipable": ("equipable", _parse_bool),
        "Stackable": ("stackable", _parse_bool),
        "Noteable": ("noteable", _parse_bool),
        "Options": ("options", _split_csv),
        "Examine": ("examine", str),
        "Members": ("members", _parse_bool),
        "Quest item": ("quest_item", _parse_bool),
        "Released": ("released", str),
    }
    for tr in rows:
        th = tr.find("th"); td = tr.find("td")
        if not (th and td): continue
        key, val = _text(th), _text(td)
        for label, (dst, fn) in mapping.items():
            if label.lower() == key.lower():
                out[dst] = fn(val) if fn is not str else val
    if isinstance(out.get("options"), list) is False and out.get("options"):
        out["options"] = _split_csv(str(out["options"]))
    return out

def _parse_header_image(table: Tag) -> Optional[str]:
    img_td = table.select_one("td.infobox-image, td.inventory-image, td.infobox-full-width-content")
    if img_td:
        src = _first_img_src(img_td)
        if src: return src
    for img in table.find_all("img"):
        return img.get("data-src") or img.get("src")
    return None
