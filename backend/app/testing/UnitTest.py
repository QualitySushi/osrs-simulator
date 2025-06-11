import unittest
import math
from unittest.mock import patch
import sys
import os

# Add backend directory to path to import the app package
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

# Import calculator modules
from app.calculators import (
    DpsCalculator,
    MeleeCalculator,
    RangedCalculator,
    MagicCalculator,
)


class TestDpsCalculator(unittest.TestCase):
    """Test the main DPS Calculator dispatch logic."""

    def test_dispatch_melee(self):
        """Test that melee calculations are dispatched correctly."""
        params = {"combat_style": "melee"}

        with patch("app.calculators.MeleeCalculator.calculate_dps") as mock_melee:
            mock_melee.return_value = {"dps": 10.0}
            result = DpsCalculator.calculate_dps(params)

            mock_melee.assert_called_once_with(params)
            self.assertEqual(result, {"dps": 10.0})

    def test_dispatch_ranged(self):
        """Test that ranged calculations are dispatched correctly."""
        params = {"combat_style": "ranged"}

        with patch("app.calculators.RangedCalculator.calculate_dps") as mock_ranged:
            mock_ranged.return_value = {"dps": 8.5}
            result = DpsCalculator.calculate_dps(params)

            mock_ranged.assert_called_once_with(params)
            self.assertEqual(result, {"dps": 8.5})

    def test_dispatch_magic(self):
        """Test that magic calculations are dispatched correctly."""
        params = {"combat_style": "magic"}

        with patch("app.calculators.MagicCalculator.calculate_dps") as mock_magic:
            mock_magic.return_value = {"dps": 7.2}
            result = DpsCalculator.calculate_dps(params)

            mock_magic.assert_called_once_with(params)
            self.assertEqual(result, {"dps": 7.2})

    def test_invalid_combat_style(self):
        """Test that an invalid combat style raises ValueError."""
        params = {"combat_style": "invalid_style"}

        with self.assertRaises(ValueError):
            DpsCalculator.calculate_dps(params)

    def test_missing_melee_params(self):
        """Missing required melee parameters should raise KeyError."""
        with self.assertRaises(KeyError):
            MeleeCalculator.calculate_dps({"combat_style": "melee"})

    def test_special_attack_regen_simulation(self):
        """Special attacks should use energy regeneration and separate DPS."""
        params = {
            "combat_style": "melee",
            "strength_level": 99,
            "strength_boost": 0,
            "strength_prayer": 1.0,
            "attack_level": 99,
            "attack_boost": 0,
            "attack_prayer": 1.0,
            "melee_strength_bonus": 80,
            "melee_attack_bonus": 80,
            "attack_style_bonus_strength": 3,
            "attack_style_bonus_attack": 0,
            "attack_speed": 2.4,
            "target_defence_level": 100,
            "target_defence_bonus": 50,
            "special_damage_multiplier": 1.2,
            "special_accuracy_modifier": 1.0,
            "special_energy_cost": 50,
            "special_attack_speed": 3.0,
            "special_regen_rate": 10 / 30,
            "duration": 60,
        }

        result = DpsCalculator.calculate_dps(params)
        self.assertIn("special_attacks", result)
        self.assertEqual(result["special_attacks"], 2)
        self.assertIn("special_attack_dps", result)
        self.assertGreater(result["special_attack_dps"], 0)
        self.assertIn("mainhand_dps", result)
        self.assertAlmostEqual(
            result["dps"],
            result["mainhand_dps"] + result["special_attack_dps"],
            places=5,
        )

    def test_initial_special_energy(self):
        """Initial special energy should influence special attack count."""
        params = {
            "combat_style": "melee",
            "strength_level": 99,
            "strength_boost": 0,
            "strength_prayer": 1.0,
            "attack_level": 99,
            "attack_boost": 0,
            "attack_prayer": 1.0,
            "melee_strength_bonus": 80,
            "melee_attack_bonus": 80,
            "attack_style_bonus_strength": 3,
            "attack_style_bonus_attack": 0,
            "attack_speed": 2.4,
            "target_defence_level": 100,
            "target_defence_bonus": 50,
            "special_damage_multiplier": 1.2,
            "special_accuracy_modifier": 1.0,
            "special_energy_cost": 50,
            "special_attack_speed": 3.0,
            "special_regen_rate": 10 / 30,
            "duration": 60,
            "initial_special_energy": 50.0,
        }

        result = DpsCalculator.calculate_dps(params)
        self.assertEqual(result["special_attacks"], 1)


