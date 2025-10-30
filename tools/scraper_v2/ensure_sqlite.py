# tools/scraper_v2/ensure_sqlite.py
import argparse, sqlite3, sys

CANON = {
    "items":    {"key": "title",     "legacy_keys": ["name"]},
    "npcs":     {"key": "title",     "legacy_keys": ["name"]},
    "drops":    {"key": "npc_title", "legacy_keys": ["title", "name"]},
    "specials": {"key": "title",     "legacy_keys": ["name"]},
}

INDEXES = [
    ("items",    "idx_items_title",       "title"),
    ("npcs",     "idx_npcs_title",        "title"),
    ("drops",    "idx_drops_npc_title",   "npc_title"),
    ("specials", "idx_specials_title",    "title"),
]

def table_info(cur, table):
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?;", (table,))
    if not cur.fetchone(): return None
    cur.execute(f"PRAGMA table_info({table});")
    cols = [ (r[1], r[2]) for r in cur.fetchall() ]  # (name, type)
    return dict(cols)

def ensure_table(cur, table, key_col):
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS {table} (
            {key_col} TEXT PRIMARY KEY,
            doc TEXT NOT NULL
        );
    """)

def migrate_if_needed(cur, table, key_col, legacy_keys):
    cols = table_info(cur, table)
    if cols is None:
        # No table yet — just create canonical
        ensure_table(cur, table, key_col)
        return

    has_key      = key_col in cols
    has_doc      = "doc" in cols
    usable_legacy = next((k for k in legacy_keys if k in cols), None)

    if has_key and has_doc:
        # Already good
        return

    # We need to migrate to (key_col, doc)
    # Strategy:
    #  1) create temp table with canonical schema
    #  2) insert from old selecting legacy key if needed
    #  3) drop old, rename temp to final
    tmp = f"{table}__new"
    cur.execute(f"DROP TABLE IF EXISTS {tmp};")
    ensure_table(cur, tmp, key_col)

    if has_doc and (has_key or usable_legacy):
        src_key = key_col if has_key else usable_legacy
        cur.execute(f"INSERT INTO {tmp}({key_col}, doc) SELECT {src_key}, doc FROM {table};")
        cur.execute(f"DROP TABLE {table};")
        cur.execute(f"ALTER TABLE {tmp} RENAME TO {table};")
    else:
        # Can't map; back up and create fresh canonical
        cur.execute(f"ALTER TABLE {table} RENAME TO {table}__backup;")
        ensure_table(cur, table, key_col)

def ensure_indexes(cur):
    for table, idx, col in INDEXES:
        try:
            cur.execute(f"CREATE INDEX IF NOT EXISTS {idx} ON {table}({col});")
        except sqlite3.OperationalError:
            # If column doesn’t exist yet (very odd after migration), ignore
            pass

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sqlite", default="osrs.sqlite")
    args = ap.parse_args()

    cn = sqlite3.connect(args.sqlite)
    try:
        cur = cn.cursor()
        for table, spec in CANON.items():
            migrate_if_needed(cur, table, spec["key"], spec["legacy_keys"])
        ensure_indexes(cur)
        cn.commit()
        print("[ok] schema ensured/migrated")
    finally:
        cn.close()

if __name__ == "__main__":
    sys.exit(main())
