import azure.functions as func
import sys
import os

# Add backend directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_PATH = os.path.join(BASE_DIR, 'backend')
if BACKEND_PATH not in sys.path:
    sys.path.append(BACKEND_PATH)

from app.main import app  # type: ignore

async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(app).handle_async(req, context)
