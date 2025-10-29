import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Existing project imports (keep these)
from .repositories import (
    item_repository,
    boss_repository,
    special_attack_repository,
    passive_effect_repository,
)
from .config.settings import CACHE_TTL_SECONDS  # if unused, you can remove
from .models import DpsResult, Boss, BossSummary, Item, ItemSummary, DpsParameters
from .services import calculation_service, seed_service, bis_service

# New middleware
from .middleware.cache_headers import CacheHeadersMiddleware
from .middleware.rate_limit import RateLimitMiddleware

from .config.settings import SETTINGS  # this module calls load_dotenv() once and sets defaults
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

def create_app() -> FastAPI:
    app = FastAPI(
        title="ScapeLab DPS Calculator API",
        description="API for calculating DPS in Old School RuneScape",
        version="1.0.0",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # tighten in prod
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Rate limiting (simple token bucket per-IP)
    app.add_middleware(RateLimitMiddleware, rate=10, per_seconds=1, burst=30)

    # Default cache headers (applies only to whitelisted routes)
    app.add_middleware(
        CacheHeadersMiddleware,
        path_ttls={
            "/items": 86400,
            "/npcs": 86400,
            "/effects": 3600,
            "/search/items": 600,
            "/search/npcs": 600,
        },
        default_ttl=None,  # don’t auto-cache everything
    )

    # Optional: serve /static if present
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    static_dir = os.path.join(BASE_DIR, "static")
    if os.path.isdir(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    # Health routes
    from .routes.health import router as health_router
    app.include_router(health_router, prefix="")

    # Startup (DB connect) guarded for tests
    @app.on_event("startup")
    async def _startup():
        import pyodbc

        disable = os.getenv("DISABLE_DB_ON_STARTUP", "0") == "1"
        is_test = os.getenv("APP_ENV", "").lower() == "test"

        if disable or is_test:
            logging.info("[startup] Skipping DB init (DISABLE_DB_ON_STARTUP or APP_ENV=test)")
            return

        cs = os.getenv("SQLAZURECONNSTR_DefaultConnection")
        if not cs:
            logging.warning("[startup] No SQLAZURECONNSTR_DefaultConnection set.")
            return

        try:
            logging.info("[startup] Connecting to Azure SQL…")
            cn = pyodbc.connect(cs, timeout=10)
            cn.close()
            logging.info("[startup] DB connection OK")
        except Exception as e:
            logging.exception("[startup] DB connection failed: %s", e)
            # Consider raising in prod if DB is mandatory

    return app


# Default app for ASGI servers
app = create_app()
