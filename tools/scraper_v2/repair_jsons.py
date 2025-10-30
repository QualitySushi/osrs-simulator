# tools/scraper_v2/repair_jsons.py
import json
from pathlib import Path
from typing import Any, Dict

DATA_DIR = Path("data/db")

def _read(name: str) -> Any:
    p = DATA_DIR / f"{name}.json"
    if not p.exists(): return None
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)

def _write(name: str, obj: Any):
    p = DATA_DIR / f"{name}.json"
    with p.open("w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def _normalize_map(kind: str, raw: Any) -> Dict[str, Any]:
    # unwrap {"__inline__": ...}
    if isinstance(raw, dict) and set(raw.keys()) == {"__inline__"}:
        raw = raw["__inline__"]

    out: Dict[str, Any] = {}

    if isinstance(raw, dict):
        for k, v in raw.items():
            if k == "__inline__": 
                continue
            name = ""
            if isinstance(v, dict):
                name = (v.get("name") or v.get("title") or v.get("npc") or "").strip()
            if not name:
                name = k
            if name and name != "__inline__":
                out[name] = v
        return out

    if isinstance(raw, list):
        for v in raw:
            if not isinstance(v, dict):
                # wrap unknown types
                v = {"doc": v}
            name = (v.get("name") or v.get("title") or v.get("npc") or "").strip()
            if not name or name == "__inline__":
                continue
            out[name] = v
        return out

    return out

def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for kind in ["items", "npcs", "drops", "specials"]:
        raw = _read(kind)
        if raw is None:
            print(f"[skip] {kind}.json missing")
            continue
        fixed = _normalize_map(kind, raw)
        _write(kind, fixed)
        print(f"[fix] {kind}.json  -> {len(fixed)} entries")

if __name__ == "__main__":
    main()
