from functools import lru_cache
import json
from pathlib import Path
from typing import Dict, Optional, Any

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "special_attacks.json"

@lru_cache(maxsize=1)
def _load_data() -> Dict[str, Any]:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def get_special_attack(weapon_name: str) -> Optional[Dict[str, Any]]:
    """Return special attack data for a given weapon name."""
    data = _load_data()
    key = weapon_name.lower().replace(" ", "_")
    return data.get(key)
