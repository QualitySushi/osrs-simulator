# backend/app/testing/_db_stubs.py
"""
Repo stubs just for API tests:
- Async + sync variants so `await` never crashes.
- Collections (items/bosses/search) return small mock lists => 200 OK.
- Single-record lookups return None => routes raise 404 (as tests expect).
- Fully reversible: originals restored after the stub context ends.
"""

from contextlib import contextmanager
import importlib
import pkgutil
from types import ModuleType

# --- Mock shapes used by API tests (lightweight, deterministic) ---
MOCK_ITEMS = [
    {"id": 1, "name": "Dragon scimitar", "has_combat_stats": True, "is_tradeable": True},
    {"id": 2, "name": "Bronze dagger",   "has_combat_stats": True, "is_tradeable": False},
]
MOCK_BOSSES = [
    {"id": 1, "name": "Zulrah", "raid_group": None, "location": "Zul-Andra", "has_multiple_forms": True}
]

# ---- sync helpers ----
def _items_sync(*_a, **_k): return MOCK_ITEMS
def _bosses_sync(*_a, **_k): return MOCK_BOSSES
def _noop(*_a, **_k): return None
def _none_sync(*_a, **_k): return None  # per-ID lookups -> 404 in routes

# ---- async helpers ----
async def _items_async(*_a, **_k): return MOCK_ITEMS
async def _bosses_async(*_a, **_k): return MOCK_BOSSES
async def _noop_async(*_a, **_k): return None
async def _none_async(*_a, **_k): return None  # per-ID lookups -> 404 in routes

# Attribute substrings to patch -> replacement
# (Both sync and async names covered, common variants included.)
PATTERNS = {
    # --- Items (collections -> list; single -> None) ---
    "get_all_items_async": _items_async,
    "get_all_items":       _items_sync,
    "search_items_async":  _items_async,
    "search_items":        _items_sync,
    "get_items_async":     _items_async,
    "get_items":           _items_sync,
    "get_item_async":      _none_async,
    "get_item":            _none_sync,

    # --- Bosses (collections -> list; single -> None) ---
    "get_all_bosses_async":      _bosses_async,
    "get_all_bosses":            _bosses_sync,
    "get_bosses_with_forms_async": _bosses_async,
    "get_bosses_with_forms":       _bosses_sync,
    "search_bosses_async":       _bosses_async,
    "search_bosses":             _bosses_sync,
    "get_boss_async":            _none_async,
    "get_boss":                  _none_sync,
    "get_boss_by_form_async":    _none_async,
    "get_boss_by_form":          _none_sync,

    # --- cache warmers / primes ---
    "warm_cache_async": _noop_async,
    "warm_cache":       _noop,
    "prime_cache_async": _noop_async,
    "prime_cache":       _noop,
}

def _iter_repo_modules():
    """Load app.repositories and all submodules (best-effort)."""
    try:
        pkg = importlib.import_module("app.repositories")
    except Exception:
        return []
    mods = [pkg]
    path = getattr(pkg, "__path__", [])
    for m in pkgutil.walk_packages(path, pkg.__name__ + "."):
        try:
            mods.append(importlib.import_module(m.name))
        except Exception:
            pass
    return mods

@contextmanager
def apply_repo_stubs():
    """
    Patch app.repositories.* functions according to PATTERNS.
    Restores originals after use.
    """
    originals: list[tuple[object, str, object | None]] = []
    mods = _iter_repo_modules()

    # patch repo functions
    for mod in mods:
        for attr_name, original in list(vars(mod).items()):
            if not callable(original):
                continue
            lname = attr_name.lower()
            for key, repl in PATTERNS.items():
                if key in lname:
                    originals.append((mod, attr_name, original))
                    setattr(mod, attr_name, repl)
                    break

    # short-circuit any stray DB attempts
    try:
        import pyodbc  # type: ignore
        originals.append((pyodbc, "connect", getattr(pyodbc, "connect", None)))
        def _fast_fail_connect(*_a, **_k):
            raise pyodbc.Error("pyodbc.connect disabled in tests")
        setattr(pyodbc, "connect", _fast_fail_connect)
    except Exception:
        pass

    try:
        yield
    finally:
        # restore originals
        for obj, name, orig in reversed(originals):
            try:
                if orig is None:
                    delattr(obj, name)
                else:
                    setattr(obj, name, orig)
            except Exception:
                pass
