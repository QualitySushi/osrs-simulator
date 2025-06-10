from .melee import MeleeCalculator
from .ranged import RangedCalculator
from .magic import MagicCalculator
from .raid_scaling import apply_raid_scaling
from typing import Dict, Any


class DpsCalculator:
    """Main DPS calculator that delegates to specific combat style calculators."""

    @staticmethod
    def calculate_dps(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Dispatch DPS calculation based on combat style.
        """
        params = apply_raid_scaling(params)
        combat_style = params.get("combat_style", "melee").lower()

        if combat_style == "melee":
            return MeleeCalculator.calculate_dps(params)
        elif combat_style == "ranged":
            return RangedCalculator.calculate_dps(params)
        elif combat_style == "magic":
            return MagicCalculator.calculate_dps(params)
        else:
            raise ValueError(f"Invalid combat style: {combat_style}")

    @staticmethod
    def calculate_item_effect(params: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatch calculations for special item effects."""
        item_name = str(params.get("item_name", "")).lower()

        if "twisted bow" in item_name:
            magic_level = params.get("target_magic_level")
            if magic_level is None:
                raise ValueError("target_magic_level is required for Twisted Bow effect")
            return RangedCalculator.calculate_twisted_bow_bonus(magic_level)

        if "tumeken" in item_name:
            base_hit = params.get("base_spell_max_hit")
            magic_level = params.get("magic_level")
            if base_hit is None or magic_level is None:
                raise ValueError("base_spell_max_hit and magic_level are required for Tumeken's Shadow effect")
            return MagicCalculator.calculate_tumekens_shadow_bonus(base_hit, magic_level)

        raise ValueError(f"No effect calculator for item: {item_name}")
