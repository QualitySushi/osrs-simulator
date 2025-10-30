# backend/app/repositories/item_repository.py
from __future__ import annotations
from typing import Any, Dict, List, Optional
import asyncio

# ---------- Public, mockable service handle ----------
# Tests will replace this with a MagicMock that implements the same methods.
class _DefaultItemService:
    # These are *only* fallbacks; tests patch this with MagicMocks.
    def get_all_items(self, combat_only: bool = False, tradeable_only: Optional[bool] = None) -> List[Dict[str, Any]]:
        return []

    def get_item(self, item_id: int) -> Optional[Dict[str, Any]]:
        return None

    def search_items(self, query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        return []

    async def get_all_items_async(self, combat_only: bool = False, tradeable_only: Optional[bool] = None) -> List[Dict[str, Any]]:
        return self.get_all_items(combat_only, tradeable_only)

    async def get_item_async(self, item_id: int) -> Optional[Dict[str, Any]]:
        return self.get_item(item_id)

# NOTE: tests set this to a MagicMock instance.
item_service: Any = _DefaultItemService()

# ---------- Simple in-memory caches used by tests ----------
_all_items_cache: Dict[str, List[Dict[str, Any]]] = {}
_item_cache: Dict[int, Dict[str, Any]] = {}

def _all_key(combat_only: bool, tradeable_only: Optional[bool]) -> str:
    return f"all|combat={int(bool(combat_only))}|tradeable={tradeable_only}"

# ---------- Sync API ----------
def get_all_items(combat_only: bool = False, tradeable_only: Optional[bool] = None) -> List[Dict[str, Any]]:
    key = _all_key(combat_only, tradeable_only)
    cached = _all_items_cache.get(key)
    if cached is not None:
        return cached
    # must call through the service so tests can assert call_count
    items = item_service.get_all_items(combat_only, tradeable_only)
    _all_items_cache[key] = items
    return items

def get_item(item_id: int) -> Optional[Dict[str, Any]]:
    if item_id in _item_cache:
        return _item_cache[item_id]
    itm = item_service.get_item(item_id)
    if itm is not None:
        _item_cache[item_id] = itm
    return itm

def search_items(query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    # direct passthrough (no caching) — tests check that this delegates
    return item_service.search_items(query, limit)

# ---------- Async API ----------
async def get_all_items_async(combat_only: bool = False, tradeable_only: Optional[bool] = None) -> List[Dict[str, Any]]:
    key = _all_key(combat_only, tradeable_only)
    cached = _all_items_cache.get(key)
    if cached is not None:
        return cached
    items = await _maybe_await(item_service.get_all_items_async(combat_only, tradeable_only))
    _all_items_cache[key] = items
    return items

async def get_item_async(item_id: int) -> Optional[Dict[str, Any]]:
    if item_id in _item_cache:
        return _item_cache[item_id]
    itm = await _maybe_await(item_service.get_item_async(item_id))
    if itm is not None:
        _item_cache[item_id] = itm
    return itm

# ---------- Helpers ----------
async def _maybe_await(x):
    if asyncio.iscoroutine(x):
        return await x
    return x

def warmup_caches() -> None:
    # Called on app startup (tests expect this to populate _all_items_cache)
    _all_items_cache["all|combat=0|tradeable=None"] = item_service.get_all_items(False, None)
