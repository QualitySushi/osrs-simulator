import sqlite3
import os
import json
import tempfile
from typing import Dict, List, Optional, Any
from azure.storage.blob import BlobServiceClient


class AzureDatabaseService:
    """Service for handling database operations for the OSRS DPS Calculator in Azure."""

    def __init__(self):
        """Initialize the Azure database service."""
        self.connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
        self.container_name = os.environ.get("AZURE_STORAGE_CONTAINER_NAME", "databases")
        
        if not self.connection_string:
            print("Warning: AZURE_STORAGE_CONNECTION_STRING not found")
            
        # Database file mappings
        self.db_files = {
            "items_all": "osrs_all_items.db",
            "items_combat": "osrs_combat_items.db",
            "items_tradeable": "osrs_tradeable_items.db",
            "bosses": "osrs_bosses.db",
        }

    def _select_items_db(self, combat_only: bool, tradeable_only: bool) -> str:
        """Return db key based on filters."""
        if combat_only:
            return "items_combat"
        if tradeable_only:
            return "items_tradeable"
        return "items_all"

    def _get_db_connection(self, db_type: str):
        """Download database from blob storage and return connection with temp file path."""
        if not self.connection_string:
            raise Exception("Azure Storage connection string not configured")
            
        blob_service_client = BlobServiceClient.from_connection_string(self.connection_string)
        container_client = blob_service_client.get_container_client(self.container_name)
        
        db_filename = self.db_files.get(db_type)
        if not db_filename:
            raise Exception(f"Unknown database type: {db_type}")
            
        blob_client = container_client.get_blob_client(db_filename)
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        try:
            blob_data = blob_client.download_blob()
            temp_file.write(blob_data.readall())
            temp_file.flush()
            temp_file.close()
            
            return sqlite3.connect(temp_file.name), temp_file.name
        except Exception as e:
            temp_file.close()
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
            raise e

    def _cleanup_temp_file(self, temp_path: str):
        """Clean up temporary database file."""
        try:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
        except Exception as e:
            print(f"Warning: Could not clean up temp file {temp_path}: {e}")

    def get_all_items(self, combat_only: bool = True, tradeable_only: bool = False) -> List[Dict[str, Any]]:
        """Get all items from the database with optional filters."""
        conn = None
        temp_path = None
        
        try:
            db_key = self._select_items_db(combat_only, tradeable_only)
            conn, temp_path = self._get_db_connection(db_key)
            cursor = conn.cursor()

            query = """
            SELECT
                id, name, has_special_attack, special_attack_text,
                has_passive_effect, passive_effect_text,
                has_combat_stats, is_tradeable, slot, icons, combat_stats
            FROM items
            """

            where_clauses = []
            if combat_only:
                where_clauses.append("has_combat_stats = 1")
            if tradeable_only:
                where_clauses.append("is_tradeable = 1")

            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)

            cursor.execute(query)
            items = []

            for row in cursor.fetchall():
                try:
                    icons = json.loads(row[9]) if row[9] else []
                except json.JSONDecodeError:
                    icons = []
                try:
                    combat_stats = json.loads(row[10]) if row[10] else {}
                except json.JSONDecodeError:
                    combat_stats = {}

                items.append({
                    "id": row[0],
                    "name": row[1],
                    "has_special_attack": bool(row[2]),
                    "special_attack": row[3],
                    "has_passive_effect": bool(row[4]),
                    "passive_effect_text": row[5],
                    "has_combat_stats": bool(row[6]),
                    "is_tradeable": bool(row[7]),
                    "slot": row[8],
                    "icons": icons,
                    "combat_stats": combat_stats,
                })

            return items
            
        except Exception as e:
            print(f"Error getting items: {e}")
            return []
        finally:
            if conn:
                conn.close()
            if temp_path:
                self._cleanup_temp_file(temp_path)

    def get_item(self, item_id: int) -> Optional[Dict[str, Any]]:
        """Get details for a specific item by ID."""
        conn = None
        temp_path = None
        
        try:
            conn, temp_path = self._get_db_connection("items_all")
            cursor = conn.cursor()
            cursor.execute("""
            SELECT
                id, name, has_special_attack, special_attack_text,
                has_passive_effect, passive_effect_text,
                has_combat_stats, is_tradeable, slot, icons, combat_stats
            FROM items
            WHERE id = ?
            """, (item_id,))

            row = cursor.fetchone()
            if not row:
                return None

            try:
                icons = json.loads(row[9]) if row[9] else []
            except json.JSONDecodeError:
                icons = []
            try:
                combat_stats = json.loads(row[10]) if row[10] else {}
            except json.JSONDecodeError:
                combat_stats = {}

            return {
                "id": row[0],
                "name": row[1],
                "has_special_attack": bool(row[2]),
                "special_attack": row[3],
                "has_passive_effect": bool(row[4]),
                "passive_effect_text": row[5],
                "has_combat_stats": bool(row[6]),
                "is_tradeable": bool(row[7]),
                "slot": row[8],
                "icons": icons,
                "combat_stats": combat_stats,
            }
            
        except Exception as e:
            print(f"Error getting item {item_id}: {e}")
            return None
        finally:
            if conn:
                conn.close()
            if temp_path:
                self._cleanup_temp_file(temp_path)

    def search_items(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search items by name."""
        conn = None
        temp_path = None
        
        try:
            conn, temp_path = self._get_db_connection("items_all")
            cursor = conn.cursor()
            cursor.execute("""
            SELECT
                id, name, has_special_attack, has_passive_effect,
                has_combat_stats, is_tradeable, slot
            FROM items
            WHERE name LIKE ?
            LIMIT ?
            """, (f"%{query}%", limit))

            items = []
            for row in cursor.fetchall():
                items.append({
                    "id": row[0],
                    "name": row[1],
                    "has_special_attack": bool(row[2]),
                    "has_passive_effect": bool(row[3]),
                    "has_combat_stats": bool(row[4]),
                    "is_tradeable": bool(row[5]),
                    "slot": row[6],
                })

            return items
            
        except Exception as e:
            print(f"Error searching items: {e}")
            return []
        finally:
            if conn:
                conn.close()
            if temp_path:
                self._cleanup_temp_file(temp_path)

    def get_all_bosses(self) -> List[Dict[str, Any]]:
        """Get all bosses from the database."""
        conn = None
        temp_path = None
        
        try:
            conn, temp_path = self._get_db_connection("bosses")
            cursor = conn.cursor()
            cursor.execute("""
            SELECT
                id, name, raid_group, location, has_multiple_forms
            FROM bosses
            ORDER BY name
            """)

            bosses = []
            for row in cursor.fetchall():
                # Get icon for boss
                icon = None
                try:
                    cursor.execute("""
                    SELECT icons, image_url
                    FROM boss_forms
                    WHERE boss_id = ?
                    ORDER BY form_order
                    LIMIT 1
                    """, (row[0],))
                    form_row = cursor.fetchone()
                    if form_row:
                        try:
                            icons = json.loads(form_row[0]) if form_row[0] else []
                        except json.JSONDecodeError:
                            icons = []
                        if icons:
                            icon = icons[0]
                        elif form_row[1]:
                            icon = form_row[1]
                except Exception:
                    icon = None
                    
                bosses.append({
                    "id": row[0],
                    "name": row[1],
                    "raid_group": row[2],
                    "location": row[3],
                    "has_multiple_forms": bool(row[4]),
                    "icon_url": icon,
                })

            return bosses
            
        except Exception as e:
            print(f"Error getting bosses: {e}")
            return []
        finally:
            if conn:
                conn.close()
            if temp_path:
                self._cleanup_temp_file(temp_path)

    def get_boss(self, boss_id: int) -> Optional[Dict[str, Any]]:
        """Get details for a specific boss by ID, including all forms."""
        conn = None
        temp_path = None
        
        try:
            conn, temp_path = self._get_db_connection("bosses")
            cursor = conn.cursor()
            
            # Get boss main data
            cursor.execute("""
            SELECT
                id, name, raid_group, examine, location,
                release_date, slayer_level, slayer_xp, slayer_category,
                has_multiple_forms
            FROM bosses
            WHERE id = ?
            """, (boss_id,))

            boss_row = cursor.fetchone()
            if not boss_row:
                return None

            boss_data = {
                "id": boss_row[0],
                "name": boss_row[1],
                "raid_group": boss_row[2],
                "examine": boss_row[3],
                "location": boss_row[4],
                "release_date": boss_row[5],
                "slayer_level": boss_row[6],
                "slayer_xp": boss_row[7],
                "slayer_category": boss_row[8],
                "has_multiple_forms": bool(boss_row[9]),
                "forms": [],
                "icon_url": None,
            }

            # Get all forms for this boss
            cursor.execute("""
            SELECT
                id, form_name, form_order, combat_level, hitpoints,
                max_hit, attack_speed, attack_style,
                attack_level, strength_level, defence_level, magic_level, ranged_level,
                aggressive_attack_bonus, aggressive_strength_bonus,
                aggressive_magic_bonus, aggressive_magic_strength_bonus,
                aggressive_ranged_bonus, aggressive_ranged_strength_bonus,
                defence_stab, defence_slash, defence_crush,
                defence_magic, elemental_weakness_type, elemental_weakness_percent,
                defence_ranged_light, defence_ranged_standard, defence_ranged_heavy,
                attribute, xp_bonus, aggressive, poisonous,
                poison_immunity, venom_immunity, melee_immunity, magic_immunity,
                ranged_immunity, cannon_immunity, thrall_immunity,
                special_mechanics, image_url, icons, size, npc_ids, assigned_by
            FROM boss_forms
            WHERE boss_id = ?
            ORDER BY form_order
            """, (boss_id,))

            for form_row in cursor.fetchall():
                form_data = {
                    "id": form_row[0],
                    "boss_id": boss_id,
                    "form_name": form_row[1],
                    "form_order": form_row[2],
                    "combat_level": form_row[3],
                    "hitpoints": form_row[4],
                    "max_hit": form_row[5],
                    "attack_speed": form_row[6],
                    "attack_style": form_row[7],
                    "attack_level": form_row[8],
                    "strength_level": form_row[9],
                    "defence_level": form_row[10],
                    "magic_level": form_row[11],
                    "ranged_level": form_row[12],
                    "aggressive_attack_bonus": form_row[13],
                    "aggressive_strength_bonus": form_row[14],
                    "aggressive_magic_bonus": form_row[15],
                    "aggressive_magic_strength_bonus": form_row[16],
                    "aggressive_ranged_bonus": form_row[17],
                    "aggressive_ranged_strength_bonus": form_row[18],
                    "defence_stab": form_row[19],
                    "defence_slash": form_row[20],
                    "defence_crush": form_row[21],
                    "defence_magic": form_row[22],
                    "elemental_weakness_type": form_row[23],
                    "elemental_weakness_percent": form_row[24],
                    "defence_ranged_light": form_row[25],
                    "defence_ranged_standard": form_row[26],
                    "defence_ranged_heavy": form_row[27],
                    "attribute": form_row[28],
                    "xp_bonus": form_row[29],
                    "aggressive": form_row[30],
                    "poisonous": form_row[31],
                    "poison_immunity": form_row[32],
                    "venom_immunity": form_row[33],
                    "melee_immunity": form_row[34],
                    "magic_immunity": form_row[35],
                    "ranged_immunity": form_row[36],
                    "cannon_immunity": form_row[37],
                    "thrall_immunity": form_row[38],
                    "special_mechanics": form_row[39],
                    "image_url": form_row[40],
                    "icons": json.loads(form_row[41]) if form_row[41] else [],
                    "size": form_row[42],
                    "npc_ids": form_row[43],
                    "assigned_by": form_row[44],
                }

                boss_data["forms"].append(form_data)

            # Set boss icon from first form
            if boss_data["forms"]:
                first = boss_data["forms"][0]
                icons = first.get("icons", []) if isinstance(first.get("icons"), list) else []
                if icons:
                    boss_data["icon_url"] = icons[0]
                elif first.get("image_url"):
                    boss_data["icon_url"] = first.get("image_url")

            return boss_data
            
        except Exception as e:
            print(f"Error getting boss {boss_id}: {e}")
            return None
        finally:
            if conn:
                conn.close()
            if temp_path:
                self._cleanup_temp_file(temp_path)

    def search_bosses(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search bosses by name."""
        conn = None
        temp_path = None
        
        try:
            conn, temp_path = self._get_db_connection("bosses")
            cursor = conn.cursor()
            cursor.execute("""
            SELECT
                id, name, raid_group, location
            FROM bosses
            WHERE name LIKE ?
            LIMIT ?
            """, (f"%{query}%", limit))

            bosses = []
            for row in cursor.fetchall():
                bosses.append({
                    "id": row[0],
                    "name": row[1],
                    "raid_group": row[2],
                    "location": row[3],
                })

            return bosses
            
        except Exception as e:
            print(f"Error searching bosses: {e}")
            return []
        finally:
            if conn:
                conn.close()
            if temp_path:
                self._cleanup_temp_file(temp_path)


# Create a singleton instance
azure_db_service = AzureDatabaseService()