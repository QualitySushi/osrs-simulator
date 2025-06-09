from typing import Any, Dict, List, Optional

from cachetools import TTLCache, cached

from ..database import azure_sql_service as db_service
from ..config.settings import CACHE_TTL_SECONDS

_all_items_cache = TTLCache(maxsize=1, ttl=CACHE_TTL_SECONDS)
_item_cache = TTLCache(maxsize=512, ttl=CACHE_TTL_SECONDS)


def _load_all_items() -> List[Dict[str, Any]]:
    """Load all items from the database and cache them."""
    items = _all_items_cache.get("all")
    if items is None:
        items = db_service.get_all_items(combat_only=False)
        _all_items_cache["all"] = items
    return items


def get_all_items(
    combat_only: bool = True,
    tradeable_only: bool = False,
    limit: int | None = None,
    offset: int | None = None,
) -> List[Dict[str, Any]]:
    """Return items with optional pagination using cached data."""
    items = _load_all_items()
    # Apply filters locally for the cached list
    if combat_only:
        items = [i for i in items if i.get("has_combat_stats")]
    if tradeable_only:
        items = [i for i in items if i.get("is_tradeable")]

    if limit is not None or offset is not None:
        off = offset or 0
        if limit is None:
            return items[off:]
        return items[off : off + limit]
    return items


@cached(_item_cache)
def get_item(item_id: int) -> Optional[Dict[str, Any]]:
    """Return a single item by id, cached for the configured TTL."""
    return db_service.get_item(item_id)


def search_items(query: str, limit: int | None = None) -> List[Dict[str, Any]]:
    """Search the cached item list."""
    items = _load_all_items()
    q = query.lower()
    results = [i for i in items if q in i["name"].lower()]
    if limit is not None:
        return results[:limit]
    return results
