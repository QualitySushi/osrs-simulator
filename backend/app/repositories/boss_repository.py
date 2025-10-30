# backend/app/repositories/boss_repository.py
from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

from ..services import boss_service as _real_boss_service  # type: ignore

boss_service = getattr(_real_boss_service, "boss_service", _real_boss_service)

_all_bosses_cache: Dict[str, List[Dict[str, Any]]] = {}
_boss_cache: Dict[int, Dict[str, Any]] = {}

def clear_caches() -> None:
    _all_bosses_cache.clear()
    _boss_cache.clear()

def get_all_bosses() -> List[Dict[str, Any]]:
    if "all" in _all_bosses_cache:
        return _all_bosses_cache["all"]
    bosses = boss_service.get_all_bosses()
    _all_bosses_cache["all"] = bosses
    return bosses

def get_boss(boss_id: int) -> Optional[Dict[str, Any]]:
    if boss_id in _boss_cache:
        return _boss_cache[boss_id]
    boss = boss_service.get_boss(boss_id)
    _boss_cache[boss_id] = boss
    return boss

def search_bosses(query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    return boss_service.search_bosses(query, limit)

async def get_all_bosses_async() -> List[Dict[str, Any]]:
    if "all" in _all_bosses_cache:
        return _all_bosses_cache["all"]
    getter = getattr(boss_service, "get_all_bosses_async", None)
    if asyncio.iscoroutinefunction(getter):
        bosses = await getter()  # type: ignore
    else:
        bosses = await asyncio.to_thread(boss_service.get_all_bosses)
    _all_bosses_cache["all"] = bosses
    return bosses

async def get_boss_async(boss_id: int) -> Optional[Dict[str, Any]]:
    if boss_id in _boss_cache:
        return _boss_cache[boss_id]
    getter = getattr(boss_service, "get_boss_async", None)
    if asyncio.iscoroutinefunction(getter):
        boss = await getter(boss_id)  # type: ignore
    else:
        boss = await asyncio.to_thread(boss_service.get_boss, boss_id)
    _boss_cache[boss_id] = boss
    return boss
