# backend/app/routers/catalog.py
from __future__ import annotations
import hashlib, json, os, re
from typing import Any, Dict, List, Optional, Tuple, TypedDict

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

try:
    # Preferred when backend/ is on sys.path (your tests do this)
    from db.sqlite_doc import _connect, get_doc, get_docs, json_search, count_table, all_keys
except ImportError:
    # Fallback if imported as a package under app/
    from ..db.sqlite_doc import _connect, get_doc, get_docs, json_search, count_table, all_keys


DATA_DIR = os.getenv("SCRAPER_DATA_DIR", "data/db")
VERSION_FILE = os.path.join(DATA_DIR, "latest_version.json")  # optional

router = APIRouter(prefix="/api", tags=["catalog"])

# ---------- Pydantic models (loose/tolerant for agent use) ----------
class EntityRef(BaseModel):
    key: str
    type: str = Field(pattern="^(item|npc|special)$")

class SearchResult(BaseModel):
    key: str
    type: str
    name: Optional[str] = None
    title: Optional[str] = None
    slot: Optional[str] = None
    style: Optional[str] = None
    combat_level: Optional[int] = None
    meta: Dict[str, Any] = {}

class ContextPack(BaseModel):
    item: Optional[Dict[str, Any]] = None
    npc: Optional[Dict[str, Any]] = None
    special: Optional[Dict[str, Any]] = None
    drops_for_item: List[Dict[str, Any]] = []
    drops_for_npc: List[Dict[str, Any]] = []

