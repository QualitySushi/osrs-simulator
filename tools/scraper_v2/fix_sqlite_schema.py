# tools/scraper_v2/fix_sqlite_schema.py
import argparse, sqlite3, sys

def colnames(cur, table):
    cur.execute(f"PRAGMA table_info({table})")
    return [r[1] for r in cur.fetchall()]

def table_exists(cur, table):
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?",(table,))
    return cur.fetchone() is not None

def migrate(cur, table, want_col, have_col):
    """
    Ensure `table` has primary key column `want_col`.
    If the table currently uses `have_col`, migrate it.
    """
    if not table_exists(cur, table):
        # fresh create with desired schema
        if table == "drops":
            cur.execute("CREATE TABLE drops (npc_title TEXT PRIMARY KEY, doc TEXT NOT NULL)")
        else:
            cur.execute(f"CREATE TABLE {table} ({want_col} TEXT PRIMARY KEY, doc TEXT NOT NULL)")
        return

    cols = colnames(cur, table)
    if want_col in cols:
        return  # already good

    if have_col in cols:
        tmp = f"{table}__new"
        if table == "drops":
            cur.execute("CREATE TABLE IF NOT EXISTS drops__new (npc_title TEXT PRIMARY KEY, doc TEXT NOT NULL)")
            cur.execute("INSERT INTO drops__new(npc_title, doc) SELECT {}, doc FROM drops".format(have_col))
            cur.execute("DROP TABLE drops")
            cur.execute("ALTER TABLE drops__new RENAME TO drops")
        else:
            cur.execute(f"CREATE TABLE IF NOT EXISTS {tmp} ({want_col} TEXT PRIMARY KEY, doc TEXT NOT NULL)")
            cur.execute(f"INSERT INTO {tmp}({want_col}, doc) SELECT {have_col}, doc FROM {table}")
            cur.execute(f"DROP TABLE {table}")
            cur.execute(f"ALTER TABLE {tmp} RENAME TO {table}")
    else:
        # Unknown layout; recreate empty with desired schema
        cur.execute(f"DROP TABLE IF EXISTS {table}")
        if table == "drops":
            cur.execute("CREATE TABLE drops (npc_title TEXT PRIMARY KEY, doc TEXT NOT NULL)")
        else:
            cur.execute(f"CREATE TABLE {table} ({want_col} TEXT PRIMARY KEY, doc TEXT NOT NULL)")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sqlite", default="osrs.sqlite", help="Path to sqlite db")
    args = ap.parse_args()

    cn = sqlite3.connect(args.sqlite)
    cur = cn.cursor()
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA synchronous=NORMAL")

    # items: want 'title' (was 'name')
    migrate(cur, "items", "title", "name")
    # npcs: want 'title' (was 'name')
    migrate(cur, "npcs", "title", "name")
    # drops: want 'npc_title' (was 'npc')
    migrate(cur, "drops", "npc_title", "npc")
    # specials: want 'title' (was 'name')
    migrate(cur, "specials", "title", "name")

    cn.commit()
    cn.close()
    print("[ok] sqlite schema normalized (items.title, npcs.title, drops.npc_title, specials.title)")

if __name__ == "__main__":
    sys.exit(main())
