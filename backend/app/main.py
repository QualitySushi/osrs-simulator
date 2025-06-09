from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Dict, Any, List
import os
from dotenv import load_dotenv

# Load environment variables from a .env file if present
load_dotenv()

from .repositories import item_repository, boss_repository
from .models import (
    DpsResult, 
    Boss, 
    BossSummary, 
    Item, 
    ItemSummary,
    DpsParameters
)
from .services import calculation_service
from .services import seed_service
from .services import bis_service

# Create the FastAPI app
app = FastAPI(
    title="OSRS DPS Calculator API",
    description="API for calculating DPS in Old School RuneScape",
    version="1.0.0"
)

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static images for the frontend via the API
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMAGES_DIR = os.path.join(BASE_DIR, "frontend", "public", "images")
if os.path.isdir(IMAGES_DIR):
    app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")

@app.get("/", tags=["General"])
def read_root():
    """Get a welcome message and basic API information."""
    return {
        "message": "Welcome to the OSRS DPS Calculator API",
        "version": "1.0.0",
        "endpoints": {
            "GET /": "This welcome message",
            "POST /calculate/dps": "Calculate DPS based on parameters",
            "GET /bosses": "Get a list of all bosses",
            "GET /boss/{boss_id}": "Get details for a specific boss",
            "GET /items": "Get a list of all items (with optional filters)",
            "GET /item/{item_id}": "Get details for a specific item",
            "GET /search/bosses": "Search for bosses by name",
            "GET /search/items": "Search for items by name"
        }
    }

@app.post("/calculate/dps", response_model=DpsResult, tags=["DPS"])
async def calculate_dps(params: DpsParameters):
    """
    Calculate DPS based on combat parameters.
    
    This endpoint accepts parameters for melee, ranged, or magic combat and 
    returns detailed DPS calculations including intermediate values.
    """
    try:
        # Convert Pydantic model to dict for the calculator
        params_dict = params.model_dump(exclude_none=True)
        
        # Calculate DPS
        result = calculation_service.calculate_dps(params_dict)
        
        return DpsResult(**result)
    except Exception as e:
        # Handle calculation errors
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/import-seed", response_model=DpsParameters, tags=["Seed"])
async def import_seed(payload: Dict[str, str]):
    """Import a base64 encoded seed and return the parsed parameters."""
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
    """Calculate DPS directly from a seed payload."""
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
    """Return a naive best-in-slot recommendation based on parameters."""
    try:
        setup = bis_service.suggest_bis(params.model_dump(exclude_none=True))
        return setup
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/bosses", response_model=List[BossSummary], tags=["Bosses"])
async def get_bosses():
    """
    Get a list of all bosses.
    
    Returns a list of boss summaries with basic information.
    """
    try:
        bosses = boss_repository.get_all_bosses()
        
        # If no bosses are found in the database, return mock data
        if not bosses:
            return [
                BossSummary(id=1, name="Zulrah", raid_group=None, location="Zul-Andra", has_multiple_forms=True),
                BossSummary(id=2, name="Vorkath", raid_group=None, location="Ungael", has_multiple_forms=False),
                BossSummary(id=3, name="Verzik Vitur", raid_group="Theatre of Blood", location="Ver Sinhaza", has_multiple_forms=True),
                BossSummary(id=4, name="Great Olm", raid_group="Chambers of Xeric", location="Mount Quidamortem", has_multiple_forms=True),
                BossSummary(id=5, name="Corporeal Beast", raid_group=None, location="Corporeal Beast Lair", has_multiple_forms=False),
            ]
        
        return bosses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve bosses: {str(e)}")

