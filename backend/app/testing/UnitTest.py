"""
Two-phase test runner:
- Phase 1: API tests with repo stubs applied (DB-free, deterministic).
- Phase 2: Repository / services / other tests WITHOUT stubs.
Skips pytest-only modules that call pytest.skip() at import time.
"""

import unittest
import sys, os
from pathlib import Path

# --- Paths ---
HERE = Path(__file__).resolve()
REPO = next((p for p in [HERE, *HERE.parents] if (p / "backend").exists()), HERE.parent)
BACKEND = REPO / "backend"
APP = BACKEND / "app"
TESTING = APP / "testing"

for p in (REPO, BACKEND, APP, TESTING):
    s = str(p)
    if s not in sys.path:
        sys.path.insert(0, s)

# --- Safe env ---
os.environ.setdefault(
    "SQLAZURECONNSTR_DefaultConnection",
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=invalid;Database=tempdb;Uid=sa;Pwd=x;"
    "Encrypt=no;TrustServerCertificate=yes;Connection Timeout=1;"
)
os.environ.setdefault("OSRS_CI", "1")

from _db_stubs import apply_repo_stubs

loader = unittest.TestLoader()

API_MODULES = {"test_api", "test_api_contracts_extra", "test_search_items_bosses"}
EXCLUDE_MODULES = {"test_defence_reduction", "test_passive_effects_autodetect"}

def _flatten(suite: unittest.TestSuite):
    for test in suite:
        if isinstance(test, unittest.TestSuite):
            yield from _flatten(test)
        else:
            yield test

def _suite_for_modules(modnames) -> unittest.TestSuite:
    suite = unittest.TestSuite()
    for mod in modnames:
        suite.addTests(loader.discover(start_dir=str(TESTING), pattern=f"{mod}.py"))
    return suite

def _should_exclude_by_id(test_id: str) -> bool:
    mod_hint = test_id.split("::")[0]
    for name in EXCLUDE_MODULES:
        if (
            mod_hint == name
            or mod_hint.startswith(name + ".")
            or mod_hint.endswith("." + name)
            or f".{name}." in mod_hint
            or f"{name}:" in mod_hint
        ):
            return True
    return False

def _suite_rest() -> unittest.TestSuite:
    suite_all = unittest.TestSuite()
    suite_all.addTests(loader.discover(start_dir=str(TESTING), pattern="test*.py"))
    suite_all.addTests(loader.discover(start_dir=str(REPO),    pattern="test*.py"))

    rest = unittest.TestSuite()
    for case in _flatten(suite_all):
        tid = case.id()  # e.g., 'test_api.TestApiRoutes.test_bis' or 'backend.app.testing.test_x.Class.test_y'

        # Don't include Phase 1 modules in Phase 2
        skip_api = False
        for api_mod in API_MODULES:
            if (
                tid == api_mod
                or tid.startswith(api_mod + ".")      # <-- NEW: catches 'test_api.*'
                or tid.endswith("." + api_mod)
                or f".{api_mod}." in tid
            ):
                skip_api = True
                break
        if skip_api:
            continue

        # Exclude pytest-only modules that raise skip at import
        if _should_exclude_by_id(tid):
            continue

        rest.addTest(case)
    return rest

if __name__ == "__main__":
    print("\n=== Running all OSRS Simulator tests ===\n")

    runner = unittest.TextTestRunner(verbosity=2)

    print("== Phase 1: API tests (stubbed repos) ==")
    with apply_repo_stubs():
        r1 = runner.run(_suite_for_modules(API_MODULES))

    print("\n== Phase 2: Repository & service tests ==")
    r2 = runner.run(_suite_rest())

    sys.exit(0 if (r1.wasSuccessful() and r2.wasSuccessful()) else 1)
