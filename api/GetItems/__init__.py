import azure.functions as func
from .. import common  # noqa: F401
from ..common import json_response
from app.repositories import item_repository

async def main(req: func.HttpRequest) -> func.HttpResponse:
    combat_only = req.params.get('combat_only', 'true').lower() == 'true'
    tradeable_only = req.params.get('tradeable_only', 'false').lower() == 'true'
    page = int(req.params.get('page', '1'))
    page_size = int(req.params.get('page_size', '50'))
    items = item_repository.get_all_items(
        combat_only=combat_only,
        tradeable_only=tradeable_only,
        limit=page_size,
        offset=(page - 1) * page_size,
    )
    return json_response(items)
