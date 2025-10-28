import os
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class Health(BaseModel):
    ok: bool
    env: str
    db_ok: bool

@router.get("/healthz", response_model=Health)
async def healthz():
    env = os.getenv("APP_ENV", "dev")
    disable = os.getenv("DISABLE_DB_ON_STARTUP", "0") == "1"
    db_ok = False
    if not disable and env != "test":
        try:
            import pyodbc
            cs = os.getenv("SQLAZURECONNSTR_DefaultConnection")
            if cs:
                cn = pyodbc.connect(cs, timeout=3)
                cn.close()
                db_ok = True
        except Exception:
            db_ok = False
    return Health(ok=True, env=env, db_ok=db_ok)
