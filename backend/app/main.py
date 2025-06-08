from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List, Optional, Union
import json

from .repositories import item_repository, boss_repository
from .models import (
    DpsResult, 
    Boss, 
    BossSummary, 
    Item, 
    ItemSummary, 
    DpsParameters,
    SearchQuery
)
from .services import calculation_service

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
        params_dict = params.dict()
        
        # Calculate DPS
        result = calculation_service.calculate_dps(params_dict)
        
        return DpsResult(**result)
    except Exception as e:
        # Handle calculation errors
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
                        }
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
                        }
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