# backend/app/main.py
import os
import asyncio
import logging
from typing import Dict, Any, List
from pathlib import Path

# 1) Load .env BEFORE importing anything that might touch the DB
from dotenv import load_dotenv

# load backend/.env explicitly
ROOT = Path(__file__).resolve().parents[2]   # .../osrs-simulator
ENV_PATH = ROOT / "backend" / ".env"
load_dotenv(ENV_PATH.as_posix(), override=True)

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# 2) Now import your app modules (safe: env is loaded)
from .repositories import item_repository, boss_repository, special_attack_repository, passive_effect_repository
from .config.settings import CACHE_TTL_SECONDS
from .models import DpsResult, Boss, BossSummary, Item, ItemSummary, DpsParameters
from .services import calculation_service, seed_service, bis_service
from .agent import run_agent_chat

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger("uvicorn.error")

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

# Optional: serve static images
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMAGES_DIR = os.path.join(BASE_DIR, "frontend", "public", "images")
if os.path.isdir(IMAGES_DIR):
    app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")

# -------- Agent chat endpoint --------
class ChatTurn(BaseModel):
    messages: list[dict]  # [{"role":"user","content":"..."}]; keep thread on FE

@app.post("/chat")
def chat(turn: ChatTurn):
    result = run_agent_chat(turn.messages)
    return result

# ---------- Startup: optional DB probe + cache warmup ----------
_preload_task: asyncio.Task | None = None

@app.on_event("startup")
async def _startup() -> None:
    # (Optional but recommended) prove DB is reachable with a quick query.
    # Comment this block out if your repos handle connection pooling internally.
    try:
        import pyodbc
        cs = (os.getenv("SQLAZURECONNSTR_DefaultConnection")
              or os.getenv("DB_CONNECTION_STRING")
              or os.getenv("AZURE_SQL_CONNECTION_STRING"))
        if not cs:
            raise RuntimeError("No DB connection string set in environment.")
        # One-shot probe (fast): connect, SELECT 1, close.
        cn = pyodbc.connect(cs, timeout=10)
        cur = cn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        cn.close()
        log.info("Azure SQL: connection OK.")
    except Exception as e:
        # Fail fast with a clear reason; comment out 'raise' if you want app to boot w/o DB
        log.exception("Azure SQL: configuration/connection failed: %s", e)
        raise

    # After DB is confirmed, warm caches (don’t crash app if warmup fails)
    if os.getenv("OSRS_SKIP_PRELOAD") == "1":
        log.info("Skipping cache warmup (OSRS_SKIP_PRELOAD=1).")
        return
    try:
        await boss_repository.get_all_bosses_async()
        await item_repository.get_all_items_async(combat_only=False)
        log.info("Cache warmup complete.")
    except Exception as e:
        log.warning("Cache warmup failed (continuing): %s", e)

@app.on_event("shutdown")
async def on_shutdown() -> None:
    global _preload_task
    if _preload_task and not _preload_task.done():
        _preload_task.cancel()
        try:
            await _preload_task
        except asyncio.CancelledError:
            pass
        finally:
            _preload_task = None

# ---------- routes ----------
@app.get("/", tags=["General"])
def read_root():
    return {
        "message": "Welcome to the ScapeLab DPS Calculator API",
        "version": "1.0.0",
        "endpoints": {
            "GET /": "This welcome message",
            "POST /calculate/dps": "Calculate DPS based on parameters",
            "GET /npcs": "Get a list of all NPCs",
            "GET /npc/{npc_id}": "Get details for a specific NPC",
            "GET /items": "Get a list of all items (with optional filters)",
            "GET /item/{item_id}": "Get details for a specific item",
            "GET /search/npcs": "Search for NPCs by name",
            "GET /search/items": "Search for items by name",
        },
    }

