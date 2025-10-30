# backend/app/repositories/item_repository.py
from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

# Your real service; tests will monkeypatch this symbol with a MagicMock
from ..services import item_service as _real_item_service  # type: ignore

# Exposed service handle (tests patch this)
item_service = getattr(_real_item_service, "item_service", _real_item_service)

# Simple in-memory caches used by tests
_all_items_cache: Dict[str, List[Dict[str, Any]]] = {}
_item_cache: Dict[int, Dict[str, Any]] = {}

def clear_caches() -> None:
    _all_items_cache.clear()
    _item_cache.clear()

def get_all_items() -> List[Dict[str, Any]]:
    if "all" in _all_items_cache:
        return _all_items_cache["all"]
    items = item_service.get_all_items()
    _all_items_cache["all"] = items
    return items

def get_item(item_id: int) -> Optional[Dict[str, Any]]:
    if item_id in _item_cache:
        return _item_cache[item_id]
    item = item_service.get_item(item_id)
    _item_cache[item_id] = item
    return item

def search_items(query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    # tests assert search_items('dragon', None)
    return item_service.search_items(query, limit)

# Async variants—forward to service if it provides async, else run sync in thread
async def get_all_items_async() -> List[Dict[str, Any]]:
    if "all" in _all_items_cache:
        return _all_items_cache["all"]
    getter = getattr(item_service, "get_all_items_async", None)
    if asyncio.iscoroutinefunction(getter):
        items = await getter()  # type: ignore
    else:
        items = await asyncio.to_thread(item_service.get_all_items)
    _all_items_cache["all"] = items
    return items

async def get_item_async(item_id: int) -> Optional[Dict[str, Any]]:
    if item_id in _item_cache:
        return _item_cache[item_id]
    getter = getattr(item_service, "get_item_async", None)
    if asyncio.iscoroutinefunction(getter):
        item = await getter(item_id)  # type: ignore
    else:
        item = await asyncio.to_thread(item_service.get_item, item_id)
    _item_cache[item_id] = item
    return item
