import os
import json
import time
import asyncio
from contextlib import contextmanager, asynccontextmanager
from typing import Dict, List, Optional, Any

import pyodbc
import aioodbc

from .config.settings import DB_CONNECTION_TIMEOUT as CONNECTION_TIMEOUT, DB_MAX_RETRIES as MAX_RETRIES


class AzureSQLDatabaseService:
    """Service for handling database operations using Azure SQL Database."""

    def __init__(self):
        # Prefer full Azure connection string from secret
        connection_string = os.environ.get("SQLAZURECONNSTR_DefaultConnection")

        if connection_string:
            self.connection_string = connection_string
        else:
            # Fallback to individual pieces
            server = os.environ.get("AZURE_SQL_SERVER")
            database = os.environ.get("AZURE_SQL_DATABASE")
            username = os.environ.get("AZURE_SQL_USERNAME")
            password = os.environ.get("AZURE_SQL_PASSWORD")

            if not all([server, database]):
                print("Warning: Azure SQL Database configuration incomplete")

            # Use same driver everywhere (18)
            if not username or not password:
                # Managed Identity / Entra (App Service etc.)
                self.connection_string = (
                    f"DRIVER={{ODBC Driver 18 for SQL Server}};"
                    f"SERVER={server};"
                    f"DATABASE={database};"
                    f"Authentication=ActiveDirectoryMsi;"
                    f"Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
                )
            else:
                # SQL auth fallback
                self.connection_string = (
                    f"DRIVER={{ODBC Driver 18 for SQL Server}};"
                    f"SERVER={server};"
                    f"DATABASE={database};"
                    f"UID={username};PWD={password};"
                    f"Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
                )

    # ---------- low-level connection helpers ----------

    def _get_connection(self) -> pyodbc.Connection:
        return pyodbc.connect(self.connection_string, timeout=CONNECTION_TIMEOUT)

    async def _get_connection_async(self) -> aioodbc.Connection:
        return await aioodbc.connect(dsn=self.connection_string, timeout=CONNECTION_TIMEOUT)

    @contextmanager
    def connection(self):
        """Sync connection with retries and guaranteed close."""
        for attempt in range(MAX_RETRIES):
            conn = None
            try:
                conn = self._get_connection()
                yield conn
                return
            except Exception:
                if conn:
                    try:
                        conn.close()
                    except Exception:
                        pass
                if attempt == MAX_RETRIES - 1:
                    raise
                time.sleep(2 ** attempt)
            finally:
                if conn:
                    try:
                        conn.close()
                    except Exception:
                        pass

    @asynccontextmanager
    async def connection_async(self):
        """Async connection with retries and guaranteed close (fixes 'Unclosed connection')."""
        conn = None
        for attempt in range(MAX_RETRIES):
            try:
                conn = await self._get_connection_async()
                break
            except Exception:
                if attempt == MAX_RETRIES - 1:
                    raise
                await asyncio.sleep(2 ** attempt)
        try:
            yield conn
        finally:
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass

    # ---------- sync queries ----------

    def get_all_bosses(self, limit: int | None = None, offset: int | None = None) -> List[Dict[str, Any]]:
        try:
            with self.connection() as conn:
                cursor = conn.cursor()
                query = (
                    "SELECT id, name, raid_group, location, has_multiple_forms "
                    "FROM npcs ORDER BY name"
                )
                params: list[Any] = []
                if limit is not None:
                    off = offset or 0
                    query += " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
                    params.extend([off, limit])

                cursor.execute(query, params)
                rows = cursor.fetchall()

                bosses = []
                for r in rows:
                    icon_url = None
                    cursor.execute(
                        "SELECT TOP 1 icons, image_url FROM npc_forms WHERE npc_id = ?",
                        (r[0],),
                    )
                    f = cursor.fetchone()
                    if f:
                        if f[0]:
                            try:
                                icons = json.loads(f[0])
                                if icons:
                                    icon_url = icons[0]
                            except Exception:
                                pass
                        if not icon_url and f[1]:
                            icon_url = f[1]
                    bosses.append(
                        {
                            "id": r[0],
                            "name": r[1],
                            "raid_group": r[2],
                            "location": r[3],
                            "has_multiple_forms": bool(r[4]),
                            "icon_url": icon_url,
                        }
                    )
                return bosses
        except Exception as e:
            print(f"Error getting bosses: {e}")
            return []

    def get_boss(self, boss_id: int) -> Optional[Dict[str, Any]]:
        try:
            with self.connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT id, name, raid_group, location, examine, has_multiple_forms "
                    "FROM npcs WHERE id = ?",
                    (boss_id,),
                )
                b = cursor.fetchone()
                if not b:
                    return None
                boss = {
                    "id": b[0],
                    "name": b[1],
                    "raid_group": b[2],
                    "location": b[3],
                    "examine": b[4],
                    "has_multiple_forms": bool(b[5]),
                    "forms": [],
                }
                cursor.execute(
                    "SELECT id, npc_id, form_name, form_order, combat_level, hitpoints, "
                    "defence_level, magic_level, ranged_level, defence_stab, defence_slash, "
                    "defence_crush, defence_magic, defence_ranged_standard, icons, image_url, size "
                    "FROM npc_forms WHERE npc_id = ? ORDER BY form_order",
                    (boss_id,),
                )
                for f in cursor.fetchall():
                    icons = []
                    if f[14]:
                        try:
                            icons = json.loads(f[14])
                        except Exception:
                            pass
                    boss["forms"].append(
                        {
                            "id": f[0],
                            "boss_id": f[1],
                            "form_name": f[2],
                            "form_order": f[3],
                            "combat_level": f[4],
                            "hitpoints": f[5],
                            "defence_level": f[6],
                            "magic_level": f[7],
                            "ranged_level": f[8],
                            "defence_stab": f[9],
                            "defence_slash": f[10],
                            "defence_crush": f[11],
                            "defence_magic": f[12],
                            "defence_ranged_standard": f[13],
                            "icons": icons,
                            "image_url": f[15],
                            "size": f[16],
                        }
                    )
                if boss["forms"]:
                    first = boss["forms"][0]
                    boss["icon_url"] = (first.get("icons") or [None])[0] or first.get("image_url")
                return boss
        except Exception as e:
            print(f"Error getting boss {boss_id}: {e}")
            return None

    def get_boss_id_by_form(self, form_id: int) -> Optional[int]:
        try:
            with self.connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT npc_id FROM npc_forms WHERE id = ?", (form_id,))
                r = cursor.fetchone()
                return r[0] if r else None
        except Exception as e:
            print(f"Error getting boss id from form {form_id}: {e}")
            return None

    def get_boss_by_form(self, form_id: int) -> Optional[Dict[str, Any]]:
        boss_id = self.get_boss_id_by_form(form_id)
        return self.get_boss(boss_id) if boss_id is not None else None

    def get_all_items(
        self, combat_only: bool = True, tradeable_only: bool = False, limit: int | None = None, offset: int | None = None
    ) -> List[Dict[str, Any]]:
        try:
            with self.connection() as conn:
                cursor = conn.cursor()
                query = (
                    "SELECT id, name, has_special_attack, has_passive_effect, "
                    "has_combat_stats, is_tradeable, slot, icons "
                    "FROM items WHERE 1=1"
                )
                params: list[Any] = []
                if combat_only:
                    query += " AND has_combat_stats = 1"
                if tradeable_only:
                    query += " AND is_tradeable = 1"
                query += " ORDER BY name"
                if limit is not None:
                    off = offset or 0
                    query += " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
                    params.extend([off, limit])
                cursor.execute(query, params)
                rows = cursor.fetchall()
                out = []
                for r in rows:
                    icons = []
                    if r[7]:
                        try:
                            icons = json.loads(r[7])
                        except Exception:
                            pass
                    out.append(
                        {
                            "id": r[0],
                            "name": r[1],
                            "has_special_attack": bool(r[2]),
                            "has_passive_effect": bool(r[3]),
                            "has_combat_stats": bool(r[4]),
                            "is_tradeable": bool(r[5]),
                            "slot": r[6],
                            "icons": icons,
                        }
                    )
                return out
        except Exception as e:
            print(f"Error getting items: {e}")
            raise

    def get_item(self, item_id: int) -> Optional[Dict[str, Any]]:
        try:
            with self.connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT id, name, has_special_attack, special_attack_text, "
                    "has_passive_effect, passive_effect_text, has_combat_stats, "
                    "is_tradeable, slot, combat_stats, icons "
                    "FROM items WHERE id = ?",
                    (item_id,),
                )
                r = cursor.fetchone()
                if not r:
                    return None
                combat_stats = {}
                if r[9]:
                    try:
                        combat_stats = json.loads(r[9])
                    except Exception:
                        pass
                icons = []
                if r[10]:
                    try:
                        icons = json.loads(r[10])
                    except Exception:
                        pass
                return {
                    "id": r[0],
                    "name": r[1],
                    "has_special_attack": bool(r[2]),
                    "special_attack_text": r[3],
                    "has_passive_effect": bool(r[4]),
                    "passive_effect_text": r[5],
                    "has_combat_stats": bool(r[6]),
                    "is_tradeable": bool(r[7]),
                    "slot": r[8],
                    "combat_stats": combat_stats,
                    "icons": icons,
                }
        except Exception as e:
            print(f"Error getting item {item_id}: {e}")
            raise

    def search_bosses(self, query: str, limit: int | None = None) -> List[Dict[str, Any]]:
        try:
            with self.connection() as conn:
                cursor = conn.cursor()
                if limit is not None:
                    sql = (
                        "SELECT TOP (?) id, name, raid_group, location "
                        "FROM npcs WHERE name LIKE ? ORDER BY name"
                    )
                    params = [limit, f"%{query}%"]
                else:
                    sql = "SELECT id, name, raid_group, location FROM npcs WHERE name LIKE ? ORDER BY name"
                    params = [f"%{query}%"]
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                return [{"id": r[0], "name": r[1], "raid_group": r[2], "location": r[3]} for r in rows]
        except Exception as e:
            print(f"Error searching bosses: {e}")
            return []

    def search_items(self, query: str, limit: int | None = None) -> List[Dict[str, Any]]:
        try:
            with self.connection() as conn:
                cursor = conn.cursor()
                if limit is not None:
                    sql = (
                        "SELECT TOP (?) id, name, has_special_attack, has_passive_effect, "
                        "has_combat_stats, is_tradeable, slot, icons "
                        "FROM items WHERE name LIKE ? ORDER BY name"
                    )
                    params = [limit, f"%{query}%"]
                else:
                    sql = (
                        "SELECT id, name, has_special_attack, has_passive_effect, "
                        "has_combat_stats, is_tradeable, slot, icons "
                        "FROM items WHERE name LIKE ? ORDER BY name"
                    )
                    params = [f"%{query}%"]
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                out: list[dict[str, Any]] = []
                for r in rows:
                    icons = []
                    if r[7]:
                        try:
                            icons = json.loads(r[7])
                        except Exception:
                            pass
                    out.append(
                        {
                            "id": r[0],
                            "name": r[1],
                            "has_special_attack": bool(r[2]),
                            "has_passive_effect": bool(r[3]),
                            "has_combat_stats": bool(r[4]),
                            "is_tradeable": bool(r[5]),
                            "slot": r[6],
                            "icons": icons,
                        }
                    )
                return out
        except Exception as e:
            print(f"Error searching items: {e}")
            raise

    # ---------- async queries ----------

    async def get_all_bosses_async(self, limit: int | None = None, offset: int | None = None) -> List[Dict[str, Any]]:
        try:
            async with self.connection_async() as conn:
                async with conn.cursor() as cursor:
                    query = (
                        "SELECT id, name, raid_group, location, has_multiple_forms "
                        "FROM npcs ORDER BY name"
                    )
                    params: list[Any] = []
                    if limit is not None:
                        off = offset or 0
                        query += " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
                        params.extend([off, limit])

                    await cursor.execute(query, params)
                    rows = await cursor.fetchall()

                    bosses = []
                    for r in rows:
                        icon_url = None
                        await cursor.execute(
                            "SELECT TOP 1 icons, image_url FROM npc_forms WHERE npc_id = ?",
                            (r[0],),
                        )
                        f = await cursor.fetchone()
                        if f:
                            if f[0]:
                                try:
                                    icons = json.loads(f[0])
                                    if icons:
                                        icon_url = icons[0]
                                except Exception:
                                    pass
                            if not icon_url and f[1]:
                                icon_url = f[1]
                        bosses.append(
                            {
                                "id": r[0],
                                "name": r[1],
                                "raid_group": r[2],
                                "location": r[3],
                                "has_multiple_forms": bool(r[4]),
                                "icon_url": icon_url,
                            }
                        )
                    return bosses
        except Exception as e:
            print(f"Error getting bosses: {e}")
            return []

    async def get_boss_async(self, boss_id: int) -> Optional[Dict[str, Any]]:
        try:
            async with self.connection_async() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute(
                        "SELECT id, name, raid_group, location, examine, has_multiple_forms "
                        "FROM npcs WHERE id = ?",
                        (boss_id,),
                    )
                    b = await cursor.fetchone()
                    if not b:
                        return None

                    boss = {
                        "id": b[0],
                        "name": b[1],
                        "raid_group": b[2],
                        "location": b[3],
                        "examine": b[4],
                        "has_multiple_forms": bool(b[5]),
                        "forms": [],
                    }

                    await cursor.execute(
                        "SELECT id, npc_id, form_name, form_order, combat_level, hitpoints, "
                        "defence_level, magic_level, ranged_level, defence_stab, defence_slash, "
                        "defence_crush, defence_magic, defence_ranged_standard, icons, image_url, size "
                        "FROM npc_forms WHERE npc_id = ? ORDER BY form_order",
                        (boss_id,),
                    )
                    for f in await cursor.fetchall():
                        icons = []
                        if f[14]:
                            try:
                                icons = json.loads(f[14])
                            except Exception:
                                pass
                        boss["forms"].append(
                            {
                                "id": f[0],
                                "boss_id": f[1],
                                "form_name": f[2],
                                "form_order": f[3],
                                "combat_level": f[4],
                                "hitpoints": f[5],
                                "defence_level": f[6],
                                "magic_level": f[7],
                                "ranged_level": f[8],
                                "defence_stab": f[9],
                                "defence_slash": f[10],
                                "defence_crush": f[11],
                                "defence_magic": f[12],
                                "defence_ranged_standard": f[13],
                                "icons": icons,
                                "image_url": f[15],
                                "size": f[16],
                            }
                        )
                    if boss["forms"]:
                        first = boss["forms"][0]
                        boss["icon_url"] = (first.get("icons") or [None])[0] or first.get("image_url")
                    return boss
        except Exception as e:
            print(f"Error getting boss {boss_id}: {e}")
            return None

    async def get_boss_id_by_form_async(self, form_id: int) -> Optional[int]:
        try:
            async with self.connection_async() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("SELECT npc_id FROM npc_forms WHERE id = ?", (form_id,))
                    r = await cursor.fetchone()
                    return r[0] if r else None
        except Exception as e:
            print(f"Error getting boss id from form {form_id}: {e}")
            return None

    async def get_boss_by_form_async(self, form_id: int) -> Optional[Dict[str, Any]]:
        boss_id = await self.get_boss_id_by_form_async(form_id)
        return await self.get_boss_async(boss_id) if boss_id is not None else None

    async def get_all_items_async(
        self, combat_only: bool = True, tradeable_only: bool = False, limit: int | None = None, offset: int | None = None
    ) -> List[Dict[str, Any]]:
        try:
            async with self.connection_async() as conn:
                async with conn.cursor() as cursor:
                    query = (
                        "SELECT id, name, has_special_attack, has_passive_effect, "
                        "has_combat_stats, is_tradeable, slot, icons "
                        "FROM items WHERE 1=1"
                    )
                    params: list[Any] = []
                    if combat_only:
                        query += " AND has_combat_stats = 1"
                    if tradeable_only:
                        query += " AND is_tradeable = 1"
                    query += " ORDER BY name"
                    if limit is not None:
                        off = offset or 0
                        query += " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
                        params.extend([off, limit])

                    await cursor.execute(query, params)
                    rows = await cursor.fetchall()
                    out = []
                    for r in rows:
                        icons = []
                        if r[7]:
                            try:
                                icons = json.loads(r[7])
                            except Exception:
                                pass
                        out.append(
                            {
                                "id": r[0],
                                "name": r[1],
                                "has_special_attack": bool(r[2]),
                                "has_passive_effect": bool(r[3]),
                                "has_combat_stats": bool(r[4]),
                                "is_tradeable": bool(r[5]),
                                "slot": r[6],
                                "icons": icons,
                            }
                        )
                    return out
        except Exception as e:
            print(f"Error getting items: {e}")
            raise

    async def get_item_async(self, item_id: int) -> Optional[Dict[str, Any]]:
        try:
            async with self.connection_async() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute(
                        "SELECT id, name, has_special_attack, special_attack_text, "
                        "has_passive_effect, passive_effect_text, has_combat_stats, "
                        "is_tradeable, slot, combat_stats, icons "
                        "FROM items WHERE id = ?",
                        (item_id,),
                    )
                    r = await cursor.fetchone()
                    if not r:
                        return None
                    combat_stats = {}
                    if r[9]:
                        try:
                            combat_stats = json.loads(r[9])
                        except Exception:
                            pass
                    icons = []
                    if r[10]:
                        try:
                            icons = json.loads(r[10])
                        except Exception:
                            pass
                    return {
                        "id": r[0],
                        "name": r[1],
                        "has_special_attack": bool(r[2]),
                        "special_attack_text": r[3],
                        "has_passive_effect": bool(r[4]),
                        "passive_effect_text": r[5],
                        "has_combat_stats": bool(r[6]),
                        "is_tradeable": bool(r[7]),
                        "slot": r[8],
                        "combat_stats": combat_stats,
                        "icons": icons,
                    }
        except Exception as e:
            print(f"Error getting item {item_id}: {e}")
            raise

    async def search_bosses_async(self, query: str, limit: int | None = None) -> List[Dict[str, Any]]:
        try:
            async with self.connection_async() as conn:
                async with conn.cursor() as cursor:
                    if limit is not None:
                        sql = (
                            "SELECT TOP (?) id, name, raid_group, location "
                            "FROM npcs WHERE name LIKE ? ORDER BY name"
                        )
                        params = [limit, f"%{query}%"]
                    else:
                        sql = "SELECT id, name, raid_group, location FROM npcs WHERE name LIKE ? ORDER BY name"
                        params = [f"%{query}%"]
                    await cursor.execute(sql, params)
                    rows = await cursor.fetchall()
                    return [{"id": r[0], "name": r[1], "raid_group": r[2], "location": r[3]} for r in rows]
        except Exception as e:
            print(f"Error searching bosses: {e}")
            return []

    async def search_items_async(self, query: str, limit: int | None = None) -> List[Dict[str, Any]]:
        try:
            async with self.connection_async() as conn:
                async with conn.cursor() as cursor:
                    if limit is not None:
                        sql = (
                            "SELECT TOP (?) id, name, has_special_attack, has_passive_effect, "
                            "has_combat_stats, is_tradeable, slot, icons "
                            "FROM items WHERE name LIKE ? ORDER BY name"
                        )
                        params = [limit, f"%{query}%"]
                    else:
                        sql = (
                            "SELECT id, name, has_special_attack, has_passive_effect, "
                            "has_combat_stats, is_tradeable, slot, icons "
                            "FROM items WHERE name LIKE ? ORDER BY name"
                        )
                        params = [f"%{query}%"]
                    await cursor.execute(sql, params)
                    rows = await cursor.fetchall()
                    out: list[dict[str, Any]] = []
                    for r in rows:
                        icons = []
                        if r[7]:
                            try:
                                icons = json.loads(r[7])
                            except Exception:
                                pass
                        out.append(
                            {
                                "id": r[0],
                                "name": r[1],
                                "has_special_attack": bool(r[2]),
                                "has_passive_effect": bool(r[3]),
                                "has_combat_stats": bool(r[4]),
                                "is_tradeable": bool(r[5]),
                                "slot": r[6],
                                "icons": icons,
                            }
                        )
                    return out
        except Exception as e:
            print(f"Error searching items: {e}")
            raise


# legacy export used elsewhere
DatabaseService = AzureSQLDatabaseService
azure_sql_service = AzureSQLDatabaseService()