@app.post("/calculate/dps", response_model=DpsResult, tags=["DPS"])
async def calculate_dps(params: DpsParameters):
    try:
        result = calculation_service.calculate_dps(params.model_dump(exclude_none=True))
        return DpsResult(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/import-seed", response_model=DpsParameters, tags=["Seed"])
async def import_seed(payload: Dict[str, str]):
    seed = payload.get("seed")
    if not seed:
        raise HTTPException(status_code=400, detail="seed is required")
    try:
        params = seed_service.decode_seed(seed)
        return params.model_dump(exclude_none=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/calculate/seed", response_model=DpsResult, tags=["Seed"])
async def calculate_dps_from_seed(payload: Dict[str, str]):
    seed = payload.get("seed")
    if not seed:
        raise HTTPException(status_code=400, detail="seed is required")
    try:
        params = seed_service.decode_seed(seed)
        result = calculation_service.calculate_dps(params.model_dump(exclude_none=True))
        return DpsResult(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/bis", tags=["BIS"])
async def get_best_in_slot(params: DpsParameters):
    try:
        setup = await bis_service.suggest_bis_async(params.model_dump(exclude_none=True))
        return setup
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/npcs", response_model=List[BossSummary], tags=["NPCs"])
async def get_npcs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    try:
        bosses = await boss_repository.get_all_bosses_async(limit=page_size, offset=(page - 1) * page_size)
        if not bosses:
            raise HTTPException(status_code=404, detail="No NPCs found")
        return bosses
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve NPCs: {str(e)}")

@app.get("/npcs/full", response_model=List[Boss], tags=["NPCs"])
async def get_npcs_full(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=100)):
    try:
        bosses = await boss_repository.get_bosses_with_forms_async(limit=page_size, offset=(page - 1) * page_size)
        return bosses or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve NPCs: {str(e)}")

@app.get("/npc/{npc_id}", response_model=Boss, tags=["NPCs"])
async def get_npc(npc_id: int, response: Response):
    try:
        boss = await boss_repository.get_boss_async(npc_id)
        response.headers["Cache-Control"] = f"public, max-age={CACHE_TTL_SECONDS}"
        if not boss:
            raise HTTPException(status_code=404, detail="NPC not found")
        return boss
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve NPC: {str(e)}")

@app.get("/npc/form/{form_id}", response_model=Boss, tags=["NPCs"])
async def get_npc_by_form(form_id: int, response: Response):
    try:
        boss = await boss_repository.get_boss_by_form_async(form_id)
        response.headers["Cache-Control"] = f"public, max-age={CACHE_TTL_SECONDS}"
        if not boss:
            raise HTTPException(status_code=404, detail="NPC form not found")
        return boss
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve NPC: {str(e)}")

@app.get("/items", response_model=List[ItemSummary], tags=["Items"])
async def get_items(
    response: Response,
    combat_only: bool = Query(True),
    tradeable_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    try:
        items = await item_repository.get_all_items_async(
            combat_only=combat_only,
            tradeable_only=tradeable_only,
            limit=page_size,
            offset=(page - 1) * page_size,
        )
        response.headers["Cache-Control"] = f"public, max-age={CACHE_TTL_SECONDS}"
        if not items:
            raise HTTPException(status_code=404, detail="No items found")
        return items
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve items: {str(e)}")

@app.get("/item/{item_id}", response_model=Item, tags=["Items"])
async def get_item(item_id: int, response: Response):
    try:
        item = await item_repository.get_item_async(item_id)
        response.headers["Cache-Control"] = f"public, max-age={CACHE_TTL_SECONDS}"
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return item
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve item: {str(e)}")

@app.get("/search/npcs", response_model=List[BossSummary], tags=["Search"])
async def search_npcs(query: str, limit: int | None = None):
    try:
        return await boss_repository.search_bosses_async(query, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/search/items", response_model=List[ItemSummary], tags=["Search"])
async def search_items(query: str, limit: int | None = None):
    try:
        return await item_repository.search_items_async(query, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/search/special-attacks", tags=["Search"])
async def search_special_attacks(query: str, limit: int | None = None):
    try:
        return special_attack_repository.search_special_attacks(query, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.post("/calculate/item-effect", tags=["DPS"])
async def calculate_item_effect(params: Dict[str, Any]):
    try:
        return calculation_service.calculate_item_effect(params)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/special-attacks", tags=["Items"])
async def get_special_attacks():
    try:
        data = special_attack_repository.get_all_special_attacks()
        return data or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve special attacks: {str(e)}")

@app.get("/passive-effects", tags=["Items"])
async def get_passive_effects():
    try:
        data = passive_effect_repository.get_all_passive_effects()
        return data or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve passive effects: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
