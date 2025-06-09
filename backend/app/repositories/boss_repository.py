from typing import Any, Dict, List, Optional

from cachetools import TTLCache, cached

from ..database import azure_sql_service as db_service
from ..config.settings import CACHE_TTL_SECONDS

_all_bosses_cache = TTLCache(maxsize=8, ttl=CACHE_TTL_SECONDS)
_boss_cache = TTLCache(maxsize=256, ttl=CACHE_TTL_SECONDS)

def get_all_bosses(limit: int | None = None, offset: int | None = None) -> List[Dict[str, Any]]:
    """Return bosses with optional pagination."""
    return db_service.get_all_bosses(limit=limit, offset=offset)

@cached(_boss_cache)
def get_boss(boss_id: int) -> Optional[Dict[str, Any]]:
    """Return a specific boss by id, cached for the configured TTL."""
    return db_service.get_boss(boss_id)


def search_bosses(query: str, limit: int | None = None) -> List[Dict[str, Any]]:
    return db_service.search_bosses(query, limit=limit)
