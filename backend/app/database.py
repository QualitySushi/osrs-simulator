import sqlite3
import os
import json
from typing import Dict, List, Optional, Any, Union

class DatabaseService:
    """Service for handling database operations for the OSRS DPS Calculator."""
    
    def __init__(self, db_dir: str = "db"):
        """Initialize the database service with directory path."""
        self.db_dir = db_dir
        self.item_db_path = os.path.join(db_dir, "osrs_combat_items.db")
        self.boss_db_path = os.path.join(db_dir, "osrs_bosses.db")
        
        # Ensure database directory exists
        if not os.path.exists(db_dir):
            os.makedirs(db_dir)
            
        # Initialize connections
        self._init_connections()
    
    def _init_connections(self):
        """Initialize database connections and check if files exist."""
        self.item_db_exists = os.path.exists(self.item_db_path)
        self.boss_db_exists = os.path.exists(self.boss_db_path)
        
        # Log status
        if not self.item_db_exists:
            print(f"Warning: Item database not found at {self.item_db_path}")
        if not self.boss_db_exists:
            print(f"Warning: Boss database not found at {self.boss_db_path}")
    
    def _get_item_conn(self):
        """Get a connection to the item database."""
        if not self.item_db_exists:
            return None
        return sqlite3.connect(self.item_db_path)
    
    def _get_boss_conn(self):
        """Get a connection to the boss database."""
        if not self.boss_db_exists:
            return None
        return sqlite3.connect(self.boss_db_path)
    
    def get_all_items(self, combat_only: bool = True, tradeable_only: bool = False) -> List[Dict[str, Any]]:
        """Get all items from the database with optional filters."""
        conn = self._get_item_conn()
        if not conn:
            return []

        try:
            cursor = conn.cursor()

            query = """
            SELECT 
                id, name, has_special_attack, special_attack_text,
                has_passive_effect, passive_effect_text, 
                has_combat_stats, is_tradeable, slot, combat_stats
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
                    combat_stats = json.loads(row[9]) if row[9] else {}
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
                    "combat_stats": combat_stats
                })

            return items
        except Exception as e:
            print(f"Error getting items: {e}")
            return []
        finally:
            conn.close()
            
    def get_item(self, item_id: int) -> Optional[Dict[str, Any]]:
        """Get details for a specific item by ID."""
        conn = self._get_item_conn()
        if not conn:
            return None

        try:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT 
                id, name, has_special_attack, special_attack_text,
                has_passive_effect, passive_effect_text,
                has_combat_stats, is_tradeable, slot, combat_stats
            FROM items
            WHERE id = ?
            """, (item_id,))

            row = cursor.fetchone()
            if not row:
                return None

            try:
                combat_stats = json.loads(row[9]) if row[9] else {}
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
                "combat_stats": combat_stats
            }
        except Exception as e:
            print(f"Error getting item {item_id}: {e}")
            return None
        finally:
            conn.close()

    
    def get_all_bosses(self) -> List[Dict[str, Any]]:
        """Get all bosses from the database."""
        conn = self._get_boss_conn()
        if not conn:
            return []
        
        try:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT 
                id, name, raid_group, location, has_multiple_forms
            FROM bosses
            ORDER BY name
            """)
            
            bosses = []
            for row in cursor.fetchall():
                bosses.append({
                    "id": row[0],
                    "name": row[1],
                    "raid_group": row[2],
                    "location": row[3],
                    "has_multiple_forms": bool(row[4])
                })
            
            return bosses
        except Exception as e:
            print(f"Error getting bosses: {e}")
            return []
        finally:
            conn.close()
    
    def get_boss(self, boss_id: int) -> Optional[Dict[str, Any]]:
        """Get details for a specific boss by ID, including all forms."""
        conn = self._get_boss_conn()
        if not conn:
            return None
        
        try:
            cursor = conn.cursor()
            # Get boss main data
            cursor.execute("""
            SELECT 
                id, name, raid_group, examine, location, 
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
                "has_multiple_forms": bool(boss_row[5]),
                "forms": []
            }
            
            # Get all forms for this boss
            cursor.execute("""
            SELECT 
                id, form_name, form_order, combat_level, hitpoints,
                attack_level, strength_level, defence_level, magic_level, ranged_level,
                defence_stab, defence_slash, defence_crush, 
                defence_magic, defence_ranged_standard
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
                    "attack_level": form_row[5],
                    "strength_level": form_row[6],
                    "defence_level": form_row[7],
                    "magic_level": form_row[8],
                    "ranged_level": form_row[9],
                    "defence_stab": form_row[10],
                    "defence_slash": form_row[11],
                    "defence_crush": form_row[12],
                    "defence_magic": form_row[13],
                    "defence_ranged_standard": form_row[14]
                }
                
                boss_data["forms"].append(form_data)
            
            return boss_data
        except Exception as e:
            print(f"Error getting boss {boss_id}: {e}")
            return None
        finally:
            conn.close()
    
    def search_items(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search items by name."""
        conn = self._get_item_conn()
        if not conn:
            return []
        
        try:
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
                    "slot": row[6]
                })
            
            return items
        except Exception as e:
            print(f"Error searching items: {e}")
            return []
        finally:
            conn.close()
    
    def search_bosses(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search bosses by name."""
        conn = self._get_boss_conn()
        if not conn:
            return []
        
        try:
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
                    "location": row[3]
                })
            
            return bosses
        except Exception as e:
            print(f"Error searching bosses: {e}")
            return []
        finally:
            conn.close()

# Create a singleton instance
db_service = DatabaseService()