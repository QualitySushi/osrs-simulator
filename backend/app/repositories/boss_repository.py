# backend/app/repositories/boss_repository.py
from __future__ import annotations
from typing import Any, Dict, List, Optional
import asyncio

boss_service: Any = None

_all_bosses_cache: Dict[str, List[Dict[str, Any]]] = {}
_boss_cache: Dict[int, Dict[str, Any]] = {}

def get_all_bosses() -> List[Dict[str, Any]]:
    if "all" in _all_bosses_cache:
        return _all_bosses_cache["all"]
    if boss_service is None:
        return []
    bosses = boss_service.get_all_bosses()
    _all_bosses_cache["all"] = bosses
    return bosses

def get_boss(boss_id: int) -> Optional[Dict[str, Any]]:
    if boss_id in _boss_cache:
        return _boss_cache[boss_id]
    if boss_service is None:
        return None
    b = boss_service.get_boss(boss_id)
    _boss_cache[boss_id] = b
    return b

def search_bosses(query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    if boss_service is None:
        return []
    return boss_service.search_bosses(query, limit)

# ---------------- Async variants ----------------

async def get_all_bosses_async() -> List[Dict[str, Any]]:
    if "all" in _all_bosses_cache:
        return _all_bosses_cache["all"]
    if boss_service is None:
        return []
    if hasattr(boss_service, "get_all_bosses_async"):
        bosses = await boss_service.get_all_bosses_async()
    else:
        loop = asyncio.get_running_loop()
        bosses = await loop.run_in_executor(None, boss_service.get_all_bosses)
    _all_bosses_cache["all"] = bosses
    return bosses

async def get_boss_async(boss_id: int) -> Optional[Dict[str, Any]]:
    if boss_id in _boss_cache:
        return _boss_cache[boss_id]
    if boss_service is None:
        return None
    if hasattr(boss_service, "get_boss_async"):
        b = await boss_service.get_boss_async(boss_id)
    else:
        loop = asyncio.get_running_loop()
        b = await loop.run_in_executor(None, boss_service.get_boss, boss_id)
    _boss_cache[boss_id] = b
    return b

async def search_bosses_async(query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    if boss_service is None:
        return []
    if hasattr(boss_service, "search_bosses_async"):
        return await boss_service.search_bosses_async(query, limit)
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, boss_service.search_bosses, query, limit)

def _warm_cache() -> None:
    bosses = get_all_bosses()
    _all_bosses_cache["all"] = bosses
