# backend/app/config/db_config.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env robustly regardless of cwd or uvicorn reloader
ROOT = Path(__file__).resolve().parents[2]   # .../osrs-simulator
ENV_PATH = ROOT / "backend" / ".env"
load_dotenv(ENV_PATH.as_posix(), override=True)

def get_db_conn_str() -> str:
    """
    Return a validated Azure SQL ODBC connection string.
    Tries common env var names and raises a clear error if missing.
    """
    for key in (
        "SQLAZURECONNSTR_DefaultConnection",  # Azure App Service convention
        "DB_CONNECTION_STRING",               # local override
        "AZURE_SQL_CONNECTION_STRING",        # alt name
    ):
        val = os.getenv(key)
        if val and val.strip():
            return val.strip()

    raise RuntimeError(
        "No DB connection string found. Set one of: "
        "SQLAZURECONNSTR_DefaultConnection, DB_CONNECTION_STRING, AZURE_SQL_CONNECTION_STRING "
        f"in {ENV_PATH}"
    )
