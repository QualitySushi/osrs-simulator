# tools/scraper_v2/build_local_db.py
from __future__ import annotations

import argparse
import concurrent.futures as futures
import json
import logging
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import requests

# ---- Parsers ----
from tools.scraper_v2.parsers.items import ItemParser
from tools.scraper_v2.parsers.specials import SpecialParser
from tools.scraper_v2.parsers.npcs import NpcParser
from tools.scraper_v2.parsers.drops import parse_drop_table

# --------------------------------------------------------------------------------------
# Config / constants
# --------------------------------------------------------------------------------------

UA = {"User-Agent": "ScapeLab build_local_db (dev)"}
API = "https://oldschool.runescape.wiki/api.php"

ROOT = Path(__file__).resolve().parents[2]
TARGETS_DIR = ROOT / "tools" / "scraper_v2" / "targets"
ITEMS_REGISTRY = TARGETS_DIR / "items_registry.json"
NPCS_REGISTRY = TARGETS_DIR / "npcs_registry.json"

# NEW: seed dumps (place your dumps here)
ITEM_IDS_PATH = TARGETS_DIR / "targets_items.jsonl"
NPC_IDS_PATH = TARGETS_DIR / "targets_npcs.jsonl"

DEFAULT_OUTDIR = ROOT / "data" / "db"
DEFAULT_SQLITE = ROOT / "osrs.sqlite"

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger("build_local_db")

SCHEMA_SQL = """
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS items (
  title TEXT PRIMARY KEY,
  doc   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS npcs (
  title TEXT PRIMARY KEY,
  doc   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS drops (
  npc_title TEXT NOT NULL,
  doc       TEXT NOT NULL,
  PRIMARY KEY (npc_title)
);
CREATE TABLE IF NOT EXISTS specials (
  item_title TEXT PRIMARY KEY,
  doc        TEXT NOT NULL
);
"""

# --------------------------------------------------------------------------------------
# Simple IO utils
# --------------------------------------------------------------------------------------

def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)