@app.get("/boss/{boss_id}", response_model=Boss, tags=["Bosses"])
async def get_boss(boss_id: int):
    """
    Get details for a specific boss.
    
    Returns detailed information about a boss, including all of its forms if it has multiple forms.
    """
    try:
        boss = boss_repository.get_boss(boss_id)
        
        # If boss not found in the database, return mock data or 404
        if not boss:
            # Mock data for sample bosses
            if boss_id == 1:  # Zulrah
                return {
                    "id": 1,
                    "name": "Zulrah",
                    "raid_group": None,
                    "location": "Zul-Andra",
                    "examine": "The great serpent of the poison waste.",
                    "has_multiple_forms": True,
                    "forms": [
                        {
                            "id": 1,
                            "boss_id": 1,
                            "form_name": "Green Form",
                            "form_order": 1,
                            "combat_level": 725,
                            "hitpoints": 500,
                            "defence_level": 300,
                            "magic_level": 300,
                            "ranged_level": 300,
                            "defence_stab": 55,
                            "defence_slash": 55,
                            "defence_crush": 55,
                            "defence_magic": 0,
                            "defence_ranged_standard": 300
                        },
                        {
                            "id": 2,
                            "boss_id": 1,
                            "form_name": "Blue Form",
                            "form_order": 2,
                            "combat_level": 725,
                            "hitpoints": 500,
                            "defence_level": 300,
                            "magic_level": 300,
                            "ranged_level": 300,
                            "defence_stab": 55,
                            "defence_slash": 55,
                            "defence_crush": 55,
                            "defence_magic": 300,
                            "defence_ranged_standard": 0
                        }
                    ]
                }
            elif boss_id == 2:  # Vorkath
                return {
                    "id": 2,
                    "name": "Vorkath",
                    "raid_group": None,
                    "location": "Ungael",
                    "examine": "An undead dragon.",
                    "has_multiple_forms": False,
                    "forms": [
                        {
                            "id": 3,
                            "boss_id": 2,
                            "form_name": "Default",
                            "form_order": 1,
                            "combat_level": 732,
                            "hitpoints": 750,
                            "defence_level": 214,
                            "magic_level": 150,
                            "ranged_level": 150,
                            "defence_stab": 20,
                            "defence_slash": 20,
                            "defence_crush": 20,
                            "defence_magic": 240,
                            "defence_ranged_standard": 0
                        }
                    ]
                }
            else:
                raise HTTPException(status_code=404, detail="Boss not found")
        
        return boss
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve boss: {str(e)}")

@app.get("/items", response_model=List[ItemSummary], tags=["Items"])
async def get_items(
    combat_only: bool = Query(True, description="Filter to only show items with combat stats"),
    tradeable_only: bool = Query(False, description="Filter to only show tradeable items")
):
    """
    Get a list of all items with optional filters.
    
    Returns a list of item summaries with basic information.
    """
    try:
        items = item_repository.get_all_items(combat_only=combat_only, tradeable_only=tradeable_only)
        
        # If no items are found in the database, return mock data
        if not items:
            return [
                ItemSummary(id=1, name="Twisted bow", slot="2h", has_special_attack=False, has_passive_effect=True, is_tradeable=True, has_combat_stats=True),
                ItemSummary(id=2, name="Abyssal whip", slot="mainhand", has_special_attack=False, has_passive_effect=False, is_tradeable=True, has_combat_stats=True),
                ItemSummary(id=3, name="Dragon claws", slot="mainhand", has_special_attack=True, has_passive_effect=False, is_tradeable=True, has_combat_stats=True),
                ItemSummary(id=4, name="Bandos chestplate", slot="body", has_special_attack=False, has_passive_effect=False, is_tradeable=True, has_combat_stats=True),
                ItemSummary(id=5, name="Amulet of fury", slot="neck", has_special_attack=False, has_passive_effect=False, is_tradeable=True, has_combat_stats=True),
            ]
        
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve items: {str(e)}")

