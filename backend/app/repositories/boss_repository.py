from typing import Any, Dict, List, Optional

from ..database import db_service


def get_all_bosses() -> List[Dict[str, Any]]:
    return db_service.get_all_bosses()


def get_boss(boss_id: int) -> Optional[Dict[str, Any]]:
    return db_service.get_boss(boss_id)


def search_bosses(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    return db_service.search_bosses(query, limit=limit)
