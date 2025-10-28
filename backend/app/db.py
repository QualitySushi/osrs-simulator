# backend/app/db.py
import logging
from typing import Optional
import pyodbc

from .config.db_config import get_db_conn_str

_conn: Optional[pyodbc.Connection] = None

def get_conn() -> pyodbc.Connection:
    """Lazily create and cache a single pyodbc connection."""
    global _conn
    if _conn is not None:
        return _conn

    cs = get_db_conn_str()

    if "Driver=" not in cs or "ODBC Driver" not in cs:
        raise RuntimeError("Connection string missing Driver={ODBC Driver 18 for SQL Server};")

    if "Server=tcp:" not in cs:
        logging.getLogger("uvicorn.error").warning(
            "Connection string Server is not prefixed with 'tcp:'. Azure SQL requires TCP."
        )

    logging.getLogger("uvicorn.error").info("Opening Azure SQL connection via pyodbc...")
    _conn = pyodbc.connect(cs, timeout=10, autocommit=False)
    return _conn

def get_cursor() -> pyodbc.Cursor:
    return get_conn().cursor()
