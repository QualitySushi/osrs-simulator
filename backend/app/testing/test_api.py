import unittest
import os
import sys
import json
import base64
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from app.main import app


class TestApiRoutes(unittest.TestCase):
    def setUp(self):
        self.client_ctx = TestClient(app)

    def test_root(self):
        with self.client_ctx as client:
            resp = client.get('/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('message', resp.json())

    def test_calculate_dps(self):
        params = {
            'combat_style': 'melee',
            'strength_level': 99,
            'strength_prayer': 1.0,
            'strength_boost': 0,
            'attack_level': 99,
            'attack_boost': 0,
            'attack_prayer': 1.0,
            'melee_strength_bonus': 85,
            'melee_attack_bonus': 102,
            'attack_style_bonus_strength': 3,
            'attack_style_bonus_attack': 0,
            'target_defence_level': 100,
            'target_defence_bonus': 50,
            'attack_speed': 2.4
        }
        with self.client_ctx as client:
            resp = client.post('/calculate/dps', json=params)
        self.assertEqual(resp.status_code, 200)
        self.assertIn('dps', resp.json())

    def test_item_effect(self):
        with self.client_ctx as client:
            resp = client.post(
                '/calculate/item-effect',
                json={
                    'item_name': 'Twisted bow',
                    'target_magic_level': 250,
                }
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
        self.assertIn('accuracy_multiplier', data)
        self.assertIn('damage_multiplier', data)

    def test_bosses(self):
        with self.client_ctx as client:
            resp = client.get('/bosses')
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_items(self):
        with self.client_ctx as client:
            resp = client.get('/items')
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_get_item(self):
        """Ensure /item/1 returns mock data when the DB is absent."""
        with self.client_ctx as client:
            resp = client.get('/item/1')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, dict)
        self.assertEqual(data.get('id'), 1)
        self.assertIn('name', data)

    def test_get_boss(self):
        """Ensure /boss/1 returns mock data when the DB is absent."""
        with self.client_ctx as client:
            resp = client.get('/boss/1')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, dict)
        self.assertEqual(data.get('id'), 1)
        self.assertIn('name', data)

    def test_import_seed(self):
        sample = {
            'combat_style': 'melee',
            'strength_level': 99,
            'attack_level': 99,
            'melee_strength_bonus': 80,
            'melee_attack_bonus': 80,
            'attack_style_bonus_strength': 3,
            'attack_style_bonus_attack': 0,
            'target_defence_level': 100,
            'target_defence_bonus': 50,
            'attack_speed': 2.4
        }
        seed = base64.b64encode(json.dumps(sample).encode()).decode()
        with self.client_ctx as client:
            resp = client.post('/import-seed', json={'seed': seed})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['combat_style'], 'melee')

    def test_calculate_seed(self):
        sample = {
            'combat_style': 'melee',
            'strength_level': 99,
            'attack_level': 99,
            'melee_strength_bonus': 80,
            'melee_attack_bonus': 80,
            'attack_style_bonus_strength': 3,
            'attack_style_bonus_attack': 0,
            'target_defence_level': 100,
            'target_defence_bonus': 50,
            'attack_speed': 2.4
        }
        seed = base64.b64encode(json.dumps(sample).encode()).decode()
        with self.client_ctx as client:
            resp = client.post('/calculate/seed', json={'seed': seed})
        self.assertEqual(resp.status_code, 200)
        self.assertIn('dps', resp.json())

    def test_bis(self):
        params = {
            'combat_style': 'melee',
            'strength_level': 99,
            'attack_level': 99,
            'melee_strength_bonus': 80,
            'melee_attack_bonus': 80,
            'attack_style_bonus_strength': 3,
            'attack_style_bonus_attack': 0,
            'target_defence_level': 100,
            'target_defence_bonus': 50,
            'attack_speed': 2.4
        }
        with self.client_ctx as client:
            resp = client.post('/bis', json=params)
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), dict)

if __name__ == '__main__':
    unittest.main()
