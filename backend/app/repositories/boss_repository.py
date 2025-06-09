from typing import Any, Dict, List, Optional

from ..database import azure_sql_service as db_service


def get_all_bosses(limit: int | None = None, offset: int | None = None) -> List[Dict[str, Any]]:
    """Return bosses with optional pagination."""
    return db_service.get_all_bosses(limit=limit, offset=offset)


def get_boss(boss_id: int) -> Optional[Dict[str, Any]]:
    return db_service.get_boss(boss_id)


def search_bosses(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    return db_service.search_bosses(query, limit=limit)
