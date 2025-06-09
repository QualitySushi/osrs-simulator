import azure.functions as func
from .. import common  # noqa: F401
from ..common import json_response
from app.services import calculation_service

async def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        payload = req.get_json()
    except ValueError:
        return func.HttpResponse("Invalid JSON", status_code=400)
    try:
        result = calculation_service.calculate_item_effect(payload)
        return json_response(result)
    except Exception as e:
        return func.HttpResponse(str(e), status_code=400)
