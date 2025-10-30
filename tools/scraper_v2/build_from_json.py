# tools/scraper_v2/build_from_json.py
import json, sqlite3, os
from pathlib import Path
from typing import Any, Dict, Iterable, Tuple

DB_PATH = Path("osrs.sqlite")
DATA_DIR = Path("data/db")

def _read_json(path: Path) -> Any:
    if not path.exists():
        print(f"[warn] missing: {path}")
        return None
    with path.open("r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except Exception as e:
            print(f"[warn] failed to parse {path}: {e}")
            return None

def _norm_name(v: Any, *keys: str) -> str:
    if isinstance(v, dict):
        for k in keys:
            x = v.get(k)
            if isinstance(x, str) and x.strip():
                return x.strip()
    return ""

def _as_kv_iter(kind: str, raw: Any) -> Iterable[Tuple[str, Any]]:
    """
    Normalize many possible shapes to (key,name)->doc pairs.
    kind in {"items","npcs","drops","specials"}.
    """
    if raw is None:
        return []

    # If it's {"__inline__": ...}, unwrap
    if isinstance(raw, dict) and set(raw.keys()) == {"__inline__"}:
        raw = raw["__inline__"]

    # If final is dict mapping, use keys (but skip "__inline__")
    if isinstance(raw, dict):
        for k, v in raw.items():
            if k == "__inline__":
                continue
            # some dumps put the whole doc under the key already
            name = _norm_name(v, "name", "title") or k
            if name == "__inline__" or not name.strip():
                continue
            yield name, v
        return

    # If it's a list, we need to pull a name/title field out of each entry
    if isinstance(raw, list):
        for v in raw:
            if not isinstance(v, dict):
                # make a wrapper so we still persist *something*
                v = {"doc": v}
            name = _norm_name(v, "name", "title")
            if not name:
                # last resort: some drops might come as {"npc": "...", "items":[...]}
                name = _norm_name(v, "npc")
            if not name:
                # hopeless record; skip
                continue
            yield name, v
        return

    # Unknown shapes -> skip
    return []

def init_db(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute("PRAGMA journal_mode = WAL")
    cur.execute("PRAGMA synchronous = NORMAL")

    cur.executescript("""
    DROP TABLE IF EXISTS items;
    DROP TABLE IF EXISTS npcs;
    DROP TABLE IF EXISTS drops;
    DROP TABLE IF EXISTS specials;

    CREATE TABLE items(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        doc  TEXT NOT NULL
    );
    CREATE INDEX idx_items_name ON items(name);

    CREATE TABLE npcs(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        doc  TEXT NOT NULL
    );
    CREATE INDEX idx_npcs_name ON npcs(name);

    -- For drops, we store one row per NPC. doc is usually a list of drop rows.
    CREATE TABLE drops(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        npc TEXT NOT NULL,
        doc TEXT NOT NULL
    );
    CREATE INDEX idx_drops_npc ON drops(npc);

    CREATE TABLE specials(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        doc  TEXT NOT NULL
    );
    CREATE INDEX idx_specials_name ON specials(name);
    """)
    conn.commit()

def insert_many(conn: sqlite3.Connection, table: str, rows: Iterable[Tuple[str, Any]]):
    cur = conn.cursor()
    col = "npc" if table == "drops" else "name"
    batch = []
    for name, doc in rows:
        if not name or name == "__inline__":
            continue
        try:
            batch.append((name, json.dumps(doc, ensure_ascii=False)))
        except Exception:
            # If doc isn’t JSON-serializable, wrap it
            batch.append((name, json.dumps({"doc": str(doc)}, ensure_ascii=False)))
        if len(batch) >= 1000:
            cur.executemany(f"INSERT INTO {table} ({col}, doc) VALUES (?, ?)", batch)
            batch.clear()
    if batch:
        cur.executemany(f"INSERT INTO {table} ({col}, doc) VALUES (?, ?)", batch)
    conn.commit()

def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    items_raw    = _read_json(DATA_DIR / "items.json")
    npcs_raw     = _read_json(DATA_DIR / "npcs.json")
    drops_raw    = _read_json(DATA_DIR / "drops.json")
    specials_raw = _read_json(DATA_DIR / "specials.json")

    # Quick counts for visibility
    def _count(raw):
        if raw is None: return 0
        if isinstance(raw, dict): return len([k for k in raw.keys() if k != "__inline__"])
        if isinstance(raw, list): return len(raw)
        return 0

    print(f"[load] items={_count(items_raw)} npcs={_count(npcs_raw)} drops={_count(drops_raw)} specials={_count(specials_raw)}")

    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    # Normalize + insert
    insert_many(conn, "items",    _as_kv_iter("items",    items_raw))
    insert_many(conn, "npcs",     _as_kv_iter("npcs",     npcs_raw))
    insert_many(conn, "drops",    _as_kv_iter("drops",    drops_raw))
    insert_many(conn, "specials", _as_kv_iter("specials", specials_raw))

    # Final stats
    cur = conn.cursor()
    def count(table):
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        return cur.fetchone()[0]
    print(f"[OK] osrs.sqlite built")
    print(f"     items={count('items')}  npcs={count('npcs')}  drops={count('drops')}  specials={count('specials')}")

if __name__ == "__main__":
    main()
