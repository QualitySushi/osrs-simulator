from functools import lru_cache
import json
from pathlib import Path
from typing import Dict, Optional, Any

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "special_attacks_v3.json"

@lru_cache(maxsize=1)
def _load_data() -> Dict[str, Any]:
    """Load and index special attack data by normalized weapon name."""
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        items = json.load(f)

    data = {}
    for entry in items:
        name = entry.get("weapon_name", "").lower().replace(" ", "_")
        if name:
            data[name] = entry
    return data

def get_special_attack(weapon_name: str) -> Optional[Dict[str, Any]]:
    """Return special attack data for a given weapon name."""
    data = _load_data()
    key = weapon_name.lower().replace(" ", "_")
    return data.get(key)


def get_all_special_attacks() -> Dict[str, Any]:
    """Return dictionary of all special attacks keyed by normalized weapon name."""
    return _load_data()
