# tools/scraper_v2/build_from_targets.py
from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Optional, Tuple

import requests

from tools.scraper_v2.parsers.items import ItemParser
from tools.scraper_v2.parsers.specials import SpecialParser
from tools.scraper_v2.parsers.npcs import NpcParser
from tools.scraper_v2.parsers.drops import parse_drop_table

UA = {"User-Agent": "ScapeLab build_from_targets/1.1"}

# ---------- utilities ----------

_WS = "".join((
    "\u00A0",  # NBSP
    "\u2007",  # figure space
    "\u202F",  # narrow NBSP
))
_WS_RE = re.compile(f"[{re.escape(_WS)}]")

def _clean_title(s: str) -> str:
    """Normalize a wiki page title from messy inputs."""
    s = s.strip()
    if not s:
        return s
    # Replace non-breaking spaces & friends with regular space
    s = _WS_RE.sub(" ", s)
    # Drop any #section fragment (those aren’t real page titles for parse=)
    if "#" in s:
        s = s.split("#", 1)[0].strip()
    # Collapse inner whitespace
    s = re.sub(r"\s+", " ", s)
    return s

def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)

def _write_json(path: Path, data: Any) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def _fetch_html(title: str) -> str:
    r = requests.get(
        "https://oldschool.runescape.wiki/api.php",
        params={"action": "parse", "page": title, "prop": "text", "format": "json"},
        headers=UA,
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["parse"]["text"]["*"]

def _load_jsonl(path: Path) -> Iterator[Any]:
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                # treat raw strings as titles
                yield line

def _iter_titles_from_any(stream: Iterable[Any]) -> Iterator[str]:
    """
    Yield best-guess titles from a messy JSONL stream.
    Accepts:
      - {"title": "..."} or {"name": "..."} or {"page": "..."}
      - {"__inline__": {..., "title": "..."}}
      - strings: "Abyssal demon"
      - objects containing sublists under common keys ("items", "npcs")
    Skips empty and duplicates after normalization.
    """
    seen: set[str] = set()

    def push(raw: Optional[str]):
        if not raw:
            return
        t = _clean_title(str(raw))
        if not t:
            return
        if t not in seen:
            seen.add(t)
            yield t

    for obj in stream:
        # raw string line
        if isinstance(obj, str):
            yield from push(obj)
            continue

        if not isinstance(obj, dict):
            continue

        # direct keys
        for key in ("title", "name", "page"):
            if key in obj and isinstance(obj[key], str):
                yield from push(obj[key])

        # __inline__ wrapper
        if "__inline__" in obj and isinstance(obj["__inline__"], dict):
            inline = obj["__inline__"]
            # sometimes inline has title/name
            for key in ("title", "name", "page"):
                v = inline.get(key)
                if isinstance(v, str):
                    yield from push(v)

        # nested arrays of entries
        for subkey in ("items", "npcs", "targets", "entries"):
            if subkey in obj and isinstance(obj[subkey], list):
                for entry in obj[subkey]:
                    if isinstance(entry, str):
                        yield from push(entry)
                    elif isinstance(entry, dict):
                        for key in ("title", "name", "page"):
                            v = entry.get(key)
                            if isinstance(v, str):
                                yield from push(v)

def _load_titles(path: Path) -> List[str]:
    return list(_iter_titles_from_any(_load_jsonl(path)))

# ---------- per-entity workers ----------

def process_item(title: str) -> Tuple[str, Dict[str, Any]]:
    html = _fetch_html(title)
    item_doc = ItemParser().parse(html)
    special_doc = None
    try:
        special_doc = SpecialParser().parse(html)
    except Exception:
        pass
    return title, {"item": item_doc, "special": special_doc}

def process_npc(title: str) -> Tuple[str, Dict[str, Any]]:
    html = _fetch_html(title)
    drops = parse_drop_table(html)
    npc_doc = NpcParser().parse(html, title_hint=title, drops=drops)
    return title, npc_doc

# ---------- main ----------

def main() -> int:
    ap = argparse.ArgumentParser(description="Build local DB from explicit target lists.")
    ap.add_argument("--items-file", required=True, type=Path)
    ap.add_argument("--npcs-file", required=True, type=Path)
    ap.add_argument("--outdir", required=True, type=Path)
    ap.add_argument("--sqlite", required=True)  # accepted but not used here
    ap.add_argument("--concurrency", type=int, default=6)
    ap.add_argument("--max-items", type=int, default=0, help="0 = all")
    ap.add_argument("--max-npcs", type=int, default=0, help="0 = all")
    args = ap.parse_args()

    _ensure_dir(args.outdir)

    items_targets = _load_titles(args.items_file)
    npcs_targets = _load_titles(args.npcs_file)

    if args.max_items and args.max_items > 0:
        items_targets = items_targets[: args.max_items]
    if args.max_npcs and args.max_npcs > 0:
        npcs_targets = npcs_targets[: args.max_npcs]

    print(f"[INFO] [items] scraping {len(items_targets)} from {args.items_file.name}")
    print(f"[INFO] [npcs ] scraping {len(npcs_targets)} from {args.npcs_file.name}")

    # ITEMS
    items_out: Dict[str, Dict[str, Any]] = {}
    specials_out: Dict[str, Dict[str, Any]] = {}
    with cf.ThreadPoolExecutor(max_workers=args.concurrency) as ex:
        futs = {ex.submit(process_item, t): t for t in items_targets}
        for fut in cf.as_completed(futs):
            t = futs[fut]
            try:
                title, doc = fut.result()
                items_out[title] = doc["item"]
                if doc.get("special"):
                    specials_out[title] = doc["special"]
            except Exception as e:
                items_out[t] = {"title": t, "error": str(e)}

    # NPCS
    npcs_out: Dict[str, Dict[str, Any]] = {}
    with cf.ThreadPoolExecutor(max_workers=args.concurrency) as ex:
        futs = {ex.submit(process_npc, t): t for t in npcs_targets}
        for fut in cf.as_completed(futs):
            t = futs[fut]
            try:
                title, doc = fut.result()
                npcs_out[title] = doc
            except Exception as e:
                npcs_out[t] = {"title": t, "error": str(e)}

    # WRITE
    _write_json(args.outdir / "items.json", items_out)
    _write_json(args.outdir / "npcs.json", npcs_out)
    _write_json(args.outdir / "specials.json", specials_out)

    # Flatten drops
    drops_flat: Dict[str, List[Dict[str, Any]]] = {}
    for t, npc in npcs_out.items():
        if isinstance(npc, dict):
            dr = npc.get("drops")
            if dr:
                drops_flat[t] = dr
    _write_json(args.outdir / "drops.json", drops_flat)

    print(f"[DONE] wrote: items.json ({len(items_out)}), npcs.json ({len(npcs_out)}), specials.json ({len(specials_out)}), drops.json ({len(drops_flat)}) -> {args.outdir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
