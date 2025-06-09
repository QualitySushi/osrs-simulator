import azure.functions as func
from .. import common  # noqa: F401
from ..common import json_response
from app.services import seed_service

async def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        payload = req.get_json()
    except ValueError:
        return func.HttpResponse("Invalid JSON", status_code=400)
    seed = payload.get('seed')
    if not seed:
        return func.HttpResponse("seed is required", status_code=400)
    try:
        params = seed_service.decode_seed(seed)
        return json_response(params.model_dump(exclude_none=True))
    except Exception as e:
        return func.HttpResponse(str(e), status_code=400)
