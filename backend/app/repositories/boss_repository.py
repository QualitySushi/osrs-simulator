from typing import Any, Dict, List, Optional

from cachetools import TTLCache, cached

from ..database import azure_sql_service as db_service
from ..config.settings import CACHE_TTL_SECONDS

_all_bosses_cache = TTLCache(maxsize=8, ttl=CACHE_TTL_SECONDS)
_boss_cache = TTLCache(maxsize=256, ttl=CACHE_TTL_SECONDS)


@cached(_all_bosses_cache)
def get_all_bosses() -> List[Dict[str, Any]]:
    """Return the list of bosses, cached for the configured TTL."""
    return db_service.get_all_bosses()


@cached(_boss_cache)
def get_boss(boss_id: int) -> Optional[Dict[str, Any]]:
    """Return a specific boss by id, cached for the configured TTL."""
    return db_service.get_boss(boss_id)


def search_bosses(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    return db_service.search_bosses(query, limit=limit)
