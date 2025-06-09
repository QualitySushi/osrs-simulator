from typing import Dict, Any, List

from ..models import DpsResult
from ..repositories import boss_repository
from . import calculation_service


def _defence_bonus_for_form(form: Dict[str, Any], params: Dict[str, Any]) -> int:
    """Select the appropriate defence bonus from the boss form based on combat style."""
    style = params.get("combat_style", "melee").lower()
    if style == "melee":
        atk_type = params.get("attack_type", "stab").lower()
        field_map = {
            "stab": "defence_stab",
            "slash": "defence_slash",
            "crush": "defence_crush",
        }
        return form.get(field_map.get(atk_type, "defence_stab"), 0)
    if style == "ranged":
        return form.get("defence_ranged_standard", 0)
    # magic or other
    return form.get("defence_magic", 0)


def simulate_bosses(params: Dict[str, Any], selections: List[Dict[str, int]]) -> Dict[int, DpsResult]:
    """Simulate DPS against each selected boss form."""
    results: Dict[int, DpsResult] = {}

    for sel in selections:
        boss_id = sel.get("boss_id")
        form_id = sel.get("form_id")

        boss = boss_repository.get_boss(boss_id)
        if not boss:
            continue

        forms = boss.get("forms") or []
        if not forms:
            continue

        form = next((f for f in forms if f.get("id") == form_id), forms[0])
        form_params = params.copy()
        form_params["target_defence_level"] = form.get(
            "defence_level", form_params.get("target_defence_level", 1)
        )
        form_params["target_magic_level"] = form.get(
            "magic_level", form_params.get("target_magic_level", 1)
        )
        form_params["target_magic_defence"] = form.get(
            "defence_magic", form_params.get("target_magic_defence", 0)
        )
        form_params["target_defence_bonus"] = _defence_bonus_for_form(form, form_params)

        calc = calculation_service.calculate_dps(form_params)
        results[form.get("id")] = DpsResult(**calc)

    return results
