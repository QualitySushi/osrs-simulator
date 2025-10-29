import os
import sys
import json
import base64
import unittest
from fastapi.testclient import TestClient

# Toggle: stubs ON by default; set OSRS_USE_STUBS=0 in CI for real DB
USE_STUBS = os.getenv("OSRS_USE_STUBS", "1") not in ("0", "false", "False")

# Ensure repo root is on sys.path so "from app.main import app" works
HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(HERE))  # .../backend
REPO_ROOT = os.path.dirname(REPO_ROOT)              # repo root
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from app.main import app


class TestApiRoutes(unittest.TestCase):
    def test_root(self):
        with TestClient(app) as client:
            resp = client.get("/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("message", resp.json())

    def test_calculate_dps(self):
        params = {
            "combat_style": "melee",
            "strength_level": 99,
            "strength_prayer": 1.0,
            "strength_boost": 0,
            "attack_level": 99,
            "attack_boost": 0,
            "attack_prayer": 1.0,
            "melee_strength_bonus": 85,
            "melee_attack_bonus": 102,
            "attack_style_bonus_strength": 3,
            "attack_style_bonus_attack": 0,
            "target_defence_level": 100,
            "target_defence_bonus": 50,
            "attack_speed": 2.4,
        }
        with TestClient(app) as client:
            resp = client.post("/calculate/dps", json=params)
        self.assertEqual(resp.status_code, 200)
        self.assertIn("dps", resp.json())

    def test_item_effect(self):
        with TestClient(app) as client:
            resp = client.post(
                "/calculate/item-effect",
                json={"item_name": "Twisted bow", "target_magic_level": 250},
            )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("accuracy_multiplier", data)
        self.assertIn("damage_multiplier", data)

    def test_items(self):
        with TestClient(app) as client:
            resp = client.get("/items")
        # Real DB or stubbed may return 200; some stub configs might return 404
        self.assertIn(resp.status_code, (200, 404))

    def test_npcs(self):
        with TestClient(app) as client:
            resp = client.get("/npcs")
        self.assertIn(resp.status_code, (200, 404))

    def test_get_item(self):
        """In stub mode, single lookups return None -> 404. In real DB, item 1 may exist -> 200."""
        with TestClient(app) as client:
            resp = client.get("/item/1")
        if USE_STUBS:
            self.assertEqual(resp.status_code, 404)
        else:
            self.assertIn(resp.status_code, (200, 404))

    def test_get_npc(self):
        """In stub mode, single lookups return None -> 404. In real DB, npc 1 may exist -> 200."""
        with TestClient(app) as client:
            resp = client.get("/npc/1")
        if USE_STUBS:
            self.assertEqual(resp.status_code, 404)
        else:
            self.assertIn(resp.status_code, (200, 404))

    def test_import_seed(self):
        sample = {
            "combat_style": "melee",
            "strength_level": 99,
            "attack_level": 99,
            "melee_strength_bonus": 80,
            "melee_attack_bonus": 80,
            "attack_style_bonus_strength": 3,
            "attack_style_bonus_attack": 0,
            "target_defence_level": 100,
            "target_defence_bonus": 50,
            "attack_speed": 2.4,
        }
        seed = base64.b64encode(json.dumps(sample).encode()).decode()
        with TestClient(app) as client:
            resp = client.post("/import-seed", json={"seed": seed})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["combat_style"], "melee")

    def test_calculate_seed(self):
        sample = {
            "combat_style": "melee",
            "strength_level": 99,
            "attack_level": 99,
            "melee_strength_bonus": 80,
            "melee_attack_bonus": 80,
            "attack_style_bonus_strength": 3,
            "attack_style_bonus_attack": 0,
            "target_defence_level": 100,
            "target_defence_bonus": 50,
            "attack_speed": 2.4,
        }
        seed = base64.b64encode(json.dumps(sample).encode()).decode()
        with TestClient(app) as client:
            resp = client.post("/calculate/seed", json={"seed": seed})
        self.assertEqual(resp.status_code, 200)
        self.assertIn("dps", resp.json())

    def test_bis(self):
        params = {
            "combat_style": "melee",
            "strength_level": 99,
            "attack_level": 99,
            "melee_strength_bonus": 80,
            "melee_attack_bonus": 80,
            "attack_style_bonus_strength": 3,
            "attack_style_bonus_attack": 0,
            "target_defence_level": 100,
            "target_defence_bonus": 50,
            "attack_speed": 2.4,
        }
        with TestClient(app) as client:
            resp = client.post("/bis", json=params)
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), dict)

    def test_special_attacks(self):
        with TestClient(app) as client:
            resp = client.get("/special-attacks")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, dict)
        self.assertIn("dragon_dagger", data)

    def test_search_special_attacks(self):
        with TestClient(app) as client:
            resp = client.get("/search/special-attacks", params={"query": "dragon dag"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(any(item["weapon_name"] == "Dragon dagger" for item in data))

    def test_cache_headers(self):
        """Endpoints should include Cache-Control headers."""
        with TestClient(app) as client:
            resp = client.get("/items")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("Cache-Control", resp.headers)


if __name__ == "__main__":
    unittest.main()
