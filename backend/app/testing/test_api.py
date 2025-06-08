import unittest
import os
import sys
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from app.main import app

client = TestClient(app)

class TestApiRoutes(unittest.TestCase):
    def test_root(self):
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
        resp = client.post('/calculate/dps', json=params)
        self.assertEqual(resp.status_code, 200)
        self.assertIn('dps', resp.json())

    def test_item_effect(self):
        resp = client.post('/calculate/item-effect', json={
            'item_name': 'Twisted bow',
            'target_magic_level': 250
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('accuracy_multiplier', data)
        self.assertIn('damage_multiplier', data)

    def test_bosses(self):
        resp = client.get('/bosses')
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_items(self):
        resp = client.get('/items')
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

if __name__ == '__main__':
    unittest.main()
