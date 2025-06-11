# Best in Slot Finder

This page explains the logic behind the Best in Slot (BIS) feature and ways it could be improved.

The backend implements BIS in `backend/app/services/bis_service.py`.
For each item it calculates DPS with that item equipped and keeps the best result per slot:

```python
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
```

This simple approach selects the highest DPS item for each slot independently. It ignores set bonuses, special attack synergy and other restrictions.

## Possible Improvements

- Evaluate gear synergies or set bonuses.
- Filter items by player requirements such as levels or quest completion.
- Include special attacks and passive effects in the ranking.
- Offer multiple ranked options rather than a single item per slot.

