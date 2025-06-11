from typing import Dict, Any

from ..repositories import item_repository
from . import calculation_service


def suggest_bis(params: Dict[str, Any]) -> Dict[str, Any]:
    """Return a naive best-in-slot setup for the given parameters."""
    items = item_repository.get_all_items(combat_only=True, tradeable_only=False)
    best_per_slot: Dict[str, Dict[str, Any]] = {}

    style = params.get("combat_style", "melee").lower()
    atk_type = params.get("attack_type", "slash").lower()

    for item in items:
        slot = item.get("slot")
        if not slot:
            continue

        stats = item.get("combat_stats") or {}
        attack_bonuses = stats.get("attack_bonuses", {})
        other_bonuses = stats.get("other_bonuses", {})

        # Skip items that provide no relevant bonuses for the chosen style
        if style == "melee":
            atk_bonus = attack_bonuses.get(atk_type, 0)
            str_bonus = other_bonuses.get("strength", 0)
            if atk_bonus <= 0 and str_bonus <= 0:
                continue
        elif style == "ranged":
            atk_bonus = attack_bonuses.get("ranged", 0)
            str_bonus = other_bonuses.get("ranged strength", 0)
            if atk_bonus <= 0 and str_bonus <= 0:
                continue
        else:
            atk_bonus = attack_bonuses.get("magic", 0)
            dmg_bonus = other_bonuses.get("magic damage", "0")
            if isinstance(dmg_bonus, str) and dmg_bonus.endswith("%"):
                dmg_bonus = float(dmg_bonus.strip("%")) / 100
            if atk_bonus <= 0 and float(dmg_bonus or 0) <= 0:
                continue

        test_params = params.copy()

        if style == "melee":
            test_params["melee_strength_bonus"] = str_bonus
            test_params["melee_attack_bonus"] = atk_bonus
        elif style == "ranged":
            test_params["ranged_strength_bonus"] = str_bonus
            test_params["ranged_attack_bonus"] = atk_bonus
        else:  # magic
            dmg_bonus = other_bonuses.get("magic damage", "0")
            if isinstance(dmg_bonus, str) and dmg_bonus.endswith("%"):
                dmg_bonus = float(dmg_bonus.strip("%")) / 100
            test_params["magic_damage_bonus"] = float(dmg_bonus or 0)
            test_params["magic_attack_bonus"] = atk_bonus

        result = calculation_service.calculate_dps(test_params)
        dps = result.get("dps", 0)

        current_best = best_per_slot.get(slot)
        if not current_best or dps > current_best["dps"]:
            best_per_slot[slot] = {"item": item, "dps": dps}

    return {slot: info["item"] for slot, info in best_per_slot.items()}


async def suggest_bis_async(params: Dict[str, Any]) -> Dict[str, Any]:
    """Async version using the item repository async API."""
    items = await item_repository.get_all_items_async(combat_only=True, tradeable_only=False)
    best_per_slot: Dict[str, Dict[str, Any]] = {}

    style = params.get("combat_style", "melee").lower()
    atk_type = params.get("attack_type", "slash").lower()

    for item in items:
        slot = item.get("slot")
        if not slot:
            continue

        stats = item.get("combat_stats") or {}
        attack_bonuses = stats.get("attack_bonuses", {})
        other_bonuses = stats.get("other_bonuses", {})

        # Skip items that provide no relevant bonuses for the chosen style
        if style == "melee":
            atk_bonus = attack_bonuses.get(atk_type, 0)
            str_bonus = other_bonuses.get("strength", 0)
            if atk_bonus <= 0 and str_bonus <= 0:
                continue
        elif style == "ranged":
            atk_bonus = attack_bonuses.get("ranged", 0)
            str_bonus = other_bonuses.get("ranged strength", 0)
            if atk_bonus <= 0 and str_bonus <= 0:
                continue
        else:
            atk_bonus = attack_bonuses.get("magic", 0)
            dmg_bonus = other_bonuses.get("magic damage", "0")
            if isinstance(dmg_bonus, str) and dmg_bonus.endswith("%"):
                dmg_bonus = float(dmg_bonus.strip("%")) / 100
            if atk_bonus <= 0 and float(dmg_bonus or 0) <= 0:
                continue

        test_params = params.copy()

        if style == "melee":
            test_params["melee_strength_bonus"] = str_bonus
            test_params["melee_attack_bonus"] = atk_bonus
        elif style == "ranged":
            test_params["ranged_strength_bonus"] = str_bonus
            test_params["ranged_attack_bonus"] = atk_bonus
        else:
            test_params["magic_damage_bonus"] = float(dmg_bonus or 0)
            test_params["magic_attack_bonus"] = atk_bonus

        result = calculation_service.calculate_dps(test_params)
        dps = result.get("dps", 0)

        current_best = best_per_slot.get(slot)
        if not current_best or dps > current_best["dps"]:
            best_per_slot[slot] = {"item": item, "dps": dps}

    return {slot: info["item"] for slot, info in best_per_slot.items()}
