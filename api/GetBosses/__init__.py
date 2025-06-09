import json
import azure.functions as func
from .. import common  # noqa: F401
from app.repositories import boss_repository

async def main(req: func.HttpRequest) -> func.HttpResponse:
    bosses = boss_repository.get_all_bosses()
    return func.HttpResponse(json.dumps(bosses), mimetype="application/json")
