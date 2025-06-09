from typing import Dict, Any

from ..repositories import item_repository
from . import calculation_service


def suggest_bis(params: Dict[str, Any]) -> Dict[str, Any]:
    """Return a naive best-in-slot setup for the given parameters."""
    items = item_repository.get_all_items(combat_only=True, tradeable_only=False)
    best_per_slot: Dict[str, Dict[str, Any]] = {}

    for item in items:
        slot = item.get("slot")
        if not slot:
            continue

        stats = item.get("combat_stats") or {}
        attack_bonuses = stats.get("attack_bonuses", {})
        other_bonuses = stats.get("other_bonuses", {})

        test_params = params.copy()

        style = params.get("combat_style", "melee")
        if style == "melee":
            test_params["melee_strength_bonus"] = other_bonuses.get("strength", 0)
            atk_type = params.get("attack_type", "slash").lower()
            test_params["melee_attack_bonus"] = attack_bonuses.get(atk_type, 0)
        elif style == "ranged":
            test_params["ranged_strength_bonus"] = other_bonuses.get("ranged strength", 0)
            test_params["ranged_attack_bonus"] = attack_bonuses.get("ranged", 0)
        else:  # magic
            dmg_bonus = other_bonuses.get("magic damage", "0")
            if isinstance(dmg_bonus, str) and dmg_bonus.endswith("%"):
                dmg_bonus = float(dmg_bonus.strip("%")) / 100
            test_params["magic_damage_bonus"] = float(dmg_bonus or 0)
            test_params["magic_attack_bonus"] = attack_bonuses.get("magic", 0)

        result = calculation_service.calculate_dps(test_params)
        dps = result.get("dps", 0)

        current_best = best_per_slot.get(slot)
        if not current_best or dps > current_best["dps"]:
            best_per_slot[slot] = {"item": item, "dps": dps}

    return {slot: info["item"] for slot, info in best_per_slot.items()}


def suggest_upgrades(params: Dict[str, Any], boss_id: int) -> Dict[str, Any]:
    """Suggest gear upgrades and DPS improvements for the given parameters."""

    # DPS with the current setup
    current_result = calculation_service.calculate_dps(params)
    current_dps = current_result.get("dps", 0.0)

    bis_setup = suggest_bis(params)
    style = params.get("combat_style", "melee")

    upgrades: Dict[str, Any] = {}

    for slot, item in bis_setup.items():
        stats = item.get("combat_stats") or {}
        attack_bonuses = stats.get("attack_bonuses", {})
        other_bonuses = stats.get("other_bonuses", {})

        test_params = params.copy()

        if style == "melee":
            test_params["melee_strength_bonus"] = other_bonuses.get("strength", 0)
            atk_type = params.get("attack_type", "slash").lower()
            test_params["melee_attack_bonus"] = attack_bonuses.get(atk_type, 0)
        elif style == "ranged":
            test_params["ranged_strength_bonus"] = other_bonuses.get("ranged strength", 0)
            test_params["ranged_attack_bonus"] = attack_bonuses.get("ranged", 0)
        else:  # magic
            dmg_bonus = other_bonuses.get("magic damage", "0")
            if isinstance(dmg_bonus, str) and dmg_bonus.endswith("%"):
                dmg_bonus = float(dmg_bonus.strip("%")) / 100
            test_params["magic_damage_bonus"] = float(dmg_bonus or 0)
            test_params["magic_attack_bonus"] = attack_bonuses.get("magic", 0)

        new_result = calculation_service.calculate_dps(test_params)
        new_dps = new_result.get("dps", 0.0)

        upgrades[slot] = {
            "best_item": item,
            "current_dps": current_dps,
            "upgraded_dps": new_dps,
            "improvement": new_dps - current_dps,
        }

    return {
        "current_dps": current_dps,
        "upgrades": upgrades,
    }
