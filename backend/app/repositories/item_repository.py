from typing import Any, Dict, List, Optional

from cachetools import TTLCache, cached

from ..database import azure_sql_service as db_service
from ..config.settings import CACHE_TTL_SECONDS

_all_items_cache = TTLCache(maxsize=32, ttl=CACHE_TTL_SECONDS)
_item_cache = TTLCache(maxsize=512, ttl=CACHE_TTL_SECONDS)


@cached(_all_items_cache)
def get_all_items(combat_only: bool = True, tradeable_only: bool = False) -> List[Dict[str, Any]]:
    """Return all items with optional filters, using an in-memory cache."""
    return db_service.get_all_items(combat_only=combat_only, tradeable_only=tradeable_only)


@cached(_item_cache)
def get_item(item_id: int) -> Optional[Dict[str, Any]]:
    """Return a single item by id, cached for the configured TTL."""
    return db_service.get_item(item_id)


def search_items(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    return db_service.search_items(query, limit=limit)
