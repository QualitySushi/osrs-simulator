import os
import sqlite3
import tempfile
import shutil
import unittest

from app.database import DatabaseService


class TestDatabaseService(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        boss_db = os.path.join(self.temp_dir, "osrs_bosses.db")
        conn = sqlite3.connect(boss_db)
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE bosses (
                id INTEGER PRIMARY KEY,
                name TEXT,
                raid_group TEXT,
                examine TEXT,
                location TEXT,
                release_date TEXT,
                slayer_level INTEGER,
                slayer_xp INTEGER,
                slayer_category TEXT,
                has_multiple_forms INTEGER
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE boss_forms (
                id INTEGER PRIMARY KEY,
                boss_id INTEGER,
                form_name TEXT,
                form_order INTEGER,
                combat_level INTEGER,
                hitpoints INTEGER,
                max_hit INTEGER,
                attack_speed REAL,
                attack_style TEXT,
                attack_level INTEGER,
                strength_level INTEGER,
                defence_level INTEGER,
                magic_level INTEGER,
                ranged_level INTEGER,
                aggressive_attack_bonus INTEGER,
                aggressive_strength_bonus INTEGER,
                aggressive_magic_bonus INTEGER,
                aggressive_magic_strength_bonus INTEGER,
                aggressive_ranged_bonus INTEGER,
                aggressive_ranged_strength_bonus INTEGER,
                defence_stab INTEGER,
                defence_slash INTEGER,
                defence_crush INTEGER,
                defence_magic INTEGER,
                elemental_weakness_type TEXT,
                elemental_weakness_percent REAL,
                defence_ranged_light INTEGER,
                defence_ranged_standard INTEGER,
                defence_ranged_heavy INTEGER,
                attribute TEXT,
                xp_bonus INTEGER,
                aggressive INTEGER,
                poisonous INTEGER,
                poison_immunity INTEGER,
                venom_immunity INTEGER,
                melee_immunity INTEGER,
                magic_immunity INTEGER,
                ranged_immunity INTEGER,
                cannon_immunity INTEGER,
                thrall_immunity INTEGER,
                special_mechanics TEXT,
                image_url TEXT,
                icons TEXT,
                size INTEGER,
                npc_ids TEXT,
                assigned_by TEXT
            )
            """
        )
        cursor.execute(
            """
            INSERT INTO bosses (id, name, raid_group, examine, location, release_date, slayer_level, slayer_xp, slayer_category, has_multiple_forms)
            VALUES (1, 'Test Boss', NULL, 'A boss', 'Somewhere', '2020-01-01', 1, 100, 'Demon', 0)
            """
        )
        cursor.execute(
            """
            INSERT INTO bosses (id, name, raid_group, examine, location, release_date, slayer_level, slayer_xp, slayer_category, has_multiple_forms)
            VALUES (2, 'No Form Boss', NULL, 'Another boss', 'Nowhere', '2020-01-02', 1, 100, 'Undead', 0)
            """
        )
        cursor.execute(
            """
            INSERT INTO boss_forms (
                id, boss_id, form_name, form_order, combat_level, hitpoints,
                max_hit, attack_speed, attack_style, attack_level, strength_level,
                defence_level, magic_level, ranged_level, aggressive_attack_bonus,
                aggressive_strength_bonus, aggressive_magic_bonus,
                aggressive_magic_strength_bonus, aggressive_ranged_bonus,
                aggressive_ranged_strength_bonus, defence_stab, defence_slash,
                defence_crush, defence_magic, elemental_weakness_type,
                elemental_weakness_percent, defence_ranged_light,
                defence_ranged_standard, defence_ranged_heavy, attribute,
                xp_bonus, aggressive, poisonous, poison_immunity, venom_immunity,
                melee_immunity, magic_immunity, ranged_immunity, cannon_immunity,
                thrall_immunity, special_mechanics, image_url, icons, size,
                npc_ids, assigned_by
            ) VALUES (
                1, 1, 'Normal', 1, 100, 200, 20, 4.0, 'melee', 100, 100,
                100, 50, 50, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 'none', 0, 0, 0, 0, NULL,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', '', '[]', 1, '', ''
            )
            """
        )
        conn.commit()
        conn.close()
        self.service = DatabaseService(db_dir=self.temp_dir)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_get_boss_with_and_without_forms(self):
        boss = self.service.get_boss(1)
        self.assertIsNotNone(boss)
        self.assertEqual(boss["id"], 1)
        self.assertEqual(len(boss["forms"]), 1)

        boss_no_forms = self.service.get_boss(2)
        self.assertIsNotNone(boss_no_forms)
        self.assertEqual(boss_no_forms["id"], 2)
        self.assertEqual(boss_no_forms["forms"], [])


if __name__ == "__main__":
    unittest.main()
