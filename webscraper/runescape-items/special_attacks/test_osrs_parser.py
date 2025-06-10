"""
Unit tests for OSRS Special Attack Parser

Run with: python -m pytest test_osrs_parser.py -v
"""

import pytest
from osrs_parser import (
    OSRSSpecialAttackParser, 
    SpecialAttackCostExtractor,
    AccuracyModifierExtractor,
    DamageModifierExtractor,
    HitCountExtractor,
    GuaranteedHitExtractor,
    DamageBoundsExtractor,
    StatDrainExtractor,
    HealingExtractor,
    BindingExtractor,
    AreaOfEffectExtractor,
    parse_special_attack
)


class TestSpecialAttackCostExtractor:
    """Test special attack cost extraction"""
    
    def setup_method(self):
        self.extractor = SpecialAttackCostExtractor()
    
    def test_standard_cost_patterns(self):
        """Test standard cost extraction patterns"""
        test_cases = [
            ("consumes 50% of the player's special attack energy", 50),
            ("consuming 25% of the wielder's special attack energy", 25),
            ("uses 75% of the player's special attack energy", 75),
            ("costs 100% special attack energy", 100),
        ]
        
        for text, expected in test_cases:
            assert self.extractor.extract_cost(text) == expected
    
    def test_exclusion_of_false_positives(self):
        """Test that damage/healing percentages are not extracted as costs"""
        false_positives = [
            "deals 50% more damage",
            "heals 25% of damage dealt", 
            "increases accuracy by 30%",
            "drains opponent's Defence by 15%",
        ]
        
        for text in false_positives:
            assert self.extractor.extract_cost(text) is None
    
    def test_complex_mixed_text(self):
        """Test extraction from complex text with multiple percentages"""
        text = ("The weapon deals 25% more damage and has 50% increased accuracy, "
                "consuming 75% of the player's special attack energy")
        assert self.extractor.extract_cost(text) == 75
    
    def test_invalid_costs(self):
        """Test that invalid cost values are rejected"""
        invalid_cases = [
            "consumes 200% special attack energy",  # Too high
            "consumes 1% special attack energy",    # Too low
        ]
        
        for text in invalid_cases:
            assert self.extractor.extract_cost(text) is None


class TestAccuracyModifierExtractor:
    """Test accuracy modifier extraction"""
    
    def setup_method(self):
        self.extractor = AccuracyModifierExtractor()
    
    def test_doubled_accuracy(self):
        """Test doubled accuracy detection"""
        test_cases = [
            "has doubled accuracy",
            "accuracy is doubled",
            "double accuracy",
        ]
        
        for text in test_cases:
            assert self.extractor.extract_accuracy_multiplier(text) == 2.0
    
    def test_percentage_increases(self):
        """Test percentage-based accuracy increases"""
        test_cases = [
            ("25% increase in accuracy", 1.25),
            ("accuracy boost of 50%", 1.5),
            ("with 100% accuracy increase", 2.0),
        ]
        
        for text, expected in test_cases:
            assert self.extractor.extract_accuracy_multiplier(text) == expected
    
    def test_no_accuracy_modifier(self):
        """Test cases with no accuracy modifier"""
        assert self.extractor.extract_accuracy_multiplier("deals damage") == 1.0
        assert self.extractor.extract_accuracy_multiplier("") == 1.0


class TestDamageModifierExtractor:
    """Test damage modifier extraction"""
    
    def setup_method(self):
        self.extractor = DamageModifierExtractor()
    
    def test_damage_increases(self):
        """Test damage increase detection"""
        test_cases = [
            ("21% more damage", 1.21),
            ("inflicts damage with 50% higher maximum hit", 1.5),
            ("deals 25% more damage", 1.25),
        ]
        
        for text, expected in test_cases:
            assert self.extractor.extract_damage_multiplier(text) == expected
    
    def test_damage_reductions(self):
        """Test damage reduction detection (like Abyssal dagger)"""
        test_cases = [
            ("15% reduced damage", 0.85),
            ("25% less damage", 0.75),
        ]
        
        for text, expected in test_cases:
            assert self.extractor.extract_damage_multiplier(text) == expected
    
    def test_exclusion_of_healing_percentages(self):
        """Test that healing percentages don't count as damage modifiers"""
        healing_cases = [
            "heals 50% of damage dealt",
            "restores 25% of max hitpoints",
        ]
        
        for text in healing_cases:
            assert self.extractor.extract_damage_multiplier(text) == 1.0


