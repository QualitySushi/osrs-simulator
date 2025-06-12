from .melee import MeleeCalculator
from .ranged import RangedCalculator
from .magic import MagicCalculator
from .raid_scaling import apply_raid_scaling
from typing import Dict, Any
from ..repositories import special_attack_repository, passive_effect_repository
import logging

logger = logging.getLogger(__name__)


class DpsCalculator:
    """Main DPS calculator that delegates to specific combat style calculators."""

    @staticmethod
    def calculate_dps(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Dispatch DPS calculation based on combat style.
        """
        logger.info("Starting DPS calculation with params: %s", params)
        params = apply_raid_scaling(params)
        logger.info("After raid scaling: %s", params)

        weapon_name = str(params.get("weapon_name", "")).lower()
        logger.info("Weapon: %s", weapon_name or "None")
        if weapon_name:
            sa = special_attack_repository.get_special_attack(weapon_name)
            if sa:
                logger.info("Special attack data: %s", sa)
                params.setdefault(
                    "special_multiplier", sa.get("damage_multiplier", 1.0)
                )
                params.setdefault(
                    "special_accuracy_multiplier", sa.get("accuracy_multiplier", 1.0)
                )
                params.setdefault("special_hit_count", sa.get("hit_count", 1))
                params.setdefault("guaranteed_hit", sa.get("guaranteed_hit", False))
                params.setdefault("special_attack_cost", sa.get("special_cost"))
            else:
                logger.info("No special attack data found")

            pe = passive_effect_repository.get_passive_effect(weapon_name)
            if pe:
                logger.info("Passive effect data: %s", pe)
                mech = pe.get("special_mechanics", {})
                dmg = mech.get("damage_multiplier")
                acc = mech.get("accuracy_multiplier")
                apply = True
                if mech.get("wilderness_only") and not params.get("in_wilderness"):
                    apply = False
                charge_req = None
                if mech.get("requires_charge"):
                    for n in pe.get("numerical_values", []):
                        if n.get("unit") == "ether":
                            charge_req = n.get("value")
                            break
                    if (
                        charge_req is not None
                        and params.get("ether_charge", 0) < charge_req
                    ):
                        apply = False
                if apply:
                    if dmg:
                        params["gear_multiplier"] = (
                            params.get("gear_multiplier", 1.0) * dmg
                        )
                    if acc:
                        params["special_accuracy_multiplier"] = (
                            params.get("special_accuracy_multiplier", 1.0) * acc
                        )

                if mech.get("scales_with") == "target_magic_level":
                    target_level = params.get("target_magic_level")
                    if target_level is not None:
                        bonus = RangedCalculator.calculate_twisted_bow_bonus(
                            target_level
                        )
                        params["gear_multiplier"] = (
                            params.get("gear_multiplier", 1.0)
                            * bonus["damage_multiplier"]
                        )
                        params["special_accuracy_multiplier"] = (
                            params.get("special_accuracy_multiplier", 1.0)
                            * bonus["accuracy_multiplier"]
                        )
        combat_style = params.get("combat_style", "melee").lower()
        logger.info("Combat style: %s", combat_style)

        calculator = None
        if combat_style == "melee":
            calculator = MeleeCalculator
        elif combat_style == "ranged":
            calculator = RangedCalculator
        elif combat_style == "magic":
            calculator = MagicCalculator
        else:
            raise ValueError(f"Invalid combat style: {combat_style}")

        # Map new parameter names for special attacks
        if "special_damage_multiplier" in params:
            params["special_multiplier"] = params["special_damage_multiplier"]
        if "special_accuracy_modifier" in params:
            params["special_accuracy_multiplier"] = params["special_accuracy_modifier"]
        cost = params.get("special_energy_cost")
        if cost is None or cost <= 0:
            cost = params.get("special_attack_cost")
        logger.info("Special energy cost: %s", cost)

        # If no special attack cost provided or it is non-positive, just return normal DPS
        if cost is None or cost <= 0:
            logger.info("No special attack cost, returning regular DPS only")
            return calculator.calculate_dps(params)

        # Calculate regular and special attack damage per hit
        regular_params = params.copy()
        regular_params["special_multiplier"] = 1.0
        regular_params["special_accuracy_multiplier"] = 1.0
        regular_result = calculator.calculate_dps(regular_params)

        logger.info("--- Gear DPS Calculation ---")
        logger.info("Inputs: %s", regular_params)
        logger.info("Outputs: %s", regular_result)
        logger.info("----------------------------")

        special_params = params.copy()
        special_speed = params.get(
            "special_attack_speed", params.get("attack_speed", 2.4)
        )
        special_params["attack_speed"] = special_speed
        special_result = calculator.calculate_dps(special_params)

        logger.info("--- Special DPS Calculation ---")
        logger.info("Inputs: %s", special_params)
        logger.info("Outputs: %s", special_result)
        logger.info("------------------------------")

        print("--- Gear DPS Calculation ---")
        print("Inputs:", regular_params)
        print("Outputs:", regular_result)
        print("----------------------------")
        print("--- Special DPS Calculation ---")
        print("Inputs:", special_params)
        print("Outputs:", special_result)
        print("------------------------------")

        regular_damage = regular_result["average_hit"]
        special_damage = special_result["average_hit"]
        logger.info(
            "Regular hit: %.2f, Special hit: %.2f",
            regular_damage,
            special_damage,
        )

        attack_speed = params.get("attack_speed", 2.4)
        regen_rate = params.get("special_regen_rate", 10 / 30)
        regen_mult = 1.0
        if params.get("lightbearer"):
            regen_mult *= 2
        if params.get("surge_potion"):
            regen_mult *= 1.5
        regen_rate *= regen_mult

        duration = params.get("duration", 60.0)

        energy = params.get("initial_special_energy", 100.0)
        time = 0.0
        special_count = 0
        regular_total = 0.0
        special_total = 0.0
        logger.info(
            "Simulation start: duration=%.2fs, attack_speed=%.2fs, special_speed=%.2fs",
            duration,
            attack_speed,
            special_speed,
        )

        while time < duration - 1e-9:
            if energy >= cost:
                damage = special_damage
                step = special_speed
                energy = max(0.0, energy - cost)
                special = True
                special_count += 1
            else:
                damage = regular_damage
                step = attack_speed
                special = False

            if time + step > duration:
                frac = (duration - time) / step
                damage *= frac
                energy = min(100.0, energy + regen_rate * step * frac)
                if special:
                    special_total += damage
                else:
                    regular_total += damage
                time = duration
                logger.info(
                    "t=%.2fs -> %.2f damage (%s, partial %.2f), energy=%.2f",
                    time,
                    damage,
                    "special" if special else "regular",
                    frac,
                    energy,
                )
                break

            if special:
                special_total += damage
            else:
                regular_total += damage

            time += step
            energy = min(100.0, energy + regen_rate * step)
            logger.info(
                "t=%.2fs -> %.2f damage (%s), energy=%.2f",
                time,
                damage,
                "special" if special else "regular",
                energy,
            )

        result = regular_result.copy()
        result["mainhand_dps"] = regular_total / duration
        result["special_attack_dps"] = special_total / duration
        result["dps"] = (regular_total + special_total) / duration
        result["special_attacks"] = special_count
        result["duration"] = duration
        result["mainhand_max_hit"] = regular_result.get("max_hit")
        result["special_attack_max_hit"] = special_result.get("max_hit")
        result["mainhand_hit_chance"] = regular_result.get("hit_chance")
        result["special_attack_hit_chance"] = special_result.get("hit_chance")
        result["max_hit"] = max(
            regular_result.get("max_hit", 0), special_result.get("max_hit", 0)
        )
        logger.info("Final result: %s", result)
        return result

    @staticmethod
    def calculate_item_effect(params: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatch calculations for special item effects."""
        item_name = str(params.get("item_name", "")).lower()

        if "twisted bow" in item_name:
            magic_level = params.get("target_magic_level")
            if magic_level is None:
                raise ValueError(
                    "target_magic_level is required for Twisted Bow effect"
                )
            return RangedCalculator.calculate_twisted_bow_bonus(magic_level)

        if "tumeken" in item_name:
            base_hit = params.get("base_spell_max_hit")
            magic_level = params.get("magic_level")
            if base_hit is None or magic_level is None:
                raise ValueError(
                    "base_spell_max_hit and magic_level are required for Tumeken's Shadow effect"
                )
            return MagicCalculator.calculate_tumekens_shadow_bonus(
                base_hit, magic_level
            )

        raise ValueError(f"No effect calculator for item: {item_name}")
