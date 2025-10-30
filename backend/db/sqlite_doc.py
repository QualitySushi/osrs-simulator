# backend/app/db/sqlite_doc.py
from __future__ import annotations
import json, os, sqlite3
from typing import Any, Dict, Iterable, List, Optional, Tuple

SQLITE_PATH = os.getenv("SCRAPER_SQLITE", "osrs.sqlite")

def _connect(db_path: Optional[str] = None) -> sqlite3.Connection:
    path = db_path or SQLITE_PATH
    cn = sqlite3.connect(path, check_same_thread=False)
    cn.row_factory = sqlite3.Row
    # Enable JSON1 (bundled with modern SQLite)
    cn.execute("PRAGMA journal_mode=WAL;")
    cn.execute("PRAGMA synchronous=NORMAL;")
    return cn

def _pk_for(cn: sqlite3.Connection, table: str) -> str:
    # Detect whether table uses 'title' (preferred) or 'name'
    info = cn.execute(f"PRAGMA table_info({table})").fetchall()
    cols = {row["name"] for row in info}
    if "title" in cols:
        return "title"
    if "name" in cols:
        return "name"
    # Fallback: assume 'title' exists logically and create if needed
    # (This keeps callers simple; your schema fixer already migrates.)
    return "title"

def get_doc(cn: sqlite3.Connection, table: str, key: str) -> Optional[Dict[str, Any]]:
    pk = _pk_for(cn, table)
    row = cn.execute(f"SELECT doc FROM {table} WHERE {pk} = ?", (key,)).fetchone()
    if not row:
        return None
    try:
        return json.loads(row["doc"])
    except Exception:
        return None

def get_docs(cn: sqlite3.Connection, table: str, keys: Iterable[str]) -> Dict[str, Dict[str, Any]]:
    pk = _pk_for(cn, table)
    keys = list(keys)
    if not keys:
        return {}
    qmarks = ",".join("?" for _ in keys)
    rows = cn.execute(f"SELECT {pk} AS k, doc FROM {table} WHERE {pk} IN ({qmarks})", keys).fetchall()
    out: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        try:
            out[r["k"]] = json.loads(r["doc"])
        except Exception:
            pass
    return out

def exists_table(cn: sqlite3.Connection, name: str) -> bool:
    r = cn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone()
    return bool(r)

def count_table(cn: sqlite3.Connection, name: str) -> int:
    if not exists_table(cn, name):
        return 0
    try:
        r = cn.execute(f"SELECT COUNT(*) AS c FROM {name}").fetchone()
        return int(r["c"])
    except Exception:
        return 0

def json_search(
    cn: sqlite3.Connection,
    table: str,
    fields: List[str],
    query: str,
    limit: int = 25,
) -> List[Dict[str, Any]]:
    """
    Simple case-insensitive contains across JSON fields using LIKE on json_extract.
    """
    pk = _pk_for(cn, table)
    clauses, params = [], []
    for f in fields:
        # json_extract(doc, '$.field')
        clauses.append("LOWER(json_extract(doc, ?)) LIKE ?")
        params.append(f"$.{f}")
        params.append(f"%{query.lower()}%")
    where = " OR ".join(clauses) if clauses else "1=1"
    sql = f"""
    SELECT {pk} AS key, doc
    FROM {table}
    WHERE {where}
    LIMIT ?
    """
    rows = cn.execute(sql, (*params, limit)).fetchall()
    out = []
    for r in rows:
        try:
            d = json.loads(r["doc"])
            d["_key"] = r["key"]
            out.append(d)
        except Exception:
            pass
    return out

def all_keys(cn: sqlite3.Connection, table: str, limit: int = 1000, offset: int = 0) -> List[str]:
    pk = _pk_for(cn, table)
    rows = cn.execute(
        f"SELECT {pk} AS key FROM {table} ORDER BY {pk} LIMIT ? OFFSET ?",
        (limit, offset)
    ).fetchall()
    return [r["key"] for r in rows]
