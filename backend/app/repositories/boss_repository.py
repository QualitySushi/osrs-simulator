from typing import Any, Dict, List, Optional

from cachetools import TTLCache, cached

from ..database import azure_sql_service as db_service
from ..config.settings import CACHE_TTL_SECONDS

_all_bosses_cache = TTLCache(maxsize=1, ttl=CACHE_TTL_SECONDS)
_boss_cache = TTLCache(maxsize=256, ttl=CACHE_TTL_SECONDS)


def _load_all_bosses() -> List[Dict[str, Any]]:
    """Load all bosses from the database and cache them."""
    bosses = _all_bosses_cache.get("all")
    if bosses is None:
        bosses = db_service.get_all_bosses()
        _all_bosses_cache["all"] = bosses
    return bosses


def get_all_bosses(
    limit: int | None = None, offset: int | None = None
) -> List[Dict[str, Any]]:
    """Return bosses with optional pagination using cached data."""
    bosses = _load_all_bosses()
    if limit is not None or offset is not None:
        off = offset or 0
        if limit is None:
            return bosses[off:]
        return bosses[off : off + limit]
    return bosses

@cached(_boss_cache)
def get_boss(boss_id: int) -> Optional[Dict[str, Any]]:
    """Return a specific boss by id, cached for the configured TTL."""
    return db_service.get_boss(boss_id)


def search_bosses(query: str, limit: int | None = None) -> List[Dict[str, Any]]:
    """Search the cached boss list."""
    bosses = _load_all_bosses()
    q = query.lower()
    results = [b for b in bosses if q in b["name"].lower()]
    if limit is not None:
        return results[:limit]
    return results
