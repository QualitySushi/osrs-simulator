import os
import sys
import json
import azure.functions as func

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_PATH = os.path.join(BASE_DIR, 'backend')
if BACKEND_PATH not in sys.path:
    sys.path.append(BACKEND_PATH)


def json_response(data, status_code: int = 200) -> func.HttpResponse:
    """Return a JSON response with permissive CORS headers."""
    return func.HttpResponse(
        json.dumps(data),
        status_code=status_code,
        mimetype="application/json",
        headers={"Access-Control-Allow-Origin": "*"},
    )
