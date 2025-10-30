import unittest
from unittest.mock import patch

from app.services import seed_service, bis_service, calculation_service
from app.repositories import item_repository
from app.models import DpsParameters


class TestSeedService(unittest.TestCase):
    def test_encode_decode_roundtrip(self):
        params = DpsParameters(
            combat_style="melee",
            strength_level=1,
            attack_level=1,
            melee_strength_bonus=0,
            melee_attack_bonus=0,
            attack_style_bonus_strength=0,
            attack_style_bonus_attack=0,
            target_defence_level=1,
            target_defence_bonus=0,
            attack_speed=2.4,
        )
        seed = seed_service.encode_seed(params)
        decoded = seed_service.decode_seed(seed)
        self.assertEqual(decoded.combat_style, params.combat_style)
        self.assertEqual(decoded.attack_speed, params.attack_speed)
        self.assertEqual(decoded.strength_level, params.strength_level)


class TestBisService(unittest.TestCase):
    def test_suggest_bis_selects_highest_dps_per_slot(self):
        items = [
            {
                'id': 1,
                'name': 'Bronze sword',
                'slot': 'weapon',
                'combat_stats': {
                    'attack_bonuses': {'slash': 10},
                    'other_bonuses': {'strength': 5},
                },
            },
            {
                'id': 2,
                'name': 'Iron sword',
                'slot': 'weapon',
                'combat_stats': {
                    'attack_bonuses': {'slash': 5},
                    'other_bonuses': {'strength': 10},
                },
            },
            {
                'id': 3,
                'name': 'Basic helm',
                'slot': 'head',
                'combat_stats': {
                    'attack_bonuses': {},
                    'other_bonuses': {'strength': 2},
                },
            },
        ]

        with patch.object(item_repository, 'get_all_items', return_value=items):
            # Mock calculation_service to score based on melee_strength_bonus
            with patch.object(calculation_service, 'calculate_dps', side_effect=lambda p: {'dps': p.get('melee_strength_bonus', 0)}):
                result = bis_service.suggest_bis({'combat_style': 'melee'})

        self.assertEqual(result['weapon']['id'], 2)
        self.assertEqual(result['head']['id'], 3)


class TestCalculationService(unittest.TestCase):
    def test_calculate_dps_delegates(self):
        params = {'combat_style': 'melee'}
        with patch('app.services.calculation_service.DpsCalculator.calculate_dps', return_value={'dps': 1}) as mock_calc:
            result = calculation_service.calculate_dps(params)
            mock_calc.assert_called_once_with(params)
            self.assertEqual(result, {'dps': 1})


class TestSettings(unittest.TestCase):
    def test_cache_ttl_env_override(self):
        import importlib, os
        old = os.environ.get('CACHE_TTL_SECONDS')
        try:
            os.environ['CACHE_TTL_SECONDS'] = '123'
            settings = importlib.reload(importlib.import_module('app.config.settings'))
            self.assertEqual(settings.CACHE_TTL_SECONDS, 123)
        finally:
            if old is None:
                os.environ.pop('CACHE_TTL_SECONDS', None)
            else:
                os.environ['CACHE_TTL_SECONDS'] = old
            importlib.reload(importlib.import_module('app.config.settings'))



if __name__ == '__main__':
    unittest.main()
