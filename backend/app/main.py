from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional, Union
import math
import json

app = FastAPI(title="OSRS DPS Calculator API")

# Add CORS to allow your frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DpsResult(BaseModel):
    dps: float
    max_hit: int
    hit_chance: float
    attack_roll: int
    defence_roll: int
    average_hit: float
    effective_str: Optional[int] = None
    effective_atk: Optional[int] = None

@app.get("/")
def read_root():
    return {"message": "OSRS DPS Calculator API"}

@app.post("/calculate/dps")
async def calculate_dps(params: Dict[str, Any]) -> DpsResult:
    """Calculate DPS based on combat parameters"""
    combat_style = params.get("combat_style", "melee")
    
    if combat_style == "melee":
        # Simplified melee DPS calculation (example)
        strength_level = params.get("strength_level", 99)
        strength_boost = params.get("strength_boost", 0)
        strength_prayer = params.get("strength_prayer", 1.0)
        melee_strength_bonus = params.get("melee_strength_bonus", 0)
        attack_level = params.get("attack_level", 99)
        attack_boost = params.get("attack_boost", 0)
        attack_prayer = params.get("attack_prayer", 1.0)
        melee_attack_bonus = params.get("melee_attack_bonus", 0)
        attack_style_bonus = params.get("attack_style_bonus", 0)
        void_melee = params.get("void_melee", False)
        gear_multiplier = params.get("gear_multiplier", 1.0)
        special_multiplier = params.get("special_multiplier", 1.0)
        target_defence_level = params.get("target_defence_level", 1)
        target_defence_bonus = params.get("target_defence_bonus", 0)
        attack_speed = params.get("attack_speed", 2.4)
        
        # Calculate effective strength
        base_str = strength_level + strength_boost
        effective_str = math.floor(base_str * strength_prayer)
        effective_str += 8 + attack_style_bonus
        
        if void_melee:
            effective_str = math.floor(effective_str * 1.1)
        
        # Calculate max hit
        max_hit = math.floor((effective_str * (melee_strength_bonus + 64) / 640) + 0.5)
        max_hit = math.floor(max_hit * gear_multiplier)
        max_hit = math.floor(max_hit * special_multiplier)
        
        # Calculate effective attack
        base_atk = attack_level + attack_boost
        effective_atk = math.floor(base_atk * attack_prayer)
        effective_atk += 8 + attack_style_bonus
        
        if void_melee:
            effective_atk = math.floor(effective_atk * 1.1)
        
        # Calculate attack roll
        attack_roll = math.floor(effective_atk * (melee_attack_bonus + 64))
        attack_roll = math.floor(attack_roll * gear_multiplier)
        
        # Calculate defence roll
        def_roll = (target_defence_level + 9) * (target_defence_bonus + 64)
        
        # Calculate hit chance
        if attack_roll > def_roll:
            hit_chance = 1 - (def_roll + 2) / (2 * (attack_roll + 1))
        else:
            hit_chance = attack_roll / (2 * (def_roll + 1))
        
        hit_chance = max(0, min(1, hit_chance))
        avg_hit = hit_chance * (max_hit + 1) / 2
        dps = avg_hit / attack_speed
        
        return DpsResult(
            dps=dps,
            max_hit=max_hit,
            hit_chance=hit_chance,
            attack_roll=attack_roll,
            defence_roll=def_roll,
            average_hit=avg_hit,
            effective_str=effective_str,
            effective_atk=effective_atk
        )
    
    elif combat_style == "ranged":
        # Simplified ranged DPS calculation (example)
        ranged_level = params.get("ranged_level", 99)
        ranged_boost = params.get("ranged_boost", 0)
        ranged_prayer = params.get("ranged_prayer", 1.0)
        ranged_strength_bonus = params.get("ranged_strength_bonus", 0)
        ranged_attack_bonus = params.get("ranged_attack_bonus", 0)
        attack_style_bonus = params.get("attack_style_bonus", 0)
        void_ranged = params.get("void_ranged", False)
        gear_multiplier = params.get("gear_multiplier", 1.0)
        special_multiplier = params.get("special_multiplier", 1.0)
        target_defence_level = params.get("target_defence_level", 1)
        target_ranged_defence_bonus = params.get("target_ranged_defence_bonus", 0)
        attack_speed = params.get("attack_speed", 2.4)
        
        # Calculate effective ranged strength
        base_rng = ranged_level + ranged_boost
        effective_str = math.floor(base_rng * ranged_prayer)
        effective_str += 8 + attack_style_bonus
        
        if void_ranged:
            effective_str = math.floor(effective_str * 1.125)
        
        # Calculate max hit
        max_hit = math.floor((effective_str * (ranged_strength_bonus + 64) / 640) + 0.5)
        max_hit = math.floor(max_hit * gear_multiplier)
        max_hit = math.floor(max_hit * special_multiplier)
        
        # Calculate effective attack
        effective_atk = math.floor(base_rng * ranged_prayer)
        effective_atk += 8 + attack_style_bonus
        
        if void_ranged:
            effective_atk = math.floor(effective_atk * 1.125)
        
        # Calculate attack roll
        attack_roll = math.floor(effective_atk * (ranged_attack_bonus + 64))
        attack_roll = math.floor(attack_roll * gear_multiplier)
        
        # Calculate defence roll
        def_roll = (target_defence_level + 9) * (target_ranged_defence_bonus + 64)
        
        # Calculate hit chance
        if attack_roll > def_roll:
            hit_chance = 1 - (def_roll + 2) / (2 * (attack_roll + 1))
        else:
            hit_chance = attack_roll / (2 * (def_roll + 1))
        
        hit_chance = max(0, min(1, hit_chance))
        avg_hit = hit_chance * (max_hit + 1) / 2
        dps = avg_hit / attack_speed
        
        return DpsResult(
            dps=dps,
            max_hit=max_hit,
            hit_chance=hit_chance,
            attack_roll=attack_roll,
            defence_roll=def_roll,
            average_hit=avg_hit,
            effective_str=effective_str,
            effective_atk=effective_atk
        )
    
    elif combat_style == "magic":
        # Simplified magic DPS calculation (example)
        magic_level = params.get("magic_level", 99)
        magic_boost = params.get("magic_boost", 0)
        magic_prayer = params.get("magic_prayer", 1.0)
        base_spell_max_hit = params.get("base_spell_max_hit", 0)
        magic_attack_bonus = params.get("magic_attack_bonus", 0)
        magic_damage_bonus = params.get("magic_damage_bonus", 0.0)
        attack_style_bonus = params.get("attack_style_bonus", 0)
        void_magic = params.get("void_magic", False)
        shadow_bonus = params.get("shadow_bonus", 0.0)
        virtus_bonus = params.get("virtus_bonus", 0.0)
        tome_bonus = params.get("tome_bonus", 0.0)
        prayer_bonus = params.get("prayer_bonus", 0.0)
        elemental_weakness = params.get("elemental_weakness", 0.0)
        target_magic_level = params.get("target_magic_level", 1)
        target_magic_defence = params.get("target_magic_defence", 0)
        attack_speed = params.get("attack_speed", 2.4)
        
        # Calculate damage multiplier
        dmg_multiplier = 1.0 + sum([
            magic_damage_bonus,
            shadow_bonus,
            virtus_bonus,
            tome_bonus,
            prayer_bonus,
            elemental_weakness
        ])
        
        # Calculate max hit
        max_hit = math.floor(base_spell_max_hit * dmg_multiplier)
        
        # Calculate effective magic attack
        base_mag = magic_level + magic_boost
        effective_atk = math.floor(base_mag * magic_prayer)
        effective_atk += 8 + attack_style_bonus
        
        if void_magic:
            effective_atk = math.floor(effective_atk * 1.45)
        
        # Calculate attack roll
        attack_roll = math.floor(effective_atk * (magic_attack_bonus + 64))
        
        # Calculate defence roll
        def_roll = (target_magic_level + 9) * (target_magic_defence + 64)
        
        # Calculate hit chance
        if attack_roll > def_roll:
            hit_chance = 1 - (def_roll + 2) / (2 * (attack_roll + 1))
        else:
            hit_chance = attack_roll / (2 * (def_roll + 1))
        
        hit_chance = max(0, min(1, hit_chance))
        avg_hit = hit_chance * (max_hit + 1) / 2
        dps = avg_hit / attack_speed
        
        return DpsResult(
            dps=dps,
            max_hit=max_hit,
            hit_chance=hit_chance,
            attack_roll=attack_roll,
            defence_roll=def_roll,
            average_hit=avg_hit,
            effective_str=None,
            effective_atk=effective_atk
        )
    
    else:
        raise HTTPException(status_code=400, detail="Invalid combat style")