class TestHitCountExtractor:
    """Test hit count extraction"""
    
    def setup_method(self):
        self.extractor = HitCountExtractor()
    
    def test_multi_hit_detection(self):
        """Test detection of multiple hits"""
        test_cases = [
            ("hits twice", 2),
            ("two hits", 2),
            ("four hits in succession", 4),
            ("hits the enemy 3 times", 3),
        ]
        
        for text, expected in test_cases:
            assert self.extractor.extract_hit_count(text) == expected
    
    def test_single_hit_default(self):
        """Test default single hit"""
        assert self.extractor.extract_hit_count("deals damage") == 1
        assert self.extractor.extract_hit_count("") == 1


class TestGuaranteedHitExtractor:
    """Test guaranteed hit detection"""
    
    def setup_method(self):
        self.extractor = GuaranteedHitExtractor()
    
    def test_guaranteed_hit_detection(self):
        """Test guaranteed hit patterns"""
        guaranteed_cases = [
            "guaranteed to hit",
            "never misses",
            "will never miss",
            "cannot miss",
            "always hits",
        ]
        
        for text in guaranteed_cases:
            assert self.extractor.extract_guaranteed_hit(text) is True
    
    def test_no_guaranteed_hit(self):
        """Test cases without guaranteed hits"""
        assert self.extractor.extract_guaranteed_hit("deals damage") is False
        assert self.extractor.extract_guaranteed_hit("") is False


class TestDamageBoundsExtractor:
    """Test damage bounds extraction"""
    
    def setup_method(self):
        self.extractor = DamageBoundsExtractor()
    
    def test_minimum_damage(self):
        """Test minimum damage extraction"""
        test_cases = [
            ("minimum 5 damage", 5, None),
            ("guaranteeing 8 additional damage", 8, None),
            ("minimum hit of 10", 10, None),
        ]
        
        for text, expected_min, expected_max in test_cases:
            min_dmg, max_dmg = self.extractor.extract_damage_bounds(text)
            assert min_dmg == expected_min
            assert max_dmg == expected_max
    
    def test_maximum_damage_cap(self):
        """Test maximum damage cap extraction"""
        test_cases = [
            ("capping max hit at 48", None, 48),
            ("max hit capped at 25", None, 25),
            ("capped at 30 damage", None, 30),
        ]
        
        for text, expected_min, expected_max in test_cases:
            min_dmg, max_dmg = self.extractor.extract_damage_bounds(text)
            assert min_dmg == expected_min
            assert max_dmg == expected_max


class TestStatDrainExtractor:
    """Test stat drain extraction"""
    
    def setup_method(self):
        self.extractor = StatDrainExtractor()
    
    def test_damage_based_drains(self):
        """Test damage-based stat drains (like Bandos godsword)"""
        text = "drains the opponent's combat levels equivalent to the damage hit"
        result = self.extractor.extract(text, "Bandos godsword")
        
        assert len(result) == 1
        assert result[0]['type'] == 'damage_based'
    
    def test_percentage_drains(self):
        """Test percentage-based stat drains"""
        text = "lowers the opponent's Strength, Attack, and Defence levels by 5%"
        result = self.extractor.extract(text, "Arclight")
        
        expected_stats = {'strength', 'attack', 'defence'}
        actual_stats = {drain['stat'] for drain in result}
        assert actual_stats == expected_stats
        assert all(drain['percentage'] == 5 for drain in result)
    
    def test_no_stat_drain(self):
        """Test cases with no stat drains"""
        text = "deals damage to the target"
        result = self.extractor.extract(text, "Regular sword")
        assert result == []


class TestHealingExtractor:
    """Test healing extraction"""
    
    def setup_method(self):
        self.extractor = HealingExtractor()
    
    def test_percentage_healing(self):
        """Test percentage-based healing"""
        text = "heals 50% of damage dealt"
        result = self.extractor.extract(text)
        
        assert result is not None
        assert result['type'] == 'percentage_damage'
        assert result['value'] == 50
    
    def test_flat_healing(self):
        """Test flat healing amounts"""
        text = "heals 25 hitpoints"
        result = self.extractor.extract(text)
        
        assert result is not None
        assert result['type'] == 'flat'
        assert result['value'] == 25
    
    def test_healing_with_cap(self):
        """Test healing with caps"""
        text = "heals 50% of damage dealt up to 30"
        result = self.extractor.extract(text)
        
        assert result is not None
        assert result['cap'] == 30


