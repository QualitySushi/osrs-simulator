import json
import azure.functions as func
from .. import common  # noqa: F401
from app.repositories import item_repository

async def main(req: func.HttpRequest) -> func.HttpResponse:
    combat_only = req.params.get('combat_only', 'true').lower() == 'true'
    tradeable_only = req.params.get('tradeable_only', 'false').lower() == 'true'
    items = item_repository.get_all_items(combat_only=combat_only, tradeable_only=tradeable_only)
    return func.HttpResponse(json.dumps(items), mimetype="application/json")
