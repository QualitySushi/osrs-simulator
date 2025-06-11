from functools import lru_cache
import json
from pathlib import Path
from typing import Dict, Optional, Any

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "special_attacks.json"

@lru_cache(maxsize=1)
def _load_data() -> Dict[str, Any]:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)

    # Dataset may be a list of objects; convert to a lookup dict
    if isinstance(raw, list):
        data: Dict[str, Any] = {}
        for entry in raw:
            name = entry.get("weapon_name")
            if not name:
                continue
            key = name.lower().replace(" ", "_")
            data[key] = entry
        return data

    return raw

def get_special_attack(weapon_name: str) -> Optional[Dict[str, Any]]:
    """Return special attack data for a given weapon name."""
    data = _load_data()
    key = weapon_name.lower().replace(" ", "_")
    return data.get(key)


def get_all_special_attacks() -> Dict[str, Any]:
    """Return the entire special attack dataset."""
    return _load_data()