class TestBindingExtractor:
    """Test binding/stunning extraction"""
    
    def setup_method(self):
        self.extractor = BindingExtractor()
    
    def test_binding_effects(self):
        """Test various binding effects"""
        test_cases = [
            ("stuns for 3 seconds", 'stun', 3.0),
            ("binds the target for 5 ticks", 'bind', 5.0),
            ("freezes for 19.2 seconds", 'freeze', 19.2),
        ]
        
        for text, expected_type, expected_duration in test_cases:
            result = self.extractor.extract(text)
            assert result is not None
            assert result['type'] == expected_type
            assert result['duration'] == expected_duration


class TestAreaOfEffectExtractor:
    """Test AoE extraction"""
    
    def setup_method(self):
        self.extractor = AreaOfEffectExtractor()
    
    def test_multi_target(self):
        """Test multi-target detection"""
        text = "hits up to 5 enemies"
        result = self.extractor.extract(text)
        
        assert result is not None
        assert result['type'] == 'multi_target'
        assert result['max_targets'] == 5
    
    def test_area_dimensions(self):
        """Test area dimension detection"""
        text = "hits targets in 3x3 area"
        result = self.extractor.extract(text)
        
        assert result is not None
        assert result['type'] == 'area'
        assert result['size'] == '3x3'
    
    def test_radius_detection(self):
        """Test radius detection"""
        text = "hits within 2 tile radius"
        result = self.extractor.extract(text)
        
        assert result is not None
        assert result['type'] == 'radius'
        assert result['radius'] == 2


class TestIntegrationCases:
    """Test complete parsing of known weapons"""
    
    def test_bandos_godsword(self):
        """Test Bandos godsword parsing"""
        text = ("The Bandos godsword's special attack, Warstrike, has doubled accuracy, "
                "inflicts 21% more damage and drains the opponent's combat levels equivalent "
                "to the damage hit. Warstrike consumes 50% of the wielder's special attack energy.")
        
        result = parse_special_attack(text, "Bandos godsword")
        
        assert result['special_cost'] == 50
        assert result['accuracy_multiplier'] == 2.0
        assert result['damage_multiplier'] == 1.21
        assert len(result['special_mechanics']['stat_drains']) == 1
        assert result['special_mechanics']['stat_drains'][0]['type'] == 'damage_based'
    
    def test_abyssal_dagger(self):
        """Test Abyssal dagger parsing"""
        text = ("The abyssal dagger has a special attack, Abyssal Puncture, which hits twice "
                "in quick succession with a 25% increase in accuracy and 15% reduced damage, "
                "consuming 25% of the player's special attack energy.")
        
        result = parse_special_attack(text, "Abyssal dagger")
        
        assert result['special_cost'] == 25
        assert result['accuracy_multiplier'] == 1.25
        assert result['damage_multiplier'] == 0.85  # 15% reduced
        assert result['hit_count'] == 2
    
    def test_dragon_claws(self):
        """Test Dragon claws parsing"""
        text = ("These claws feature a special attack, Slice and Dice, which drains 50% "
                "of the special attack bar and hits an enemy four times in succession.")
        
        result = parse_special_attack(text, "Dragon claws")
        
        assert result['special_cost'] == 50
        assert result['hit_count'] == 4
    
    def test_dark_bow(self):
        """Test Dark bow parsing"""
        text = ("The dark bow's special attack deals up to 30% more damage with a minimum "
                "of 5 damage per arrow, consuming 55% of the player's special attack energy.")
        
        result = parse_special_attack(text, "Dark bow")
        
        assert result['special_cost'] == 55
        assert result['damage_multiplier'] == 1.3
        assert result['min_damage'] == 5
    
    def test_saradomin_godsword(self):
        """Test Saradomin godsword parsing"""
        text = ("The Saradomin godsword has doubled accuracy, 10% increased max hit, "
                "and heals 50% of damage dealt, consuming 50% special attack energy.")
        
        result = parse_special_attack(text, "Saradomin godsword")
        
        assert result['special_cost'] == 50
        assert result['accuracy_multiplier'] == 2.0
        assert result['damage_multiplier'] == 1.1
        assert result['special_mechanics']['healing']['type'] == 'percentage_damage'
        assert result['special_mechanics']['healing']['value'] == 50
    
    def test_zamorak_godsword(self):
        """Test Zamorak godsword parsing"""
        text = ("The Zamorak godsword doubles accuracy, increases max hit by 10%, "
                "and freezes the target for 19.2 seconds, consuming 50% special attack energy.")
        
        result = parse_special_attack(text, "Zamorak godsword")
        
        assert result['special_cost'] == 50
        assert result['accuracy_multiplier'] == 2.0
        assert result['damage_multiplier'] == 1.1
        assert result['special_mechanics']['binding']['type'] == 'freeze'
        assert result['special_mechanics']['binding']['duration'] == 19.2
    
    def test_seercull(self):
        """Test Seercull parsing"""
        text = ("The Seercull's special attack is guaranteed to hit and lowers the opponent's "
                "Magic level equal to damage dealt, consuming 100% special attack energy.")
        
        result = parse_special_attack(text, "Seercull")
        
        assert result['special_cost'] == 100
        assert result['guaranteed_hit'] is True
    
    def test_dinh_bulwark(self):
        """Test Dinh's bulwark parsing"""
        text = ("Dinh's bulwark hits up to 10 enemies in an 11x11 area with 20% increased "
                "accuracy, consuming 50% special attack energy.")
        
        result = parse_special_attack(text, "Dinh's bulwark")
        
        assert result['special_cost'] == 50
        assert result['accuracy_multiplier'] == 1.2
        assert result['special_mechanics']['area_of_effect']['type'] == 'multi_target'
        assert result['special_mechanics']['area_of_effect']['max_targets'] == 10