def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def _dump_json(path: Path, obj: Any) -> None:
    ensure_dir(path.parent)
    with path.open("w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def open_db(p: Path) -> sqlite3.Connection:
    ensure_dir(p.parent)
    cn = sqlite3.connect(p)
    cn.executescript(SCHEMA_SQL)
    return cn

def upsert_sqlite(db_path: Path,
                  items: List[Tuple[str, Dict[str, Any]]],
                  npcs: List[Tuple[str, Dict[str, Any]]],
                  drops: List[Tuple[str, List[Dict[str, Any]]]],
                  specials: List[Tuple[str, Dict[str, Any]]]) -> None:
    cn = open_db(db_path)
    cur = cn.cursor()

    cur.executemany(
        "INSERT INTO items(title, doc) VALUES (?, ?) "
        "ON CONFLICT(title) DO UPDATE SET doc=excluded.doc",
        [(t, json.dumps(doc, ensure_ascii=False)) for t, doc in items]
    )
    cur.executemany(
        "INSERT INTO npcs(title, doc) VALUES (?, ?) "
        "ON CONFLICT(title) DO UPDATE SET doc=excluded.doc",
        [(t, json.dumps(doc, ensure_ascii=False)) for t, doc in npcs]
    )
    cur.executemany(
        "INSERT INTO drops(npc_title, doc) VALUES (?, ?) "
        "ON CONFLICT(npc_title) DO UPDATE SET doc=excluded.doc",
        [(t, json.dumps(doc, ensure_ascii=False)) for t, doc in drops]
    )
    cur.executemany(
        "INSERT INTO specials(item_title, doc) VALUES (?, ?) "
        "ON CONFLICT(item_title) DO UPDATE SET doc=excluded.doc",
        [(t, json.dumps(doc, ensure_ascii=False)) for t, doc in specials]
    )

    cn.commit()
    cn.close()

def fetch_html(title: str) -> str:
    r = requests.get(
        API,
        params={"action": "parse", "page": title, "prop": "text", "format": "json"},
        headers=UA,
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["parse"]["text"]["*"]

# --------------------------------------------------------------------------------------
# Title extraction from arbitrary JSON
# --------------------------------------------------------------------------------------

_TITLE_KEYS = {"title", "name", "page", "wiki_name", "label"}

# Titles we accept: wiki page names (allow spaces; we’ll convert to underscores later)
_TITLE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 _'’\-\(\)]+$")

def _maybe_title(s: Any) -> Optional[str]:
    if not isinstance(s, str):
        return None
    s2 = s.strip()
    if not s2:
        return None
    # filter obvious non-titles (URLs, file paths, etc.)
    if s2.startswith(("http://", "https://", "Category:", "File:", "User:")):
        return None
    # allow “Abyssal whip”, “Thermonuclear smoke devil” etc.
    if _TITLE_RE.match(s2):
        return s2
    return None

def _walk_collect_titles(obj: Any, out: Set[str]) -> None:
    if isinstance(obj, dict):
        # prefer explicit title keys
        for k in _TITLE_KEYS:
            if k in obj:
                t = _maybe_title(obj[k])
                if t:
                    out.add(t)
        # also scan all values
        for v in obj.values():
            _walk_collect_titles(v, out)
    elif isinstance(obj, list):
        for v in obj:
            _walk_collect_titles(v, out)
    else:
        t = _maybe_title(obj)
        if t:
            out.add(t)

def _extract_titles_from_dump(path: Path) -> List[str]:
    if not path.exists():
        return []
    titles: Set[str] = set()
    try:
        # handle jsonl or json
        if path.suffix == ".jsonl":
            with path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    _walk_collect_titles(obj, titles)
        else:
            data = _load_json(path)
            _walk_collect_titles(data, titles)
    except Exception as e:
        log.warning("failed to read %s: %s", path.name, e)
    return sorted({t.replace(" ", "_") for t in titles})

# --------------------------------------------------------------------------------------
# Cargo bootstrap (used only if seed dumps fail)
# --------------------------------------------------------------------------------------

def _cargo_list_titles(table: str, limit: int = 500) -> List[str]:
    titles: List[str] = []
    offset = 0
    while True:
        params = {
            "action": "cargoquery",
            "format": "json",
            "tables": table,
            "fields": "_pageName=title",
            "where": "",
            "order_by": "_pageName",
            "limit": str(limit),
            "offset": str(offset),
        }
        r = requests.get(API, params=params, headers=UA, timeout=30)
        r.raise_for_status()
        data = r.json()
        rows = (data.get("cargoquery") or [])
        if not rows:
            break
        for row in rows:
            title = ((row or {}).get("title") or {}).get("title")
            if isinstance(title, str) and title.strip():
                titles.append(title.strip().replace(" ", "_"))
        if len(rows) < limit:
            break
        offset += limit
    return titles

# --------------------------------------------------------------------------------------
# Registries
# --------------------------------------------------------------------------------------

def _seed_registry_from_ids(kind: str) -> List[Dict[str, Any]]:
    # Try the local seed dumps first
    seed_path = ITEM_IDS_PATH if kind == "items" else NPC_IDS_PATH
    titles = _extract_titles_from_dump(seed_path)
    if titles:
        log.info("[%s] seeded %d titles from %s", kind, len(titles), seed_path.name)
        return [{"title": t} for t in titles]
    # Fall back to Cargo if seed missing/empty
    table = "items" if kind == "items" else "npcs"
    titles = _cargo_list_titles(table)
    if titles:
        log.info("[%s] bootstrapped %d titles from Cargo table '%s'", kind, len(titles), table)
        return [{"title": t} for t in titles]
    # No data
    log.warning("[%s] no titles discovered via seeds or Cargo", kind)
    return []

def _maybe_bootstrap_registry(path: Path, kind: str) -> None:
    if path.exists():
        return
    ensure_dir(path.parent)
    log.info("[%s] registry missing — bootstrapping from local seeds or Cargo…", kind)
    rows = _seed_registry_from_ids(kind)
    _dump_json(path, rows)
    log.info("[%s] registry created at %s (%d entries)", kind, path, len(rows))

def _normalize_title(entry: Any) -> Optional[str]:
    if isinstance(entry, str):
        return entry.strip() or None
    if isinstance(entry, dict):
        for k in ("title", "name", "page", "label", "wiki_name"):
            v = entry.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
    return None

def _load_registry(path: Path, kind: str) -> List[Dict[str, Any]]:
    _maybe_bootstrap_registry(path, kind)
    raw = _load_json(path)
    norm: List[Dict[str, Any]] = []
    bad = 0

    if isinstance(raw, dict) and "items" in raw:
        raw = raw["items"]
    if not isinstance(raw, list):
        log.warning("[%s] registry %s is not a list; coercing", kind, path)
        raw = [raw]

    for row in raw:
        title = _normalize_title(row)
        if not title:
            bad += 1
            continue
        norm.append({"title": title} if not isinstance(row, dict) else {**row, "title": title})

    if bad:
        log.warning("[%s] skipped %d malformed registry rows (no usable title)", kind, bad)
    log.info("[%s] loaded %d targets from %s", kind, len(norm), path.name)
    return norm

# --------------------------------------------------------------------------------------
# Scrape workers
# --------------------------------------------------------------------------------------

def scrape_item(target: Dict[str, Any]) -> Tuple[str, Dict[str, Any], Optional[Dict[str, Any]]]:
    title = target.get("title")
    if not title:
        raise ValueError("item target without title")
    html = fetch_html(title)
    item_doc = ItemParser().parse(html)
    if isinstance(item_doc, dict) and item_doc.get("title"):
        title = item_doc["title"].replace(" ", "_")
    special_doc = None
    try:
        special_doc = SpecialParser().parse(html)
        if isinstance(special_doc, dict) and not (special_doc.get("name") or special_doc.get("title")):
            special_doc = None
    except Exception as e:
        logging.getLogger("specials").debug("[%s] specials parse: %s", title, e)
    return title, item_doc, special_doc

def scrape_npc(target: Dict[str, Any]) -> Tuple[str, Dict[str, Any], List[Dict[str, Any]]]:
    title = target.get("title")
    if not title:
        raise ValueError("npc target without title")
    html = fetch_html(title)
    npc_doc = NpcParser().parse(html)
    t2 = npc_doc.get("name") or npc_doc.get("title")
    if isinstance(t2, str) and t2.strip():
        title = t2.replace(" ", "_")
    drop_doc = parse_drop_table(html) or []
    return title, npc_doc, drop_doc

# --------------------------------------------------------------------------------------
# Orchestration
# --------------------------------------------------------------------------------------

def scrape_all(outdir: Path, sqlite_path: Path, max_count: int, concurrency: int) -> None:
    ensure_dir(outdir)

    items_targets = _load_registry(ITEMS_REGISTRY, "items")
    npcs_targets = _load_registry(NPCS_REGISTRY, "npcs")

    if max_count and max_count > 0:
        items_targets = items_targets[:max_count]
        npcs_targets = npcs_targets[:max_count]

    # ---------- Items pass
    log.info("[items] scraping %d items …", len(items_targets))
    items_out: List[Tuple[str, Dict[str, Any]]] = []
    specials_out: List[Tuple[str, Dict[str, Any]]] = []

    def _item_worker(t: Dict[str, Any]):
        return scrape_item(t)

    with futures.ThreadPoolExecutor(max_workers=concurrency) as ex:
        futs = [ex.submit(_item_worker, t) for t in items_targets]
        for fut in futures.as_completed(futs):
            try:
                title, item_doc, special_doc = fut.result()
                items_out.append((title, item_doc))
                if special_doc:
                    specials_out.append((title, special_doc))
            except Exception as e:
                log.warning("[items] skip due to error: %s", e)

    _dump_json(outdir / "items.json", {t: d for t, d in items_out})
    _dump_json(outdir / "specials.json", {t: d for t, d in specials_out})

    # ---------- NPCs pass
    log.info("[npcs] scraping %d NPCs …", len(npcs_targets))
    npcs_out: List[Tuple[str, Dict[str, Any]]] = []
    drops_out: List[Tuple[str, List[Dict[str, Any]]]] = []

    def _npc_worker(t: Dict[str, Any]):
        return scrape_npc(t)

    with futures.ThreadPoolExecutor(max_workers=concurrency) as ex:
        futs = [ex.submit(_npc_worker, t) for t in npcs_targets]
        for fut in futures.as_completed(futs):
            try:
                title, npc_doc, drop_doc = fut.result()
                npcs_out.append((title, npc_doc))
                drops_out.append((title, drop_doc))
            except Exception as e:
                log.warning("[npcs] skip due to error: %s", e)

    _dump_json(outdir / "npcs.json", {t: d for t, d in npcs_out})
    _dump_json(outdir / "drops.json", {t: d for t, d in drops_out})

    # ---------- Write SQLite
    log.info("[db] upserting into %s", sqlite_path)
    upsert_sqlite(sqlite_path, items_out, npcs_out, drops_out, specials_out)
    log.info("[done] %d items, %d npcs, %d drops, %d specials",
             len(items_out), len(npcs_out), len(drops_out), len(specials_out))

# --------------------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------------------

def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Scrape OSRS Wiki into a local DB")
    ap.add_argument("--outdir", type=Path, default=DEFAULT_OUTDIR, help="output directory for json dumps")
    ap.add_argument("--sqlite", type=Path, default=DEFAULT_SQLITE, help="sqlite file path")
    ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--max", type=int, default=0, help="limit count for quick runs (0 = no limit)")
    args = ap.parse_args(argv)

    try:
        scrape_all(args.outdir, args.sqlite, args.max, args.concurrency)
        return 0
    except KeyboardInterrupt:
        log.error("Interrupted")
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
