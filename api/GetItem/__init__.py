import azure.functions as func
from .. import common  # noqa: F401
from ..common import json_response
from app.repositories import item_repository

async def main(req: func.HttpRequest) -> func.HttpResponse:
    item_id = req.route_params.get('id')
    if not item_id:
        return func.HttpResponse("Missing item id", status_code=400)
    try:
        item_id = int(item_id)
    except ValueError:
        return func.HttpResponse("Invalid item id", status_code=400)
    item = item_repository.get_item(item_id)
    if not item:
        return func.HttpResponse("Not found", status_code=404)
    return json_response(item)
