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

        calculator = None
        if combat_style == "melee":
            calculator = MeleeCalculator
        elif combat_style == "ranged":
            calculator = RangedCalculator
        elif combat_style == "magic":
            calculator = MagicCalculator
        else:
            raise ValueError(f"Invalid combat style: {combat_style}")

        # If no special rotation requested, just return normal DPS
        if params.get("special_attack_cost") is None or params.get("special_rotation") is None:
            return calculator.calculate_dps(params)

        # Calculate regular and special attack damage per hit
        regular_params = params.copy()
        regular_params["special_multiplier"] = 1.0
        regular_result = calculator.calculate_dps(regular_params)
        special_result = calculator.calculate_dps(params)

        regular_damage = regular_result["average_hit"]
        special_damage = special_result["average_hit"]
        attack_speed = params.get("attack_speed", 2.4)

        # Special energy regeneration
        regen_rate = 10 / 30  # energy per second
        regen_mult = 1.0
        if params.get("lightbearer"):
            regen_mult *= 2
        if params.get("surge_potion"):
            regen_mult *= 1.5
        regen_rate *= regen_mult

        cost = params.get("special_attack_cost", 0)
        rotation = params.get("special_rotation", 0.0)
        duration = params.get("duration", 60.0)

        energy = 100.0
        time = 0.0
        special_count = 0
        attack_count = 0
        total_damage = 0.0

        while time < duration - 1e-9:
            if energy >= cost and special_count / (attack_count + 1e-9) < rotation:
                total_damage += special_damage
                energy = max(0.0, energy - cost)
                special_count += 1
            else:
                total_damage += regular_damage

            attack_count += 1
            time += attack_speed
            energy = min(100.0, energy + regen_rate * attack_speed)

        result = regular_result.copy()
        final_dps = total_damage / duration
        result["special_attack_dps"] = final_dps - regular_result["dps"]
        result["special_attacks"] = special_count
        result["duration"] = duration
        return result

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
