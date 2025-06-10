from typing import Any, Dict, List, Optional
import asyncio

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


def get_boss_by_form(form_id: int) -> Optional[Dict[str, Any]]:
    """Return boss details by looking up a form id."""
    boss_id = db_service.get_boss_id_by_form(form_id)
    if boss_id is None:
        return None
    return get_boss(boss_id)


def search_bosses(query: str, limit: int | None = None) -> List[Dict[str, Any]]:
    """Search bosses directly using the database service."""
    return db_service.search_bosses(query, limit)


async def get_all_bosses_async(
    limit: int | None = None, offset: int | None = None
) -> List[Dict[str, Any]]:
    return await db_service.get_all_bosses_async(limit=limit, offset=offset)


async def get_boss_async(boss_id: int) -> Optional[Dict[str, Any]]:
    return await db_service.get_boss_async(boss_id)


async def get_boss_by_form_async(form_id: int) -> Optional[Dict[str, Any]]:
    boss_id = await db_service.get_boss_id_by_form_async(form_id)
    if boss_id is None:
        return None
    return await get_boss_async(boss_id)


async def search_bosses_async(query: str, limit: int | None = None) -> List[Dict[str, Any]]:
    return await db_service.search_bosses_async(query, limit)
