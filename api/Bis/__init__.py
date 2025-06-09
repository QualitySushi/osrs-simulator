import azure.functions as func
from .. import common  # noqa: F401
from ..common import json_response
from app.services import bis_service
from app.models import DpsParameters

async def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        payload = req.get_json()
    except ValueError:
        return func.HttpResponse("Invalid JSON", status_code=400)
    params = DpsParameters(**payload)
    try:
        setup = bis_service.suggest_bis(params.model_dump(exclude_none=True))
        return json_response(setup)
    except Exception as e:
        return func.HttpResponse(str(e), status_code=400)
