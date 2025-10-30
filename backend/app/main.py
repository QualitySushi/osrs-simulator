import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Routers
# Prefer absolute 'app.routers' when tests add backend/ to PYTHONPATH; fall back to relative.
try:
    from app.routers import catalog
except Exception:  # pragma: no cover
    from .routers import catalog  # type: ignore

# Project imports
from .repositories import (
    item_repository,
    boss_repository,
    special_attack_repository,
    passive_effect_repository,
)
from .config.settings import CACHE_TTL_SECONDS  # if unused, you can remove
from .models import DpsResult, Boss, BossSummary, Item, ItemSummary, DpsParameters
from .services import calculation_service, seed_service, bis_service

# Middleware
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
    BASE_DIR = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    static_dir = os.path.join(BASE_DIR, "static")
    if os.path.isdir(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    # Health routes
    try:
        from .routes.health import router as health_router  # keep existing layout
        app.include_router(health_router, prefix="")
    except Exception:
        # If your health route actually lives under routers/, fall back cleanly
        try:
            from .routers.health import router as health_router  # type: ignore
            app.include_router(health_router, prefix="")
        except Exception:
            pass

    # Catalog/API routes
    app.include_router(catalog.router)

    # Startup (DB connect) guarded for tests
    @app.on_event("startup")
    async def _startup():
        # Respect CI/test guard rails
        if os.getenv("DISABLE_STARTUP_DB_CONNECT") == "1" or os.getenv("SCAPELAB_TESTING") == "1":
            logging.info("[startup] Skipping DB init (guarded by DISABLE_STARTUP_DB_CONNECT/SCAPELAB_TESTING)")
            return

        cs = os.getenv("SQLAZURECONNSTR_DefaultConnection")
        if not cs:
            logging.warning("[startup] No SQLAZURECONNSTR_DefaultConnection set.")
            return

        # Import pyodbc only when needed (avoids import cost/errors in tests)
        try:
            import pyodbc  # local import
            logging.info("[startup] Connecting to Azure SQL…")
            cn = pyodbc.connect(cs, timeout=10)
            cn.close()
            logging.info("[startup] DB connection OK")
        except Exception as e:  # pragma: no cover
            logging.exception("[startup] DB connection failed: %s", e)
            # Consider raising in prod if DB is mandatory

    return app


# Default app for ASGI servers
app = create_app()
