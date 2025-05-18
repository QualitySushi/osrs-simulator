import math
from typing import Dict, Any

class MeleeCalculator:
    """Calculator for melee DPS calculations."""

    @staticmethod
    def calculate_dps(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate melee DPS based on input parameters.
        
        Args:
            params: A dictionary containing all required melee parameters
            
        Returns:
            Dictionary with DPS results including intermediate calculations
        """
        # Step 1: Effective Strength Level
        base_str = params["strength_level"] + params.get("strength_boost", 0)
        effective_str = math.floor(base_str * params.get("strength_prayer", 1.0))
        effective_str += 8 + params.get("attack_style_bonus_strength", 0)
        if params.get("void_melee", False):
            effective_str = math.floor(effective_str * 1.1)

        # Step 2: Max Hit
        max_hit = math.floor((effective_str * (params["melee_strength_bonus"] + 64) / 640) + 0.5)
        max_hit = math.floor(max_hit * params.get("gear_multiplier", 1.0))
        max_hit = math.floor(max_hit * params.get("special_multiplier", 1.0))

        # Step 3: Effective Attack Level
        base_atk = params["attack_level"] + params.get("attack_boost", 0)
        effective_atk = math.floor(base_atk * params.get("attack_prayer", 1.0))
        effective_atk += 8 + params.get("attack_style_bonus_attack", 0)
        if params.get("void_melee", False):
            effective_atk = math.floor(effective_atk * 1.1)

        # Step 4: Attack Roll
        attack_roll = math.floor(effective_atk * (params["melee_attack_bonus"] + 64))
        attack_roll = math.floor(attack_roll * params.get("gear_multiplier", 1.0))

        # Step 5–6: Defence Roll
        def_roll = (params["target_defence_level"] + 9) * (params["target_defence_bonus"] + 64)

        # Step 7: Hit Chance (Wiki accurate)
        if attack_roll > def_roll:
            hit_chance = 1 - (def_roll + 2) / (2 * (attack_roll + 1))
        else:
            hit_chance = attack_roll / (2 * (def_roll + 1))

        hit_chance = max(0, min(1, hit_chance))  # Clamp between 0 and 1

        # Step 8: Average Hit and DPS
        avg_hit = hit_chance * (max_hit + 1) / 2
        dps = avg_hit / params["attack_speed"]

        # Debug output
        print("=== Melee DPS Calculation Debug ===")
        print(f"→ Input Stats:")
        print(f"  Strength Level: {params['strength_level']}")
        print(f"  Strength Boost: {params.get('strength_boost', 0)}")
        print(f"  Prayer Modifier (STR): {params.get('strength_prayer', 1.0)}")
        print(f"  Attack Style Bonus: {params.get('attack_style_bonus', 0)}")
        print(f"  Void Melee: {params.get('void_melee', False)}")
        print()
        print(f"→ Effective Strength: {effective_str}")
        print(f"  Strength Bonus: {params['melee_strength_bonus']}")
        print(f"  Max Hit: {max_hit}")
        print()
        print(f"→ Input Attack:")
        print(f"  Attack Level: {params['attack_level']}")
        print(f"  Attack Boost: {params.get('attack_boost', 0)}")
        print(f"  Prayer Modifier (ATK): {params.get('attack_prayer', 1.0)}")
        print()
        print(f"→ Effective Attack: {effective_atk}")
        print(f"  Attack Bonus: {params['melee_attack_bonus']}")
        print(f"  Attack Roll: {attack_roll}")
        print()
        print(f"→ Target Stats:")
        print(f"  Target Defence Level: {params['target_defence_level']}")
        print(f"  Target Defence Bonus: {params['target_defence_bonus']}")
        print(f"  Defence Roll: {def_roll}")
        print()
        print(f"→ Hit Chance: {hit_chance:.4f}")
        print(f"→ Average Hit: {avg_hit:.4f}")
        print(f"→ Attack Speed: {params['attack_speed']}s")
        print(f"→ DPS: {dps:.4f}")
        print("===================================")

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