class TestEdgeCases:
    """Test edge cases and potential issues"""
    
    def test_empty_text(self):
        """Test handling of empty text"""
        result = parse_special_attack("", "Empty weapon")
        
        assert result['special_cost'] is None
        assert result['accuracy_multiplier'] == 1.0
        assert result['damage_multiplier'] == 1.0
        assert result['hit_count'] == 1
        assert result['guaranteed_hit'] is False
        assert result['special_mechanics'] == {}
    
    def test_text_with_multiple_percentages(self):
        """Test text with many percentages to ensure correct extraction"""
        text = ("This weapon deals 15% more damage to dragons, has 25% poison chance, "
                "heals 10% of damage dealt, and consumes 75% special attack energy.")
        
        result = parse_special_attack(text, "Complex weapon")
        
        # Should extract the special attack cost, not other percentages
        assert result['special_cost'] == 75
    
    def test_very_long_text(self):
        """Test handling of very long descriptive text"""
        text = ("This ancient weapon, forged in the depths of the abyss by skilled craftsmen "
                "who dedicated their lives to perfecting the art of weaponsmithing, has a "
                "special attack that consumes 50% of the wielder's special attack energy and "
                "deals tremendous damage to all who dare oppose its wielder in combat.")
        
        result = parse_special_attack(text, "Ancient weapon")
        
        assert result['special_cost'] == 50
    
    def test_ambiguous_wording(self):
        """Test handling of ambiguous wording"""
        text = "The weapon's special reduces enemy damage by 50% for 10 seconds, costs 25% energy"
        
        result = parse_special_attack(text, "Defensive weapon")
        
        # Should extract cost correctly despite damage reduction mention
        assert result['special_cost'] == 25


if __name__ == "__main__":
    # Run a quick test if executed directly
    print("Running quick integration tests...")
    
    test_cases = [
        ("Bandos godsword", "doubled accuracy, inflicts 21% more damage, consumes 50% special attack energy"),
        ("Abyssal dagger", "hits twice with 25% increase in accuracy and 15% reduced damage, consuming 25% energy"),
        ("Dragon claws", "hits four times in succession, drains 50% of the special attack bar"),
    ]
    
    for weapon, text in test_cases:
        result = parse_special_attack(text, weapon)
        print(f"\n{weapon}:")
        print(f"  Cost: {result.get('special_cost')}%")
        print(f"  Accuracy: {result.get('accuracy_multiplier')}x")
        print(f"  Damage: {result.get('damage_multiplier')}x")
        print(f"  Hits: {result.get('hit_count')}")
        if result.get('special_mechanics'):
            print(f"  Mechanics: {list(result['special_mechanics'].keys())}")
    
    print("\nAll tests completed successfully!")