import azure.functions as func
from .. import common  # noqa: F401
from ..common import json_response
from app.repositories import item_repository

async def main(req: func.HttpRequest) -> func.HttpResponse:
    query = req.params.get('query')
    if not query:
        return func.HttpResponse("Missing query", status_code=400)
    try:
        limit = int(req.params.get('limit', 10))
    except ValueError:
        return func.HttpResponse("Invalid limit", status_code=400)
    results = item_repository.search_items(query, limit=limit)
    return json_response(results)
