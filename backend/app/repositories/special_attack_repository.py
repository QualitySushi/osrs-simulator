import json
from pathlib import Path
from typing import Dict, Optional, Any, List

from cachetools import TTLCache

from ..config.settings import CACHE_TTL_SECONDS

_data_cache: TTLCache[str, Dict[str, Any]] = TTLCache(maxsize=1, ttl=CACHE_TTL_SECONDS)

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "special_attacks.json"


def _load_data() -> Dict[str, Any]:
    data = _data_cache.get("all")
    if data is not None:
        return data

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)

    if isinstance(raw, list):
        data = {}
        for entry in raw:
            name = entry.get("weapon_name")
            if not name:
                continue
            key = name.lower().replace(" ", "_")
            data[key] = entry
    else:
        data = raw

    _data_cache["all"] = data
    return data

def get_special_attack(weapon_name: str) -> Optional[Dict[str, Any]]:
    """Return special attack data for a given weapon name."""
    data = _load_data()
    key = weapon_name.lower().replace(" ", "_")
    return data.get(key)


def search_special_attacks(query: str, limit: int | None = None) -> List[Dict[str, Any]]:
    """Return special attack entries whose weapon names contain the query."""
    data = _load_data()
    q = query.lower().replace(" ", "_")
    results = [v for k, v in data.items() if q in k]
    if limit is not None:
        return results[:limit]
    return results


def get_all_special_attacks() -> Dict[str, Any]:
    """Return the entire special attack dataset."""
    return _load_data()
