import pyodbc
import aioodbc
import os
import json
import time
import asyncio
from contextlib import contextmanager, asynccontextmanager
from typing import Dict, List, Optional, Any
from .config.settings import (
    DB_CONNECTION_TIMEOUT,
    DB_MAX_RETRIES,
)

# Connection configuration via environment variables
CONNECTION_TIMEOUT = DB_CONNECTION_TIMEOUT
MAX_RETRIES = DB_MAX_RETRIES



class AzureSQLDatabaseService:
    """Service for handling database operations using Azure SQL Database."""

    def __init__(self):
        """Initialize the Azure SQL Database service."""
        # Try to get connection string first (Azure Connection Strings format)
        connection_string = os.environ.get("SQLAZURECONNSTR_DefaultConnection")
        
        if connection_string:
            # Use the connection string directly
            self.connection_string = connection_string
        else:
            # Fallback to individual environment variables
            self.server = os.environ.get("AZURE_SQL_SERVER")
            self.database = os.environ.get("AZURE_SQL_DATABASE") 
            self.username = os.environ.get("AZURE_SQL_USERNAME")
            self.password = os.environ.get("AZURE_SQL_PASSWORD")
            
            # For production, we'll use Entra ID authentication
            if not all([self.server, self.database]):
                print("Warning: Azure SQL Database configuration incomplete")
            
            # Use Entra ID authentication (for production)
            if not self.username or not self.password:
                self.connection_string = (
                    f"DRIVER={{ODBC Driver 18 for SQL Server}};"
                    f"SERVER={self.server};"
                    f"DATABASE={self.database};"
                    f"Authentication=ActiveDirectoryMsi;"  # For App Service Managed Identity
                    f"Encrypt=yes;"
                    f"TrustServerCertificate=no;"
                    f"Connection Timeout=30;"
                )
            else:
                # SQL Authentication fallback
                self.connection_string = (
                    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                    f"SERVER={self.server};"
                    f"DATABASE={self.database};"
                    f"UID={self.username};"
                    f"PWD={self.password};"
                    f"Encrypt=yes;"
                    f"TrustServerCertificate=no;"
                    f"Connection Timeout=30;"
                )

        # Async connections will be opened per request


    def _get_connection(self) -> pyodbc.Connection:
        """Create a synchronous connection (no pooling)."""
        return pyodbc.connect(self.connection_string, timeout=CONNECTION_TIMEOUT)

    async def _get_connection_async(self) -> aioodbc.Connection:
        """Create a new async connection."""
        return await aioodbc.connect(
            dsn=self.connection_string,
            timeout=CONNECTION_TIMEOUT,
        )

    @contextmanager
    def connection(self):
        """Context manager with retry logic for DB connections."""
        for attempt in range(MAX_RETRIES):
            conn = None
            try:
                conn = self._get_connection()
                yield conn
            except Exception:
                if conn:
                    try:
                        conn.close()
                    except Exception:
                        pass
                if attempt == MAX_RETRIES - 1:
                    raise
                time.sleep(2**attempt)
            else:
                if conn:
                    conn.close()
                break

    from contextlib import asynccontextmanager
    import asyncio
    
    # inside AzureSQLDatabaseService
    @asynccontextmanager
    async def connection_async(self):
        """
        Robust async connection context with retries and guaranteed close.
        Avoids 'Unclosed connection' warnings by always closing in finally.
        """
        conn = None
        last_exc = None
    
        for attempt in range(MAX_RETRIES):
            try:
                # If you prefer, pass loop=asyncio.get_running_loop()
                conn = await aioodbc.connect(
                    dsn=self.connection_string,
                    timeout=CONNECTION_TIMEOUT,
                )
                break
            except Exception as e:
                last_exc = e
                if attempt == MAX_RETRIES - 1:
                    raise
                await asyncio.sleep(2 ** attempt)
    
        try:
            yield conn
        finally:
            if conn is not None:
                try:
                    await conn.close()
                except Exception:
                    # swallow close errors; connection object is going away anyway
                    pass

    def get_all_bosses(
        self,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[Dict[str, Any]]:
        """Get all bosses from the database with optional pagination."""
        try:
            with self.connection() as conn:
                cursor = conn.cursor()

                query = (
                    "SELECT id, name, raid_group, location, has_multiple_forms\n"
                    "FROM npcs\n"
                    "ORDER BY name"
                )
                params: list[Any] = []
                if limit is not None:
                    off = offset or 0
                    query += " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
                    params.extend([off, limit])

                cursor.execute(query, params)

                bosses = []
                for row in cursor.fetchall():
                    icon_url = None
                    # Try to get icon from first boss form
                    cursor.execute(
                        """
                    SELECT TOP 1 icons, image_url
                    FROM npc_forms
                    WHERE npc_id = ?
                    """,
                        (row[0],),
                    )

                    form_row = cursor.fetchone()
                    if form_row:
                        if form_row[0]:  # icons JSON
                            try:
                                icons = json.loads(form_row[0])
                                if icons and len(icons) > 0:
                                    icon_url = icons[0]
                            except:
                                pass
                        if not icon_url and form_row[1]:  # image_url
                            icon_url = form_row[1]

                    bosses.append(
                        {
                            "id": row[0],
                            "name": row[1],
                            "raid_group": row[2],
                            "location": row[3],
                            "has_multiple_forms": bool(row[4]),
                            "icon_url": icon_url,
                        }
                    )

                return bosses
            
        except Exception as e:
            print(f"Error getting bosses: {e}")
            return []

    def get_boss(self, boss_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific boss with all its forms."""
        try:
            with self.connection() as conn:
                cursor = conn.cursor()

                cursor.execute(
                    """
                SELECT id, name, raid_group, location, examine, has_multiple_forms
                FROM npcs
                WHERE id = ?
                """,
                    (boss_id,),
                )

                boss_row = cursor.fetchone()
                if not boss_row:
                    return None

                boss_data = {
                    "id": boss_row[0],
                    "name": boss_row[1],
                    "raid_group": boss_row[2],
                    "location": boss_row[3],
                    "examine": boss_row[4],
                    "has_multiple_forms": bool(boss_row[5]),
                    "forms": [],
                }

                cursor.execute(
                    """
                SELECT id, npc_id AS boss_id, form_name, form_order, combat_level, hitpoints,
                       defence_level, magic_level, ranged_level, defence_stab, defence_slash,
                       defence_crush, defence_magic, defence_ranged_standard, icons, image_url,
                       size
                FROM npc_forms
                WHERE npc_id = ?
                ORDER BY form_order
                """,
                    (boss_id,),
                )

                for form_row in cursor.fetchall():
                    icons = []
                    if form_row[14]:
                        try:
                            icons = json.loads(form_row[14])
                        except Exception:
                            pass

                    form_data = {
                        "id": form_row[0],
                        "boss_id": form_row[1],
                        "form_name": form_row[2],
                        "form_order": form_row[3],
                        "combat_level": form_row[4],
                        "hitpoints": form_row[5],
                        "defence_level": form_row[6],
                        "magic_level": form_row[7],
                        "ranged_level": form_row[8],
                        "defence_stab": form_row[9],
                        "defence_slash": form_row[10],
                        "defence_crush": form_row[11],
                        "defence_magic": form_row[12],
                        "defence_ranged_standard": form_row[13],
                        "icons": icons,
                        "image_url": form_row[15],
                        "size": form_row[16],
                    }
                    boss_data["forms"].append(form_data)

                if boss_data["forms"]:
                    first_form = boss_data["forms"][0]
                    if first_form.get("icons"):
                        boss_data["icon_url"] = first_form["icons"][0]
                    elif first_form.get("image_url"):
                        boss_data["icon_url"] = first_form["image_url"]

                return boss_data

        except Exception as e:
            print(f"Error getting boss {boss_id}: {e}")
            return None

    def get_boss_id_by_form(self, form_id: int) -> Optional[int]:
        """Return the boss_id associated with a boss form."""
        try:
            with self.connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT npc_id FROM npc_forms WHERE id = ?", (form_id,))
                row = cursor.fetchone()
                if row:
                    return row[0]
                return None
        except Exception as e:
            print(f"Error getting boss id from form {form_id}: {e}")
            return None

    def get_boss_by_form(self, form_id: int) -> Optional[Dict[str, Any]]:
        """Get boss details using a form id."""
        boss_id = self.get_boss_id_by_form(form_id)
        if boss_id is None:
            return None
        return self.get_boss(boss_id)

    def get_all_items(
        self,
        combat_only: bool = True,
        tradeable_only: bool = False,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[Dict[str, Any]]:
        """Get all items from the database with optional filters and pagination."""
        try:
            with self.connection() as conn:
                cursor = conn.cursor()

                query = """
                    SELECT id, name, has_special_attack, has_passive_effect,
                           has_combat_stats, is_tradeable, slot, icons
                    FROM items
                    WHERE 1=1
                """
                params = []

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

                items = []
                for row in cursor.fetchall():
                    # Parse icons JSON
                    icons = []
                    if row[7]:  # icons column
                        try:
                            icons = json.loads(row[7])
                        except Exception:
                            pass

                    items.append(
                        {
                            "id": row[0],
                            "name": row[1],
                            "has_special_attack": bool(row[2]),
                            "has_passive_effect": bool(row[3]),
                            "has_combat_stats": bool(row[4]),
                            "is_tradeable": bool(row[5]),
                            "slot": row[6],
                            "icons": icons,
                        }
                    )

                return items
            
        except Exception as e:
            print(f"Error getting items: {e}")
            raise

    def get_item(self, item_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific item."""
        try:
            with self.connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT id, name, has_special_attack, special_attack_text,
                           has_passive_effect, passive_effect_text, has_combat_stats,
                           is_tradeable, slot, combat_stats, icons
                    FROM items
                    WHERE id = ?
                    """,
                    (item_id,),
                )
                row = cursor.fetchone()
                if not row:
                    return None
    
                combat_stats = {}
                if row[9]:
                    try:
                        combat_stats = json.loads(row[9])
                    except Exception:
                        pass
    
                icons = []
                if row[10]:
                    try:
                        icons = json.loads(row[10])
                    except Exception:
                        pass
    
                return {
                    "id": row[0],
                    "name": row[1],
                    "has_special_attack": bool(row[2]),
                    "special_attack_text": row[3],
                    "has_passive_effect": bool(row[4]),
                    "passive_effect_text": row[5],
                    "has_combat_stats": bool(row[6]),
                    "is_tradeable": bool(row[7]),
                    "slot": row[8],
                    "combat_stats": combat_stats,
                    "icons": icons,
                }
        except Exception as e:
            print(f"Error getting item {item_id}: {e}")
            raise


    def search_bosses(self, query: str, limit: int | None = None) -> List[Dict[str, Any]]:
        """Search bosses by name."""
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
                    sql = (
                        "SELECT id, name, raid_group, location "
                        "FROM npcs WHERE name LIKE ? ORDER BY name"
                    )
                    params = [f"%{query}%"]
    
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                return [
                    {"id": r[0], "name": r[1], "raid_group": r[2], "location": r[3]}
                    for r in rows
                ]
        except Exception as e:
            print(f"Error searching bosses: {e}")
            return []


    def search_items(self, query: str, limit: int | None = None) -> List[Dict[str, Any]]:
        """Search items by name."""
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

    # Async implementations -----------------------------------------------------

    async def get_all_bosses_async(
        self, limit: int | None = None, offset: int | None = None
    ) -> List[Dict[str, Any]]:
        try:
            async with self.connection_async() as conn:
                async with conn.cursor() as cursor:
                    query = (
                        "SELECT id, name, raid_group, location, has_multiple_forms\n"
                        "FROM npcs\n"
                        "ORDER BY name"
                    )
                    params: list[Any] = []
                    if limit is not None:
                        off = offset or 0
                        query += " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
                        params.extend([off, limit])

                    await cursor.execute(query, params)
                    rows = await cursor.fetchall()
                    bosses = []
                    for row in rows:
                        icon_url = None
                        await cursor.execute(
                            """
                        SELECT TOP 1 icons, image_url
                        FROM npc_forms
                        WHERE npc_id = ?
                        """,
                            (row[0],),
                        )
                        form_row = await cursor.fetchone()
                        if form_row:
                            if form_row[0]:
                                try:
                                    icons = json.loads(form_row[0])
                                    if icons:
                                        icon_url = icons[0]
                                except Exception:
                                    pass
                            if not icon_url and form_row[1]:
                                icon_url = form_row[1]
                        bosses.append(
                            {
                                "id": row[0],
                                "name": row[1],
                                "raid_group": row[2],
                                "location": row[3],
                                "has_multiple_forms": bool(row[4]),
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
                        """
                    SELECT id, name, raid_group, location, examine, has_multiple_forms
                    FROM npcs
                    WHERE id = ?
                    """,
                        (boss_id,),
                    )
                    boss_row = await cursor.fetchone()
                    if not boss_row:
                        return None

                    boss_data = {
                        "id": boss_row[0],
                        "name": boss_row[1],
                        "raid_group": boss_row[2],
                        "location": boss_row[3],
                        "examine": boss_row[4],
                        "has_multiple_forms": bool(boss_row[5]),
                        "forms": [],
                    }

                    await cursor.execute(
                        """
                    SELECT id, npc_id AS boss_id, form_name, form_order, combat_level, hitpoints,
                           defence_level, magic_level, ranged_level, defence_stab, defence_slash,
                           defence_crush, defence_magic, defence_ranged_standard, icons, image_url,
                           size
                    FROM npc_forms
                    WHERE npc_id = ?
                    ORDER BY form_order
                    """,
                        (boss_id,),
                    )
                    form_rows = await cursor.fetchall()
                    for form_row in form_rows:
                        icons = []
                        if form_row[14]:
                            try:
                                icons = json.loads(form_row[14])
                            except Exception:
                                pass
                        form_data = {
                            "id": form_row[0],
                            "boss_id": form_row[1],
                            "form_name": form_row[2],
                            "form_order": form_row[3],
                            "combat_level": form_row[4],
                            "hitpoints": form_row[5],
                            "defence_level": form_row[6],
                            "magic_level": form_row[7],
                            "ranged_level": form_row[8],
                            "defence_stab": form_row[9],
                            "defence_slash": form_row[10],
                            "defence_crush": form_row[11],
                            "defence_magic": form_row[12],
                            "defence_ranged_standard": form_row[13],
                            "icons": icons,
                            "image_url": form_row[15],
                            "size": form_row[16],
                        }
                        boss_data["forms"].append(form_data)

                    if boss_data["forms"]:
                        first_form = boss_data["forms"][0]
                        if first_form.get("icons"):
                            boss_data["icon_url"] = first_form["icons"][0]
                        elif first_form.get("image_url"):
                            boss_data["icon_url"] = first_form["image_url"]

                    return boss_data
        except Exception as e:
            print(f"Error getting boss {boss_id}: {e}")
            return None

    async def get_boss_id_by_form_async(self, form_id: int) -> Optional[int]:
        try:
            async with self.connection_async() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute(
                        "SELECT npc_id FROM npc_forms WHERE id = ?",
                        (form_id,),
                    )
                    row = await cursor.fetchone()
                    if row:
                        return row[0]
                    return None
        except Exception as e:
            print(f"Error getting boss id from form {form_id}: {e}")
            return None

    async def get_boss_by_form_async(self, form_id: int) -> Optional[Dict[str, Any]]:
        boss_id = await self.get_boss_id_by_form_async(form_id)
        if boss_id is None:
            return None
        return await self.get_boss_async(boss_id)

    async def get_all_items_async(
        self,
        combat_only: bool = True,
        tradeable_only: bool = False,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[Dict[str, Any]]:
        try:
            async with self.connection_async() as conn:
                async with conn.cursor() as cursor:
                    query = """
                        SELECT id, name, has_special_attack, has_passive_effect,
                               has_combat_stats, is_tradeable, slot, icons
                        FROM items
                        WHERE 1=1
                    """
                    params = []

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

                    items = []
                    for row in rows:
                        icons = []
                        if row[7]:
                            try:
                                icons = json.loads(row[7])
                            except Exception:
                                pass
                        items.append(
                            {
                                "id": row[0],
                                "name": row[1],
                                "has_special_attack": bool(row[2]),
                                "has_passive_effect": bool(row[3]),
                                "has_combat_stats": bool(row[4]),
                                "is_tradeable": bool(row[5]),
                                "slot": row[6],
                                "icons": icons,
                            }
                        )

                    return items
        except Exception as e:
            print(f"Error getting items: {e}")
            raise

    async def get_item_async(self, item_id: int) -> Optional[Dict[str, Any]]:
        try:
            async with self.connection_async() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute(
                        """
                    SELECT id, name, has_special_attack, special_attack_text,
                           has_passive_effect, passive_effect_text, has_combat_stats,
                           is_tradeable, slot, combat_stats, icons
                    FROM items
                    WHERE id = ?
                    """,
                        (item_id,),
                    )

                    row = await cursor.fetchone()
                    if not row:
                        return None

                    combat_stats = {}
                    if row[9]:
                        try:
                            combat_stats = json.loads(row[9])
                        except Exception:
                            pass

                    icons = []
                    if row[10]:
                        try:
                            icons = json.loads(row[10])
                        except Exception:
                            pass

                    item_data = {
                        "id": row[0],
                        "name": row[1],
                        "has_special_attack": bool(row[2]),
                        "special_attack_text": row[3],
                        "has_passive_effect": bool(row[4]),
                        "passive_effect_text": row[5],
                        "has_combat_stats": bool(row[6]),
                        "is_tradeable": bool(row[7]),
                        "slot": row[8],
                        "combat_stats": combat_stats,
                        "icons": icons,
                    }

                    return item_data
        except Exception as e:
            print(f"Error getting item {item_id}: {e}")
            raise

    async def search_bosses_async(
        self, query: str, limit: int | None = None
    ) -> List[Dict[str, Any]]:
        try:
            async with self.connection_async() as conn:
                async with conn.cursor() as cursor:
                    sql = (
                        "SELECT id, name, raid_group, location\n"
                        "FROM npcs\n"
                        "WHERE name LIKE ?\n"
                        "ORDER BY name"
                    )
                    params: list[Any] = [f"%{query}%"]
                    if limit is not None:
                        sql = (
                            "SELECT TOP (?) id, name, raid_group, location\n"
                            "FROM npcs\n"
                            "WHERE name LIKE ?\n"
                            "ORDER BY name"
                        )
                        params.insert(0, limit)

                    await cursor.execute(sql, params)
                    rows = await cursor.fetchall()
                    bosses = []
                    for row in rows:
                        bosses.append(
                            {
                                "id": row[0],
                                "name": row[1],
                                "raid_group": row[2],
                                "location": row[3],
                            }
                        )

                    return bosses
        except Exception as e:
            print(f"Error searching bosses: {e}")
            return []

    async def search_items_async(
        self, query: str, limit: int | None = None
    ) -> List[Dict[str, Any]]:
        try:
            async with self.connection_async() as conn:
                async with conn.cursor() as cursor:
                    sql = (
                        "SELECT id, name, has_special_attack, has_passive_effect,\n"
                        "       has_combat_stats, is_tradeable, slot, icons\n"
                        "FROM items\n"
                        "WHERE name LIKE ?\n"
                        "ORDER BY name"
                    )
                    params: list[Any] = [f"%{query}%"]
                    if limit is not None:
                        sql = (
                            "SELECT TOP (?) id, name, has_special_attack, has_passive_effect,\n"
                            "       has_combat_stats, is_tradeable, slot, icons\n"
                            "FROM items\n"
                            "WHERE name LIKE ?\n"
                            "ORDER BY name"
                        )
                        params.insert(0, limit)

                    await cursor.execute(sql, params)
                    rows = await cursor.fetchall()
                    items = []
                    for row in rows:
                        icons = []
                        if row[7]:
                            try:
                                icons = json.loads(row[7])
                            except Exception:
                                pass
                        items.append(
                            {
                                "id": row[0],
                                "name": row[1],
                                "has_special_attack": bool(row[2]),
                                "has_passive_effect": bool(row[3]),
                                "has_combat_stats": bool(row[4]),
                                "is_tradeable": bool(row[5]),
                                "slot": row[6],
                                "icons": icons,
                            }
                        )

                    return items
        except Exception as e:
            print(f"Error searching items: {e}")
            raise

# Provide legacy name for unit tests
DatabaseService = AzureSQLDatabaseService

# Create a singleton instance
azure_sql_service = AzureSQLDatabaseService()