class TestMeleeCalculator(unittest.TestCase):
    """Test the Melee Calculator functionality."""

    def setUp(self):
        """Set up test parameters."""
        self.basic_params = {
            "combat_style": "melee",
            "strength_level": 99,
            "strength_boost": 0,
            "strength_prayer": 1.0,
            "attack_level": 99,
            "attack_boost": 0,
            "attack_prayer": 1.0,
            "melee_strength_bonus": 100,
            "melee_attack_bonus": 100,
            "attack_style_bonus_attack": 0,
            "attack_style_bonus_strength": 3,
            "attack_style_bonus": 0,
            "void_melee": False,
            "gear_multiplier": 1.0,
            "special_multiplier": 1.0,
            "target_defence_level": 100,
            "target_defence_bonus": 50,
            "attack_speed": 2.4,  # 4 ticks
        }

    def test_basic_calculation(self):
        """Test a basic melee DPS calculation."""
        result = MeleeCalculator.calculate_dps(self.basic_params)

        # Check all result fields exist
        self.assertIn("dps", result)
        self.assertIn("max_hit", result)
        self.assertIn("hit_chance", result)
        self.assertIn("attack_roll", result)
        self.assertIn("defence_roll", result)
        self.assertIn("average_hit", result)
        self.assertIn("effective_str", result)
        self.assertIn("effective_atk", result)

        # Verify effective strength calculation
        self.assertEqual(result["effective_str"], 99 + 8 + 3)  # level + 8 + style bonus

        # Verify max hit calculation
        expected_max_hit = math.floor(((99 + 8 + 3) * (100 + 64) / 640) + 0.5)
        self.assertEqual(result["max_hit"], expected_max_hit)

        # Verify effective attack calculation
        self.assertEqual(result["effective_atk"], 99 + 8 + 0)  # level + 8 + style bonus

        # Verify attack roll
        expected_attack_roll = math.floor((99 + 8) * (100 + 64))
        self.assertEqual(result["attack_roll"], expected_attack_roll)

        # Verify defense roll
        expected_def_roll = (100 + 9) * (50 + 64)
        self.assertEqual(result["defence_roll"], expected_def_roll)

        # Hit chance calculation is complex, just verify it's in range
        self.assertTrue(0 <= result["hit_chance"] <= 1)

        # Verify DPS calculation formula
        expected_avg_hit = result["hit_chance"] * (result["max_hit"] + 1) / 2
        self.assertAlmostEqual(result["average_hit"], expected_avg_hit, places=5)

        expected_dps = expected_avg_hit / 2.4
        self.assertAlmostEqual(result["dps"], expected_dps, places=5)

    def test_void_melee(self):
        """Test melee calculation with void armor bonus."""
        void_params = self.basic_params.copy()
        void_params["void_melee"] = True

        result = MeleeCalculator.calculate_dps(void_params)

        # Verify void boost to effective levels (10% boost)
        self.assertEqual(result["effective_str"], math.floor((99 + 8 + 3) * 1.1))
        self.assertEqual(result["effective_atk"], math.floor((99 + 8) * 1.1))

    def test_prayer_boost(self):
        """Test melee calculation with prayer boost."""
        prayer_params = self.basic_params.copy()
        prayer_params["strength_prayer"] = 1.23  # Piety
        prayer_params["attack_prayer"] = 1.20  # Piety

        result = MeleeCalculator.calculate_dps(prayer_params)

        # Verify prayer boost to effective levels
        self.assertEqual(result["effective_str"], math.floor(99 * 1.23) + 8 + 3)
        self.assertEqual(result["effective_atk"], math.floor(99 * 1.20) + 8)

    def test_gear_multiplier(self):
        """Test melee calculation with gear multiplier (e.g., Slayer helmet)."""
        gear_params = self.basic_params.copy()
        gear_params["gear_multiplier"] = 1.15  # 15% boost

        result = MeleeCalculator.calculate_dps(gear_params)

        # Check max hit is properly multiplied
        no_mult_max_hit = math.floor(((99 + 8 + 3) * (100 + 64) / 640) + 0.5)
        expected_max_hit = math.floor(no_mult_max_hit * 1.15)
        self.assertEqual(result["max_hit"], expected_max_hit)

        # Check attack roll is properly multiplied
        no_mult_attack_roll = math.floor((99 + 8) * (100 + 64))
        expected_attack_roll = math.floor(no_mult_attack_roll * 1.15)
        self.assertEqual(result["attack_roll"], expected_attack_roll)

    def test_special_attack(self):
        """Test melee calculation with special attack multiplier."""
        special_params = self.basic_params.copy()
        special_params["special_multiplier"] = 1.25  # 25% boost

        result = MeleeCalculator.calculate_dps(special_params)

        # Check max hit with special attack multiplier
        no_mult_max_hit = math.floor(((99 + 8 + 3) * (100 + 64) / 640) + 0.5)
        expected_max_hit = math.floor(no_mult_max_hit * 1.25)
        self.assertEqual(result["max_hit"], expected_max_hit)

        # Special attack doesn't affect attack roll, only max hit
        no_mult_attack_roll = math.floor((99 + 8) * (100 + 64))
        self.assertEqual(result["attack_roll"], no_mult_attack_roll)


