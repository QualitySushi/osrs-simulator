import json
import azure.functions as func
from .. import common  # noqa: F401
from app.services import calculation_service

async def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        payload = req.get_json()
    except ValueError:
        return func.HttpResponse("Invalid JSON", status_code=400)
    try:
        result = calculation_service.calculate_item_effect(payload)
        return func.HttpResponse(json.dumps(result), mimetype="application/json")
    except Exception as e:
        return func.HttpResponse(str(e), status_code=400)
