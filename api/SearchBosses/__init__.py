import json
import azure.functions as func
from .. import common  # noqa: F401
from app.repositories import boss_repository

async def main(req: func.HttpRequest) -> func.HttpResponse:
    query = req.params.get('query')
    if not query:
        return func.HttpResponse("Missing query", status_code=400)
    try:
        limit = int(req.params.get('limit', 10))
    except ValueError:
        return func.HttpResponse("Invalid limit", status_code=400)
    results = boss_repository.search_bosses(query, limit=limit)
    return func.HttpResponse(json.dumps(results), mimetype="application/json")
