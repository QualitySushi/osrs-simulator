# backend/app/repositories/boss_repository.py
from __future__ import annotations
from typing import Any, Dict, List, Optional
import asyncio

class _DefaultBossService:
    def get_all_bosses(self) -> List[Dict]:
        return []

    def get_boss(self, boss_id: int) -> Optional[Dict]:
        return None

    def search_bosses(self, query: str, limit: Optional[int] = None) -> List[Dict]:
        return []

    async def get_all_bosses_async(self) -> List[Dict]:
        return self.get_all_bosses()

    async def get_boss_async(self, boss_id: int) -> Optional[Dict]:
        return self.get_boss(boss_id)

# Tests patch this with MagicMock
boss_service: Any = _DefaultBossService()

_all_bosses_cache: Optional[List[Dict]] = None
_boss_cache: Dict[int, Dict] = {}

# ---------- Sync ----------
def get_all_bosses() -> List[Dict]:
    global _all_bosses_cache
    if _all_bosses_cache is not None:
        return _all_bosses_cache
    _all_bosses_cache = boss_service.get_all_bosses()
    return _all_bosses_cache

def get_boss(boss_id: int) -> Optional[Dict]:
    if boss_id in _boss_cache:
        return _boss_cache[boss_id]
    b = boss_service.get_boss(boss_id)
    if b is not None:
        _boss_cache[boss_id] = b
    return b

def search_bosses(query: str, limit: Optional[int] = None) -> List[Dict]:
    return boss_service.search_bosses(query, limit)

# ---------- Async ----------
async def get_all_bosses_async() -> List[Dict]:
    global _all_bosses_cache
    if _all_bosses_cache is not None:
        return _all_bosses_cache
    res = await _maybe_await(boss_service.get_all_bosses_async())
    _all_bosses_cache = res
    return res

async def get_boss_async(boss_id: int) -> Optional[Dict]:
    if boss_id in _boss_cache:
        return _boss_cache[boss_id]
    b = await _maybe_await(boss_service.get_boss_async(boss_id))
    if b is not None:
        _boss_cache[boss_id] = b
    return b

async def _maybe_await(x):
    if asyncio.iscoroutine(x):
        return await x
    return x

def warmup_caches() -> None:
    global _all_bosses_cache
    _all_bosses_cache = boss_service.get_all_bosses()
