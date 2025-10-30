# backend/app/repositories/item_repository.py
from __future__ import annotations
from typing import Any, Dict, List, Optional
import asyncio

# Tests patch THIS attribute:
db_service: Any = None

# Back-compat alias if other code references item_service internally
item_service: Any = None  # not used by tests, but we'll fall back to it

# Simple module-level caches expected by tests
_all_items_cache: Dict[str, List[Dict[str, Any]]] = {}
_item_cache: Dict[int, Dict[str, Any]] = {}

def _svc() -> Any:
    # Prefer db_service (what tests patch); fall back to item_service if set.
    return db_service or item_service

def get_all_items() -> List[Dict[str, Any]]:
    if "all" in _all_items_cache:
        return _all_items_cache["all"]
    svc = _svc()
    if svc is None:
        return []
    items = svc.get_all_items()
    _all_items_cache["all"] = items
    return items

def get_item(item_id: int) -> Optional[Dict[str, Any]]:
    if item_id in _item_cache:
        return _item_cache[item_id]
    svc = _svc()
    if svc is None:
        return None
    it = svc.get_item(item_id)
    _item_cache[item_id] = it
    return it

def search_items(query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    svc = _svc()
    if svc is None:
        return []
    return svc.search_items(query, limit)

# ---------------- Async variants ----------------

async def get_all_items_async() -> List[Dict[str, Any]]:
    if "all" in _all_items_cache:
        return _all_items_cache["all"]
    svc = _svc()
    if svc is None:
        return []
    if hasattr(svc, "get_all_items_async"):
        items = await svc.get_all_items_async()
    else:
        loop = asyncio.get_running_loop()
        items = await loop.run_in_executor(None, svc.get_all_items)
    _all_items_cache["all"] = items
    return items

async def get_item_async(item_id: int) -> Optional[Dict[str, Any]]:
    if item_id in _item_cache:
        return _item_cache[item_id]
    svc = _svc()
    if svc is None:
        return None
    if hasattr(svc, "get_item_async"):
        it = await svc.get_item_async(item_id)
    else:
        loop = asyncio.get_running_loop()
        it = await loop.run_in_executor(None, svc.get_item, item_id)
    _item_cache[item_id] = it
    return it

async def search_items_async(query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    svc = _svc()
    if svc is None:
        return []
    if hasattr(svc, "search_items_async"):
        return await svc.search_items_async(query, limit)
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, svc.search_items, query, limit)

# Warmup used by tests on app startup
def _warm_cache() -> None:
    items = get_all_items()
    _all_items_cache["all"] = items
