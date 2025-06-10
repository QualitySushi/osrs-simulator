import unittest
from unittest.mock import MagicMock

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


if __name__ == '__main__':
    unittest.main()
