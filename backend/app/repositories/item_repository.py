from typing import Any, Dict, List, Optional
import asyncio

from cachetools import TTLCache

from ..database import azure_sql_service as db_service
from ..config.settings import CACHE_TTL_SECONDS

_all_items_cache = TTLCache(maxsize=1, ttl=CACHE_TTL_SECONDS)
_item_cache = TTLCache(maxsize=512, ttl=CACHE_TTL_SECONDS)


async def _load_all_items_async() -> List[Dict[str, Any]]:
    """Async helper to load all items and cache them."""
    items = _all_items_cache.get("all")
    if items is None:
        items = await db_service.get_all_items_async(combat_only=False)
        _all_items_cache["all"] = items
    return items


async def get_all_items_async(
    combat_only: bool = True,
    tradeable_only: bool = False,
    limit: int | None = None,
    offset: int | None = None,
) -> List[Dict[str, Any]]:
    """Async version of :func:`get_all_items` with caching."""
    items = await _load_all_items_async()

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


async def get_item_async(item_id: int) -> Optional[Dict[str, Any]]:
    """Async version of :func:`get_item` with cache fallback."""
    item = _item_cache.get(item_id)
    if item is not None:
        return item

    item = await db_service.get_item_async(item_id)
    if item is not None:
        _item_cache[item_id] = item
    return item


async def search_items_async(
    query: str, limit: int | None = None
) -> List[Dict[str, Any]]:
    return await db_service.search_items_async(query, limit)
