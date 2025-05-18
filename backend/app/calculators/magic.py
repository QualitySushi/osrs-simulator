import math
from typing import Dict, Any

class MagicCalculator:
    """Calculator for magic DPS calculations."""
    
    @staticmethod
    def calculate_dps(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate magic DPS based on input parameters.
        
        Args:
            params: A dictionary containing all required magic parameters
            
        Returns:
            Dictionary with DPS results including intermediate calculations
        """
        # Calculate damage multiplier by summing all bonuses
        dmg_multiplier = 1.0 + sum([
            params.get("magic_damage_bonus", 0.0),
            params.get("shadow_bonus", 0.0),
            params.get("virtus_bonus", 0.0),
            params.get("tome_bonus", 0.0),
            params.get("prayer_bonus", 0.0),
            params.get("elemental_weakness", 0.0),
            params.get("salve_bonus", 0.0)
        ])
        
        # Calculate max hit
        base_hit = params.get("base_spell_max_hit")
        if base_hit is None:
            raise ValueError("Missing required field: base_spell_max_hit")
        max_hit = math.floor(base_hit * dmg_multiplier)
        
        # Calculate effective magic attack
        base_mag = params["magic_level"] + params.get("magic_boost", 0)
        effective_atk = math.floor(base_mag * params.get("magic_prayer", 1.0))
        effective_atk += 8 + (
            params.get("attack_style_bonus") or 
            params.get("attack_style_bonus_attack", 0)
        )
        
        # Apply void bonus if applicable
        if params.get("void_magic", False):
            effective_atk = math.floor(effective_atk * 1.45)
        
        # Calculate attack roll
        attack_roll = math.floor(effective_atk * (params["magic_attack_bonus"] + 64))
        attack_roll = math.floor(attack_roll * params.get("gear_multiplier", 1.0))
        
        # Calculate defence roll
        def_roll = (params["target_magic_level"] + 9) * (params["target_magic_defence"] + 64)
        
        # Calculate hit chance
        if attack_roll > def_roll:
            hit_chance = 1 - (def_roll + 2) / (2 * (attack_roll + 1))
        else:
            hit_chance = attack_roll / (2 * (def_roll + 1))
        
        # Cap hit chance between 0 and 1
        hit_chance = max(0, min(1, hit_chance))
        
        # Calculate average hit and DPS
        avg_hit = hit_chance * (max_hit + 1) / 2
        dps = avg_hit / params["attack_speed"]
        
        # Return all calculated values
        return {
            "dps": dps,
            "max_hit": max_hit,
            "hit_chance": hit_chance,
            "attack_roll": attack_roll,
            "defence_roll": def_roll,
            "average_hit": avg_hit,
            "effective_atk": effective_atk,
            "damage_multiplier": dmg_multiplier
        }
    
    @staticmethod
    def calculate_staff_of_the_dead_bonus(spell_max_hit: int) -> int:
        """
        Calculate the 15% bonus from Staff of the Dead for standard spellbook spells.
        
        Args:
            spell_max_hit: Base max hit of the spell
            
        Returns:
            New max hit with the SotD bonus applied
        """
        return math.floor(spell_max_hit * 1.15)
    
    @staticmethod
    def calculate_tumekens_shadow_bonus(base_max_hit: int, magic_level: int) -> Dict[str, Any]:
        """
        Calculate the Tumeken's Shadow bonus.
        50% accuracy and up to 50% higher based on magic level.
        
        Args:
            base_max_hit: Base max hit of the spell
            magic_level: Player's magic level
            
        Returns:
            Dictionary with the new max hit and accuracy info
        """
        # Base damage bonus is 50%
        damage_bonus = 0.5
        
        # Additional bonus based on magic level, up to 50% more (total of 100%)
        level_bonus = min(0.5, (magic_level / 99) * 0.5)
        total_bonus = damage_bonus + level_bonus
        
        return {
            "accuracy_bonus": 0.5,  # 50% accuracy bonus
            "damage_bonus": total_bonus,
            "max_hit_with_bonus": math.floor(base_max_hit * (1 + total_bonus))
        }