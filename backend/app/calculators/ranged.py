import math
from typing import Dict, Any

class RangedCalculator:
    """Calculator for ranged DPS calculations."""
    
    @staticmethod
    def calculate_twisted_bow_bonus(target_magic_level: int) -> Dict[str, Any]:
        """Calculate Twisted Bow damage multiplier based on target's magic level."""
        capped_magic = max(0, min(target_magic_level, 250))
        multiplier = 140 / (math.sqrt(capped_magic + 75) - 9)
        return {
            "damage_multiplier": multiplier,
            "effect_description": f"Twisted Bow multiplier vs {capped_magic} magic level: {multiplier:.2f}x"
        }

    @staticmethod
    def calculate_dps(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate ranged DPS based on input parameters.
        """
        # Step 1: Effective Ranged Strength
        base_rng = params["ranged_level"] + params.get("ranged_boost", 0)
        effective_str = math.floor(base_rng * params.get("ranged_prayer", 1.0))
        effective_str += 8 + params.get("attack_style_bonus_strength", 0)

        if params.get("void_ranged", False):
            effective_str = math.floor(effective_str * 1.125)

        # Step 2: Max Hit
        max_hit = math.floor((effective_str * (params["ranged_strength_bonus"] + 64) / 640) + 0.5)
        max_hit = math.floor(max_hit * params.get("gear_multiplier", 1.0))
        max_hit = math.floor(max_hit * params.get("special_multiplier", 1.0))

        # Step 3: Effective Ranged Attack
        effective_atk = math.floor(base_rng * params.get("ranged_prayer", 1.0))
        effective_atk += 8 + params.get("attack_style_bonus_attack", 0)

        if params.get("void_ranged", False):
            effective_atk = math.floor(effective_atk * 1.1)

        # Step 4: Attack Roll
        attack_roll = math.floor(effective_atk * (params["ranged_attack_bonus"] + 64))
        attack_roll = math.floor(attack_roll * params.get("gear_multiplier", 1.0))

        # Step 5: Defence Roll
        def_roll = (params["target_defence_level"] + 9) * (params["target_ranged_defence_bonus"] + 64)

        # Step 6: Hit Chance
        if attack_roll > def_roll:
            hit_chance = 1 - (def_roll + 2) / (2 * (attack_roll + 1))
        else:
            hit_chance = attack_roll / (2 * (def_roll + 1))

        hit_chance = max(0, min(1, hit_chance))

        # Step 7: Average Hit and DPS
        avg_hit = hit_chance * (max_hit + 1) / 2
        dps = avg_hit / params["attack_speed"]

        # Debug print
        print("=== Ranged DPS Calculation Debug ===")
        print(f"→ Input Stats:")
        print(f"  Ranged Level: {params['ranged_level']}")
        print(f"  Ranged Boost: {params.get('ranged_boost', 0)}")
        print(f"  Prayer Modifier: {params.get('ranged_prayer', 1.0)}")
        print(f"  Style Bonus (Attack): {params.get('attack_style_bonus_attack', 0)}")
        print(f"  Style Bonus (Strength): {params.get('attack_style_bonus_strength', 0)}")
        print(f"  Void Ranged: {params.get('void_ranged', False)}")
        print()
        print(f"→ Effective Strength: {effective_str}")
        print(f"  Ranged Strength Bonus: {params['ranged_strength_bonus']}")
        print(f"  Max Hit: {max_hit}")
        print()
        print(f"→ Effective Attack: {effective_atk}")
        print(f"  Ranged Attack Bonus: {params['ranged_attack_bonus']}")
        print(f"  Attack Roll: {attack_roll}")
        print()
        print(f"→ Target Stats:")
        print(f"  Defence Level: {params['target_defence_level']}")
        print(f"  Ranged Defence Bonus: {params['target_ranged_defence_bonus']}")
        print(f"  Defence Roll: {def_roll}")
        print()
        print(f"→ Hit Chance: {hit_chance:.4f}")
        print(f"→ Average Hit: {avg_hit:.4f}")
        print(f"→ Attack Speed: {params['attack_speed']}s")
        print(f"→ DPS: {dps:.4f}")
        print("====================================")

        return {
            "dps": dps,
            "max_hit": max_hit,
            "hit_chance": hit_chance,
            "attack_roll": attack_roll,
            "defence_roll": def_roll,
            "average_hit": avg_hit,
            "effective_str": effective_str,
            "effective_atk": effective_atk
        }
