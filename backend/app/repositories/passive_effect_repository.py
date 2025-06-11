from functools import lru_cache
import json
import re
from pathlib import Path
from typing import Dict, Optional, Any, List

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "passive_effects.json"


def _parse_objects(text: str) -> List[Dict[str, Any]]:
    """Parse potentially malformed JSON containing a list of objects."""
    decoder = json.JSONDecoder()
    i = 0
    objs = []
    while True:
        match = re.search(r"{", text[i:])
        if not match:
            break
        start = i + match.start()
        try:
            obj, end = decoder.raw_decode(text[start:])
            objs.append(obj)
            i = start + end
        except json.JSONDecodeError:
            i = start + 1
    return objs


@lru_cache(maxsize=1)
def _load_data() -> Dict[str, Any]:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        raw = f.read()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = _parse_objects(raw)

    result: Dict[str, Any] = {}
    for entry in data:
        name = entry.get("item_name")
        if not name:
            continue
        key = name.lower().replace(" ", "_")
        result[key] = entry
    return result


def get_passive_effect(item_name: str) -> Optional[Dict[str, Any]]:
    data = _load_data()
    key = item_name.lower().replace(" ", "_")
    return data.get(key)


def get_all_passive_effects() -> Dict[str, Any]:
    return _load_data()
