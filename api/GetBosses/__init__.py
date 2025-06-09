import azure.functions as func
from .. import common  # noqa: F401
from ..common import json_response
from app.repositories import boss_repository

async def main(req: func.HttpRequest) -> func.HttpResponse:
    page = int(req.params.get('page', '1'))
    page_size = int(req.params.get('page_size', '50'))
    bosses = boss_repository.get_all_bosses(limit=page_size, offset=(page - 1) * page_size)
    return json_response(bosses)
