import azure.functions as func
from .. import common  # noqa: F401
from ..common import json_response
from app.models import DpsParameters
from app.services import calculation_service

async def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        payload = req.get_json()
    except ValueError:
        return func.HttpResponse("Invalid JSON", status_code=400)
    params = DpsParameters(**payload)
    result = calculation_service.calculate_dps(params.model_dump(exclude_none=True))
    return json_response(result)
