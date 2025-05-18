from .melee import MeleeCalculator
from .ranged import RangedCalculator
from .magic import MagicCalculator
from typing import Dict, Any


class DpsCalculator:
    """Main DPS calculator that delegates to specific combat style calculators."""

    @staticmethod
    def calculate_dps(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Dispatch DPS calculation based on combat style.
        """
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
        """
        Calculate and return special effect bonuses for supported items.
        """
        item_name = params.get("item_name", "").lower()

        # Twisted Bow bonus logic
        if "twisted bow" in item_name:
            target_magic = params.get("target_magic_level", 1)
            return RangedCalculator.calculate_twisted_bow_bonus(target_magic)

        # Tumeken's Shadow bonus logic
        elif "tumeken" in item_name:
            base_hit = params.get("base_spell_max_hit", 0)
            mag_lvl = params.get("magic_level", 99)
            return MagicCalculator.calculate_tumekens_shadow_bonus(base_hit, mag_lvl)

        # Staff of the Dead (standard spellbook only)
        elif "staff of the dead" in item_name:
            spell_max_hit = params.get("base_spell_max_hit", 0)
            spell_type = params.get("spell_type", "standard")
            if spell_type == "standard":
                return {
                    "max_hit_with_bonus": MagicCalculator.calculate_staff_of_the_dead_bonus(spell_max_hit),
                    "effect_description": "15% damage boost for standard spellbook spells"
                }

        return {
            "effect_description": "No special damage effect for this item"
        }