# ---------- Helpers ----------
def _version_payload() -> Dict[str, Any]:
    cn = _connect()
    payload = {
        "items": count_table(cn, "items"),
        "npcs": count_table(cn, "npcs"),
        "specials": count_table(cn, "specials"),
        "drops": count_table(cn, "drops"),
    }
    # Hash = quick cache key
    h = hashlib.sha1(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
    payload["hash"] = h
    # Optional: read build metadata if your scraper writes one
    if os.path.exists(VERSION_FILE):
        try:
            with open(VERSION_FILE, "r", encoding="utf-8") as f:
                meta = json.load(f)
            payload.update(meta)
        except Exception:
            pass
    return payload

def _extract_name(doc: Dict[str, Any]) -> Optional[str]:
    return doc.get("name") or doc.get("title") or doc.get("display_name")

def _coerce_num(v: Any) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    m = re.search(r"(\d+(\.\d+)?)", str(v))
    return float(m.group(1)) if m else None

# ---------- Meta ----------
@router.get("/meta/data-version")
def meta_data_version() -> Dict[str, Any]:
    return _version_payload()

# ---------- Basic entity fetch ----------
@router.get("/items/{key}")
def get_item(key: str):
    cn = _connect()
    doc = get_doc(cn, "items", key)
    if not doc:
        raise HTTPException(404, f"Item not found: {key}")
    return doc

@router.get("/npcs/{key}")
def get_npc(key: str):
    cn = _connect()
    doc = get_doc(cn, "npcs", key)
    if not doc:
        raise HTTPException(404, f"NPC not found: {key}")
    return doc

@router.get("/specials/{key}")
def get_special(key: str):
    cn = _connect()
    doc = get_doc(cn, "specials", key)
    if not doc:
        raise HTTPException(404, f"Special not found: {key}")
    return doc

# ---------- Search (items + npcs) ----------
@router.get("/search", response_model=List[SearchResult])
def search(
    q: str = Query(..., min_length=2),
    type: str = Query("both", pattern="^(items|npcs|both)$"),
    limit: int = Query(25, ge=1, le=200),
):
    cn = _connect()
    results: List[SearchResult] = []
    if type in ("items", "both"):
        rows = json_search(cn, "items", ["name", "title", "slot", "aliases"], q, limit=limit)
        for d in rows:
            results.append(SearchResult(
                key=d.get("_key") or d.get("title") or d.get("name"),
                type="item",
                name=_extract_name(d),
                title=d.get("title"),
                slot=d.get("combat_bonuses", {}).get("slot") or d.get("slot"),
                style=(d.get("combat_styles") or {}).get("primary_style"),
                meta={"speed_ticks": (d.get("combat_styles") or {}).get("attack_speed_ticks")}
            ))
    if type in ("npcs", "both"):
        rows = json_search(cn, "npcs", ["name", "title", "category", "location", "lineage"], q, limit=limit)
        for d in rows:
            results.append(SearchResult(
                key=d.get("_key") or d.get("title") or d.get("name"),
                type="npc",
                name=_extract_name(d),
                title=d.get("title"),
                combat_level=d.get("combat_level"),
                meta={"slayer_req": d.get("attributes", {}).get("slayer_level")}
            ))
    return results[:limit]

# ---------- Drops lookups ----------
@router.get("/drops/by-item/{item_key}")
def drops_by_item(item_key: str):
    """
    Which NPCs drop this item? Returns NPC + rarity + qty.
    """
    cn = _connect()
    # drops table row doc is assumed to contain at least: npc_title, item_title, rarity_raw/rarity_norm, quantity
    rows = json_search(cn, "drops", ["item_title", "item", "npc_title"], item_key, limit=500)
    out = []
    for d in rows:
        if (d.get("item_title") or d.get("item")) and item_key.lower() in str(d.values()).lower():
            out.append(d)
    return out

@router.get("/drops/by-npc/{npc_key}")
def drops_by_npc(npc_key: str):
    """
    What are the drops for this NPC? Returns items + rarity + qty.
    """
    cn = _connect()
    # Prefer an exact fetch using primary key if drops keyed by npc_title
    rows = json_search(cn, "drops", ["npc_title", "npc"], npc_key, limit=2000)
    return [d for d in rows if npc_key.lower() in str(d.values()).lower()]

# ---------- BIS Candidates (simple scoring) ----------
@router.get("/bis/candidates")
def bis_candidates(
    slot: str = Query(...),            # e.g., "weapon", "head", "body"
    style: Optional[str] = Query(None),# e.g., "slash", "stab", "crush", "ranged", "magic"
    top_n: int = Query(15, ge=1, le=100),
    min_strength: Optional[float] = None,
):
    """
    Lightweight BIS candidate list using item offensives + speed.
    Great as a precursor for a deeper DPS sim.
    """
    cn = _connect()
    keys = all_keys(cn, "items", limit=5000, offset=0)
    scored: List[Tuple[float, Dict[str, Any]]] = []
    for k in keys:
        d = get_doc(cn, "items", k) or {}
        if not d:
            continue
        item_slot = (d.get("combat_bonuses") or {}).get("slot") or d.get("slot")
        if (item_slot or "").lower() != slot.lower():
            continue
        styles = d.get("combat_styles") or {}
        speed = _coerce_num(styles.get("attack_speed_ticks")) or 5
        # offensive stats
        bon = d.get("combat_bonuses") or {}
        off = 0.0
        if style:
            off = float(bon.get(style.lower(), 0) or 0)
        else:
            off = float(max(bon.get("slash",0), bon.get("stab",0), bon.get("crush",0),
                            bon.get("ranged",0), bon.get("magic",0)) or 0)
        strb = float(bon.get("strength", 0) or 0)
        if min_strength is not None and strb < min_strength:
            continue
        # simple heuristic: bigger offence and strength, lower speed (faster) is better
        score = off * 1.0 + strb * 0.8 + (10.0 / max(1.0, speed))
        d["_key"] = k
        d["_score"] = round(score, 3)
        d["_speed_ticks"] = speed
        scored.append((score, d))
    scored.sort(key=lambda t: t[0], reverse=True)
    return [d for _, d in scored[:top_n]]

# ---------- Spec recommendations ----------
@router.get("/specs/recommendations")
def specs_recommendations(
    goal: Optional[str] = Query(None, description="e.g., 'defence down', 'freeze', 'bleed', 'accuracy boost'"),
    max_energy: Optional[int] = Query(None),
    top_n: int = Query(20, ge=1, le=100),
):
    """
    Find special attacks by intent. Very agent-friendly: you can ask for 'defence down <=50% energy'.
    """
    cn = _connect()
    keys = all_keys(cn, "specials", limit=5000, offset=0)
    ranked: List[Tuple[float, Dict[str, Any]]] = []
    for k in keys:
        d = get_doc(cn, "specials", k) or {}
        spec_name = d.get("name") or d.get("title") or d.get("spec_name")
        energy = _coerce_num(d.get("energy_cost") or d.get("special_energy") or d.get("energy"))
        eff = " ".join([
            d.get("effect_text",""),
            json.dumps(d.get("effects") or d.get("modifiers") or {}, ensure_ascii=False)
        ]).lower()
        if goal and goal.lower() not in eff:
            # allow some common synonyms
            synonyms = {
                "defence down": ["defence reduction", "defense reduction", "lower defence", "defence drain"],
                "freeze": ["bind", "freeze", "immobilise", "entangle"],
                "bleed": ["bleed", "damage over time"],
                "accuracy": ["accuracy", "hit chance", "attack boost"],
            }
            ok = any(any(s in eff for s in synonyms.get(goal.lower(), [])))
            if not ok:
                continue
        if max_energy is not None and energy is not None and energy > max_energy:
            continue
        score = 0.0
        if "defence" in eff: score += 2.0
        if "bleed" in eff or "damage over time" in eff: score += 1.5
        if "freeze" in eff or "bind" in eff: score += 1.2
        if "accuracy" in eff or "hit chance" in eff: score += 1.0
        if energy is not None:
            score += 30.0 / max(10.0, energy)  # cheaper specs → slight boost
        d["_key"] = k
        d["_score"] = round(score, 3)
        d["_energy"] = energy
        d["_spec_name"] = spec_name
        ranked.append((score, d))
    ranked.sort(key=lambda t: t[0], reverse=True)
    return [d for _, d in ranked[:top_n]]

# ---------- Batch lookup (agent-friendly) ----------
class BatchLookupBody(BaseModel):
    items: List[str] = []
    npcs: List[str] = []
    specials: List[str] = []

@router.post("/batch/lookup")
def batch_lookup(body: BatchLookupBody):
    cn = _connect()
    return {
        "items": get_docs(cn, "items", body.items),
        "npcs": get_docs(cn, "npcs", body.npcs),
        "specials": get_docs(cn, "specials", body.specials),
    }

# ---------- Agent context pack ----------
@router.get("/agents/context-pack", response_model=ContextPack)
def agents_context_pack(
    item: Optional[str] = None,
    npc: Optional[str] = None,
    special: Optional[str] = None,
):
    """
    Delivers a stitched, ready-to-think pack for an LLM/tool:
      - merged item/npc/special docs
      - reverse drops in both directions
    """
    cn = _connect()
    item_doc = get_doc(cn, "items", item) if item else None
    npc_doc = get_doc(cn, "npcs", npc) if npc else None
    spec_doc = get_doc(cn, "specials", special) if special else None

    drops_for_item = drops_by_item(item) if item else []
    drops_for_npc_ = drops_by_npc(npc) if npc else []

    return ContextPack(
        item=item_doc,
        npc=npc_doc,
        special=spec_doc,
        drops_for_item=drops_for_item,
        drops_for_npc=drops_for_npc_,
    )

# ---------- Diff since (if you keep snapshots & change logs) ----------
@router.get("/diff/since")
def diff_since(version: Optional[str] = None):
    """
    If your scraper writes a changes log per build (e.g., data/db/changes.json),
    return it here; otherwise, provide counts only.
    """
    changes_path = os.path.join(DATA_DIR, "changes.json")
    if os.path.exists(changes_path):
        try:
            with open(changes_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"note": "no change log present", **_version_payload()}
