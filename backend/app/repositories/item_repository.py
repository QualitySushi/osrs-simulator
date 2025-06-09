from typing import Any, Dict, List, Optional

from ..database import azure_sql_service as db_service


def get_all_items(combat_only: bool = True, tradeable_only: bool = False) -> List[Dict[str, Any]]:
    return db_service.get_all_items(combat_only=combat_only, tradeable_only=tradeable_only)


def get_item(item_id: int) -> Optional[Dict[str, Any]]:
    return db_service.get_item(item_id)


def search_items(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    return db_service.search_items(query, limit=limit)
