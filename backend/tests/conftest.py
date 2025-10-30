# backend/tests/conftest.py
import sys
from pathlib import Path

# repo root = .../osrs-simulator
ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
TOOLS = ROOT / "tools"

for p in (str(ROOT), str(BACKEND), str(TOOLS)):
    if p not in sys.path:
        sys.path.insert(0, p)