@app.get("/bosses")
async def get_bosses():
    """Return a list of bosses (mock data for now)"""
    return [
        {"id": 1, "name": "Zulrah", "raid_group": None, "location": "Zul-Andra"},
        {"id": 2, "name": "Vorkath", "raid_group": None, "location": "Ungael"},
        {"id": 3, "name": "Verzik Vitur", "raid_group": "Theatre of Blood", "location": "Ver Sinhaza"},
        {"id": 4, "name": "Great Olm", "raid_group": "Chambers of Xeric", "location": "Mount Quidamortem"},
        {"id": 5, "name": "Corporeal Beast", "raid_group": None, "location": "Corporeal Beast Lair"},
    ]

@app.get("/boss/{boss_id}")
async def get_boss(boss_id: int):
    """Return details for a specific boss (mock data for now)"""
    boss_data = {
        1: {
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
        },
        2: {
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
    }
    
    if boss_id not in boss_data:
        raise HTTPException(status_code=404, detail="Boss not found")
    
    return boss_data[boss_id]

@app.get("/items")
async def get_items(combat_only: bool = False, tradeable_only: bool = False):
    """Return a list of items (mock data for now)"""
    items = [
        {"id": 1, "name": "Twisted bow", "slot": "2h", "has_special_attack": False, "has_passive_effect": True, "is_tradeable": True, "has_combat_stats": True},
        {"id": 2, "name": "Abyssal whip", "slot": "mainhand", "has_special_attack": False, "has_passive_effect": False, "is_tradeable": True, "has_combat_stats": True},
        {"id": 3, "name": "Dragon claws", "slot": "mainhand", "has_special_attack": True, "has_passive_effect": False, "is_tradeable": True, "has_combat_stats": True},
        {"id": 4, "name": "Bandos chestplate", "slot": "body", "has_special_attack": False, "has_passive_effect": False, "is_tradeable": True, "has_combat_stats": True},
        {"id": 5, "name": "Amulet of fury", "slot": "neck", "has_special_attack": False, "has_passive_effect": False, "is_tradeable": True, "has_combat_stats": True},
    ]
    
    return items

@app.get("/item/{item_id}")
async def get_item(item_id: int):
    """Return details for a specific item (mock data for now)"""
    item_data = {
        1: {
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
        },
        2: {
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
    }
    
    if item_id not in item_data:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return item_data[item_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)