@app.get("/item/{item_id}", response_model=Item, tags=["Items"])
async def get_item(item_id: int):
    """
    Get details for a specific item.
    
    Returns detailed information about an item, including its combat stats.
    """
    try:
        item = item_repository.get_item(item_id)
        
        # If item not found in the database, return mock data or 404
        if not item:
            # Mock data for sample items
            if item_id == 1:  # Twisted bow
                return {
                    "id": 1,
                    "name": "Twisted bow",
                    "slot": "2h",
                    "has_special_attack": False,
                    "has_passive_effect": True,
                    "passive_effect_text": "The Twisted bow has increased accuracy and damage against monsters with high Magic levels.",
                    "is_tradeable": True,
                    "has_combat_stats": True,
                    "combat_stats": {
                        "attack_bonuses": {
                            "stab": 0,
                            "slash": 0,
                            "crush": 0,
                            "magic": 0,
                            "ranged": 70
                        },
                        "defence_bonuses": {
                            "stab": 0,
                            "slash": 0,
                            "crush": 0,
                            "magic": 0,
                            "ranged": 0
                        },
                        "other_bonuses": {
                            "strength": 0,
                            "ranged strength": 20,
                            "magic damage": "+0%",
                            "prayer": 0
                        },
                        "combat_styles": [
                            {
                                "name": "Accurate",
                                "attack_type": "Ranged",
                                "style": "Accurate",
                                "speed": "5 ticks (3.0s)",
                                "range": "10 tiles",
                                "experience": "",
                                "boost": "+3 Attack"
                            },
                            {
                                "name": "Rapid",
                                "attack_type": "Ranged",
                                "style": "Rapid",
                                "speed": "4 ticks (2.4s)",
                                "range": "10 tiles",
                                "experience": "",
                                "boost": ""
                            },
                            {
                                "name": "Longrange",
                                "attack_type": "Ranged",
                                "style": "Longrange",
                                "speed": "5 ticks (3.0s)",
                                "range": "10 tiles",
                                "experience": "",
                                "boost": "+3 Defence"
                            }
                        ]
                    }
                }
            elif item_id == 2:  # Abyssal whip
                return {
                    "id": 2,
                    "name": "Abyssal whip",
                    "slot": "mainhand",
                    "has_special_attack": False,
                    "has_passive_effect": False,
                    "is_tradeable": True,
                    "has_combat_stats": True,
                    "combat_stats": {
                        "attack_bonuses": {
                            "stab": 0,
                            "slash": 82,
                            "crush": 0,
                            "magic": 0,
                            "ranged": 0
                        },
                        "defence_bonuses": {
                            "stab": 0,
                            "slash": 0,
                            "crush": 0,
                            "magic": 0,
                            "ranged": 0
                        },
                        "other_bonuses": {
                            "strength": 82,
                            "ranged strength": 0,
                            "magic damage": "+0%",
                            "prayer": 0
                        },
                        "combat_styles": [
                            {
                                "name": "Chop",
                                "attack_type": "Slash",
                                "style": "Accurate",
                                "speed": "5 ticks (3.0s)",
                                "range": "1 tile",
                                "experience": "",
                                "boost": "+3 Attack"
                            },
                            {
                                "name": "Slash",
                                "attack_type": "Slash",
                                "style": "Aggressive",
                                "speed": "5 ticks (3.0s)",
                                "range": "1 tile",
                                "experience": "",
                                "boost": "+3 Strength"
                            },
                            {
                                "name": "Lunge",
                                "attack_type": "Stab",
                                "style": "Controlled",
                                "speed": "5 ticks (3.0s)",
                                "range": "1 tile",
                                "experience": "",
                                "boost": "+1 Attack, Strength, Defence"
                            },
                            {
                                "name": "Block",
                                "attack_type": "Slash",
                                "style": "Defensive",
                                "speed": "5 ticks (3.0s)",
                                "range": "1 tile",
                                "experience": "",
                                "boost": "+3 Defence"
                            }
                        ]
                    }
                }
            else:
                raise HTTPException(status_code=404, detail="Item not found")
        
        return item
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve item: {str(e)}")

@app.get("/search/bosses", response_model=List[BossSummary], tags=["Search"])
async def search_bosses(query: str, limit: int = 10):
    """
    Search for bosses by name.
    
    Returns a list of bosses that match the search query.
    """
    try:
        results = boss_repository.search_bosses(query, limit=limit)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/search/items", response_model=List[ItemSummary], tags=["Search"])
async def search_items(query: str, limit: int = 10):
    """
    Search for items by name.
    
    Returns a list of items that match the search query.
    """
    try:
        results = item_repository.search_items(query, limit=limit)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.post("/calculate/item-effect", tags=["DPS"])
async def calculate_item_effect(params: Dict[str, Any]):
    """
    Calculate special effects for specific items.
    
    This endpoint calculates bonuses for special items like Twisted Bow, 
    Tumeken's Shadow, etc. based on the provided parameters.
    """
    try:
        result = calculation_service.calculate_item_effect(params)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# For direct execution during development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
    

# Add this endpoint to your main.py file temporarily
@app.get("/debug/database", tags=["Debug"])
async def debug_database():
    """Debug endpoint to check database schema and content."""
    from .database import azure_db_service
    
    results = {}
    
    for db_type in ["bosses", "items_all"]:
        try:
            conn, temp_path = azure_db_service._get_db_connection(db_type)
            cursor = conn.cursor()
            
            # Get all table names
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall()]
            
            results[db_type] = {
                "database_file": azure_db_service.db_files.get(db_type),
                "tables": tables,
                "schemas": {}
            }
            
            # Get schema for each table
            for table in tables:
                try:
                    cursor.execute(f"PRAGMA table_info({table});")
                    columns = cursor.fetchall()
                    
                    # Get row count
                    cursor.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cursor.fetchone()[0]
                    
                    # Get sample data if table has rows
                    sample_data = []
                    if count > 0:
                        cursor.execute(f"SELECT * FROM {table} LIMIT 3;")
                        sample_data = cursor.fetchall()
                    
                    results[db_type]["schemas"][table] = {
                        "columns": [{"name": col[1], "type": col[2]} for col in columns],
                        "row_count": count,
                        "sample_data": sample_data
                    }
                    
                except Exception as e:
                    results[db_type]["schemas"][table] = f"Error: {str(e)}"
            
            conn.close()
            if temp_path:
                azure_db_service._cleanup_temp_file(temp_path)
                
        except Exception as e:
            results[db_type] = f"Error: {str(e)}"
    
    return results