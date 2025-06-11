import unittest
import asyncio
import os
import sys
from unittest.mock import MagicMock, AsyncMock
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.repositories import item_repository, boss_repository


class TestItemRepositoryCaching(unittest.TestCase):
    def setUp(self):
        self.mock_items = [
            {'id': 1, 'name': 'Dragon scimitar', 'has_combat_stats': True, 'is_tradeable': True},
            {'id': 2, 'name': 'Bronze dagger', 'has_combat_stats': True, 'is_tradeable': False},
        ]
        self.item_service = MagicMock()
        self.item_service.get_all_items.return_value = self.mock_items
        self.item_service.get_item.return_value = self.mock_items[0]
        self.item_service.search_items.return_value = [self.mock_items[0]]

        # Clear caches and patch the db service
        item_repository._all_items_cache.clear()
        item_repository._item_cache.clear()
        self.orig_service = item_repository.db_service
        item_repository.db_service = self.item_service

    def tearDown(self):
        item_repository.db_service = self.orig_service

    def test_get_all_items_cached(self):
        first = item_repository.get_all_items()
        second = item_repository.get_all_items()
        self.assertEqual(first, self.mock_items)
        self.assertEqual(second, self.mock_items)
        # Should call underlying service only once due to caching
        self.assertEqual(self.item_service.get_all_items.call_count, 1)

    def test_get_item_cached(self):
        item_repository.get_item(1)
        item_repository.get_item(1)
        # Underlying service called only once
        self.assertEqual(self.item_service.get_item.call_count, 1)

    def test_search_items(self):
        results = item_repository.search_items('dragon')
        self.item_service.search_items.assert_called_with('dragon', None)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], 1)


class TestBossRepositoryCaching(unittest.TestCase):
    def setUp(self):
        self.mock_bosses = [
            {'id': 1, 'name': 'Zulrah', 'raid_group': None, 'location': 'Zul-Andra', 'has_multiple_forms': True},
        ]
        self.boss_service = MagicMock()
        self.boss_service.get_all_bosses.return_value = self.mock_bosses
        self.boss_service.get_boss.return_value = self.mock_bosses[0]
        self.boss_service.search_bosses.return_value = [self.mock_bosses[0]]

        boss_repository._all_bosses_cache.clear()
        boss_repository._boss_cache.clear()
        self.orig_service = boss_repository.db_service
        boss_repository.db_service = self.boss_service

    def tearDown(self):
        boss_repository.db_service = self.orig_service

    def test_get_all_bosses_cached(self):
        first = boss_repository.get_all_bosses()
        second = boss_repository.get_all_bosses()
        self.assertEqual(first, self.mock_bosses)
        self.assertEqual(second, self.mock_bosses)
        self.assertEqual(self.boss_service.get_all_bosses.call_count, 1)

    def test_get_boss_cached(self):
        boss_repository.get_boss(1)
        boss_repository.get_boss(1)
        self.assertEqual(self.boss_service.get_boss.call_count, 1)

    def test_search_bosses(self):
        results = boss_repository.search_bosses('zul')
        self.boss_service.search_bosses.assert_called_with('zul', None)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], 1)


class TestAsyncRepositoryCaching(unittest.TestCase):
    def setUp(self):
        self.mock_items = [
            {"id": 1, "name": "Dragon scimitar", "has_combat_stats": True, "is_tradeable": True}
        ]
        self.item_service = MagicMock()
        self.item_service.get_all_items_async = AsyncMock(return_value=self.mock_items)
        self.item_service.get_item_async = AsyncMock(return_value=self.mock_items[0])

        item_repository._all_items_cache.clear()
        item_repository._item_cache.clear()
        self.orig_item_service = item_repository.db_service
        item_repository.db_service = self.item_service

        self.mock_bosses = [
            {"id": 1, "name": "Zulrah", "raid_group": None, "location": "Zul-Andra", "has_multiple_forms": True}
        ]
        self.boss_service = MagicMock()
        self.boss_service.get_all_bosses_async = AsyncMock(return_value=self.mock_bosses)
        self.boss_service.get_boss_async = AsyncMock(return_value=self.mock_bosses[0])

        boss_repository._all_bosses_cache.clear()
        boss_repository._boss_cache.clear()
        self.orig_boss_service = boss_repository.db_service
        boss_repository.db_service = self.boss_service

    def tearDown(self):
        item_repository.db_service = self.orig_item_service
        boss_repository.db_service = self.orig_boss_service

    def test_item_async_cached(self):
        asyncio.run(item_repository.get_item_async(1))
        asyncio.run(item_repository.get_item_async(1))
        self.assertEqual(self.item_service.get_item_async.call_count, 1)

    def test_all_items_async_cached(self):
        asyncio.run(item_repository.get_all_items_async())
        asyncio.run(item_repository.get_all_items_async())
        self.assertEqual(self.item_service.get_all_items_async.call_count, 1)

    def test_boss_async_cached(self):
        asyncio.run(boss_repository.get_boss_async(1))
        asyncio.run(boss_repository.get_boss_async(1))
        self.assertEqual(self.boss_service.get_boss_async.call_count, 1)

    def test_all_bosses_async_cached(self):
        asyncio.run(boss_repository.get_all_bosses_async())
        asyncio.run(boss_repository.get_all_bosses_async())
        self.assertEqual(self.boss_service.get_all_bosses_async.call_count, 1)


class TestStartupCacheWarmup(unittest.TestCase):
    def setUp(self):
        self.mock_items = [{"id": 1}]
        self.mock_bosses = [{"id": 1}]

        self.item_service = MagicMock()
        self.item_service.get_all_items_async = AsyncMock(return_value=self.mock_items)
        self.orig_item_service = item_repository.db_service
        item_repository.db_service = self.item_service

        self.boss_service = MagicMock()
        self.boss_service.get_all_bosses_async = AsyncMock(return_value=self.mock_bosses)
        self.orig_boss_service = boss_repository.db_service
        boss_repository.db_service = self.boss_service

        item_repository._all_items_cache.clear()
        boss_repository._all_bosses_cache.clear()

        from app.main import app
        self.client = TestClient(app)

    def tearDown(self):
        item_repository.db_service = self.orig_item_service
        boss_repository.db_service = self.orig_boss_service

    def test_startup_populates_caches(self):
        with self.client as client:
            client.get("/")
        self.assertEqual(item_repository._all_items_cache.get("all"), self.mock_items)
        self.assertEqual(boss_repository._all_bosses_cache.get("all"), self.mock_bosses)


if __name__ == '__main__':
    unittest.main()

class TestSpecialAttackRepository(unittest.TestCase):
    def test_get_special_attack(self):
        from app.repositories import special_attack_repository
        data = special_attack_repository.get_special_attack("Dragon dagger")
        self.assertIsNotNone(data)
        self.assertEqual(data["cost"], 25)

    def test_get_all_special_attacks(self):
        from app.repositories import special_attack_repository
        data = special_attack_repository.get_all_special_attacks()
        self.assertIsInstance(data, dict)
        self.assertIn("dragon_dagger", data)