class TestRangedCalculator(unittest.TestCase):
    """Test the Ranged Calculator functionality."""

    def setUp(self):
        """Set up test parameters."""
        self.basic_params = {
            "combat_style": "ranged",
            "ranged_level": 99,
            "ranged_boost": 0,
            "ranged_prayer": 1.0,
            "ranged_strength_bonus": 80,
            "ranged_attack_bonus": 70,
            "attack_style_bonus_attack": 0,
            "attack_style_bonus_strength": 0,
            "void_ranged": False,
            "gear_multiplier": 1.0,
            "special_multiplier": 1.0,
            "target_defence_level": 200,
            "target_defence_bonus": 60,
            "attack_speed": 3.0,  # 5 ticks (Twisted Bow)
        }

    def test_basic_calculation(self):
        """Test a basic ranged DPS calculation."""
        result = RangedCalculator.calculate_dps(self.basic_params)

        self.assertIn("dps", result)
        self.assertIn("max_hit", result)
        self.assertIn("hit_chance", result)
        self.assertIn("attack_roll", result)
        self.assertIn("defence_roll", result)
        self.assertIn("average_hit", result)
        self.assertIn("effective_str", result)
        self.assertIn("effective_atk", result)

        self.assertEqual(result["effective_str"], 99 + 8 + 0)
        expected_max_hit = math.floor(((99 + 8) * (80 + 64) / 640) + 0.5)
        self.assertEqual(result["max_hit"], expected_max_hit)

        self.assertEqual(result["effective_atk"], 99 + 8 + 0)
        expected_attack_roll = math.floor((99 + 8) * (70 + 64))
        self.assertEqual(result["attack_roll"], expected_attack_roll)

        expected_def_roll = (200 + 9) * (60 + 64)
        self.assertEqual(result["defence_roll"], expected_def_roll)

        expected_avg_hit = result["hit_chance"] * (result["max_hit"] + 1) / 2
        self.assertAlmostEqual(result["average_hit"], expected_avg_hit, places=5)
        expected_dps = expected_avg_hit / 3.0
        self.assertAlmostEqual(result["dps"], expected_dps, places=5)

    def test_void_ranged(self):
        """Test ranged calculation with void armor bonus."""
        void_params = self.basic_params.copy()
        void_params["void_ranged"] = True

        result = RangedCalculator.calculate_dps(void_params)

        self.assertEqual(result["effective_str"], math.floor((99 + 8) * 1.125))
        self.assertEqual(result["effective_atk"], math.floor((99 + 8) * 1.1))

    def test_twisted_bow(self):
        """Test the Twisted Bow special effect calculation."""
        tbow_params = self.basic_params.copy()
        tbow_params["weapon_name"] = "Twisted bow"
        tbow_params["target_magic_level"] = 200  # High magic level target

        with patch(
            "app.calculators.RangedCalculator.calculate_twisted_bow_bonus"
        ) as mock_tbow:
            # Mock the Twisted Bow bonus calculation
            mock_tbow.return_value = {
                "accuracy_multiplier": 1.299,  # 29.9% accuracy boost
                "damage_multiplier": 1.919,  # 91.9% damage boost
                "effect_description": "Twisted Bow vs 200 magic: +29.9% accuracy, +91.9% damage",
            }

            result = RangedCalculator.calculate_dps(tbow_params)

            # Verify the function was called with the correct magic level
            mock_tbow.assert_called_once_with(200)

            # Check that gear multiplier includes tbow damage bonus
            basic_result = RangedCalculator.calculate_dps(self.basic_params)
            self.assertGreater(result["max_hit"], basic_result["max_hit"])

    def test_twisted_bow_bonus_calculation(self):
        """Test the calculation of Twisted Bow bonus."""
        # Test systematically across a range of magic levels
        test_levels = list(range(0, 301, 25))

        for level in test_levels:
            with self.subTest(level=level):
                result = RangedCalculator.calculate_twisted_bow_bonus(level)

                # Check result structure
                self.assertIn("accuracy_multiplier", result)
                self.assertIn("damage_multiplier", result)
                self.assertIn("effect_description", result)

                # Magic level is capped at 250

                # For level 0, expected special case values
                if level == 0:
                    self.assertAlmostEqual(
                        result["accuracy_multiplier"], 0.399, delta=0.1
                    )
                    self.assertAlmostEqual(
                        result["damage_multiplier"], 0.236, delta=0.1
                    )

                # For level 300, should equal level 250 calculation
                if level == 300:
                    tbow_250 = RangedCalculator.calculate_twisted_bow_bonus(250)
                    self.assertEqual(
                        result["accuracy_multiplier"], tbow_250["accuracy_multiplier"]
                    )
                    self.assertEqual(
                        result["damage_multiplier"], tbow_250["damage_multiplier"]
                    )

                # Multipliers should be within their capped ranges
                self.assertTrue(0 <= result["accuracy_multiplier"] <= 1.4)
                self.assertTrue(0 <= result["damage_multiplier"] <= 2.5)

    def test_twisted_bow_missing_magic_level(self):
        """Ensure missing target_magic_level raises ValueError."""
        with self.assertRaises(ValueError):
            DpsCalculator.calculate_item_effect({"item_name": "Twisted bow"})


