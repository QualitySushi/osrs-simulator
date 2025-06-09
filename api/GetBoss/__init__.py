import json
import azure.functions as func
from .. import common  # noqa: F401
from app.repositories import boss_repository

async def main(req: func.HttpRequest) -> func.HttpResponse:
    boss_id = req.route_params.get('id')
    if not boss_id:
        return func.HttpResponse("Missing boss id", status_code=400)
    try:
        boss_id = int(boss_id)
    except ValueError:
        return func.HttpResponse("Invalid boss id", status_code=400)
    boss = boss_repository.get_boss(boss_id)
    if not boss:
        return func.HttpResponse("Not found", status_code=404)
    return func.HttpResponse(json.dumps(boss), mimetype="application/json")