class TestMagicCalculator(unittest.TestCase):
    """Test the Magic Calculator functionality."""

    def setUp(self):
        """Set up test parameters."""
        self.basic_params = {
            "combat_style": "magic",
            "magic_level": 99,
            "magic_boost": 0,
            "magic_prayer": 1.0,
            "base_spell_max_hit": 24,  # Fire Surge
            "magic_attack_bonus": 80,
            "magic_damage_bonus": 0.2,  # 20% from equipment
            "attack_style_bonus": 0,
            "attack_style_bonus_attack": 0,
            "void_magic": False,
            "shadow_bonus": 0.0,
            "virtus_bonus": 0.0,
            "tome_bonus": 0.0,
            "prayer_bonus": 0.0,
            "elemental_weakness": 0.0,
            "salve_bonus": 0.0,
            "target_magic_level": 120,
            "target_magic_defence": 60,
            "attack_speed": 3.0,  # 5 ticks (standard spellbook)
        }

    def test_basic_calculation(self):
        """Test a basic magic DPS calculation."""
        result = MagicCalculator.calculate_dps(self.basic_params)

        # Check all result fields exist
        self.assertIn("dps", result)
        self.assertIn("max_hit", result)
        self.assertIn("hit_chance", result)
        self.assertIn("attack_roll", result)
        self.assertIn("defence_roll", result)
        self.assertIn("average_hit", result)
        self.assertIn("effective_atk", result)
        self.assertIn("damage_multiplier", result)

        # Verify damage multiplier calculation
        expected_dmg_multiplier = 1.0 + 0.2  # base + 20% from equipment
        self.assertEqual(result["damage_multiplier"], expected_dmg_multiplier)

        # Verify max hit calculation
        expected_max_hit = math.floor(24 * expected_dmg_multiplier)
        self.assertEqual(result["max_hit"], expected_max_hit)

        # Verify effective magic attack level
        self.assertEqual(result["effective_atk"], 99 + 8 + 0)  # level + 8 + style bonus

        # Verify attack roll
        expected_attack_roll = math.floor((99 + 8) * (80 + 64))
        self.assertEqual(result["attack_roll"], expected_attack_roll)

        # Verify defense roll
        expected_def_roll = (120 + 9) * (60 + 64)
        self.assertEqual(result["defence_roll"], expected_def_roll)

        # Hit chance calculation is complex, just verify it's in range
        self.assertTrue(0 <= result["hit_chance"] <= 1)

        # Verify DPS calculation formula
        expected_avg_hit = result["hit_chance"] * (result["max_hit"] + 1) / 2
        self.assertAlmostEqual(result["average_hit"], expected_avg_hit, places=5)

        expected_dps = expected_avg_hit / 3.0
        self.assertAlmostEqual(result["dps"], expected_dps, places=5)

    def test_void_magic(self):
        """Test magic calculation with void armor bonus."""
        void_params = self.basic_params.copy()
        void_params["void_magic"] = True

        result = MagicCalculator.calculate_dps(void_params)

        # Verify void boost to effective magic level (45% boost)
        self.assertEqual(result["effective_atk"], math.floor((99 + 8) * 1.45))

    def test_damage_bonuses(self):
        """Test magic calculation with various damage bonuses."""
        bonus_params = self.basic_params.copy()
        bonus_params["shadow_bonus"] = 0.5  # Tumeken's Shadow
        bonus_params["virtus_bonus"] = 0.09  # Full Virtus
        bonus_params["tome_bonus"] = 0.5  # Tome of Fire
        bonus_params["prayer_bonus"] = 0.05  # Magic damage prayer
        bonus_params["elemental_weakness"] = 0.1  # Target weakness
        bonus_params["salve_bonus"] = 0.2  # Salve amulet

        result = MagicCalculator.calculate_dps(bonus_params)

        # Verify total damage multiplier calculation (all bonuses add up)
        expected_dmg_multiplier = 1.0 + 0.2 + 0.5 + 0.09 + 0.5 + 0.05 + 0.1 + 0.2
        self.assertEqual(result["damage_multiplier"], expected_dmg_multiplier)

        # Verify max hit calculation
        expected_max_hit = math.floor(24 * expected_dmg_multiplier)
        self.assertEqual(result["max_hit"], expected_max_hit)

    def test_tumekens_shadow_bonus(self):
        """Test Tumeken's Shadow special effect calculation."""
        # Test at max magic level (99)
        result_99 = MagicCalculator.calculate_tumekens_shadow_bonus(24, 99)

        # At level 99, damage bonus should be 50% base + 50% from level
        self.assertEqual(result_99["accuracy_bonus"], 0.5)  # 50% accuracy
        self.assertEqual(result_99["damage_bonus"], 1.0)  # 100% damage (50% + 50%)
        self.assertEqual(result_99["max_hit_with_bonus"], math.floor(24 * 2.0))

        # Test at lower magic level (50)
        result_50 = MagicCalculator.calculate_tumekens_shadow_bonus(24, 50)

        # At level 50, damage bonus should be 50% base + (50/99)*50% from level
        self.assertEqual(
            result_50["accuracy_bonus"], 0.5
        )  # 50% accuracy remains the same
        expected_dmg_bonus = 0.5 + (50 / 99) * 0.5
        self.assertEqual(result_50["damage_bonus"], expected_dmg_bonus)
        self.assertEqual(
            result_50["max_hit_with_bonus"], math.floor(24 * (1 + expected_dmg_bonus))
        )


if __name__ == "__main__":
    unittest.main()
