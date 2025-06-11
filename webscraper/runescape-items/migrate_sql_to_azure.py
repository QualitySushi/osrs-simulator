import sqlite3
import pyodbc
import os

# ===== UPDATE THESE WITH YOUR AZURE SQL DATABASE DETAILS =====
AZURE_SQL_SERVER = "scapelab-db.database.windows.net"
AZURE_SQL_DATABASE = "ScapeLab-db"  # Update this

# Entra ID authentication connection string
AZURE_SQL_CONNECTION = (
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={AZURE_SQL_SERVER};"
    f"DATABASE={AZURE_SQL_DATABASE};"
    f"Authentication=ActiveDirectoryInteractive;"  # Uses your Azure login
    f"Encrypt=yes;"
    f"TrustServerCertificate=no;"
    f"Connection Timeout=30;"
)

# SQLite database file paths
# All NPC data resides in this single SQLite database
SQLITE_NPCS_DB = "osrs_npcs.db"
SQLITE_ITEMS_DB = "osrs_all_items.db"

def test_azure_connection():
    """Test connection to Azure SQL Database using Entra ID"""
    try:
        print("Testing Azure SQL Database connection with Entra ID...")
        print("(This may open a browser window for authentication)")
        conn = pyodbc.connect(AZURE_SQL_CONNECTION)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()
        print("✓ Azure SQL Database connection successful!")
        return True
    except Exception as e:
        print(f"✗ Azure SQL Database connection failed: {e}")
        print("Make sure you:")
        print("  1. Are logged into Azure CLI: az login")
        print("  2. Have been added as an Azure AD admin on the SQL server")
        return False

def drop_tables():
    """Drop existing tables so migrations start fresh."""
    try:
        print("Dropping existing tables in Azure SQL Database...")
        conn = pyodbc.connect(AZURE_SQL_CONNECTION)
        cursor = conn.cursor()

        tables = [
            "npc_forms",
            "npcs",
            "items",
        ]
        for table in tables:
            cursor.execute(
                f"IF OBJECT_ID('{table}', 'U') IS NOT NULL DROP TABLE {table}"
            )

        conn.commit()
        conn.close()
        print("✓ Existing tables dropped successfully!")
        return True

    except Exception as e:
        print(f"✗ Failed to drop tables: {e}")
        return False


def create_tables():
    """Create tables in Azure SQL Database"""
    try:
        print("Creating tables in Azure SQL Database...")
        conn = pyodbc.connect(AZURE_SQL_CONNECTION)
        cursor = conn.cursor()
        


        # Create npcs table
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='npcs' AND xtype='U')
            CREATE TABLE npcs (
                id INT PRIMARY KEY,
                name NVARCHAR(255) NOT NULL UNIQUE,
                raid_group NVARCHAR(255),
                examine NVARCHAR(MAX),
                release_date NVARCHAR(100),
                location NVARCHAR(255),
                slayer_level INT,
                slayer_xp INT,
                slayer_category NVARCHAR(100),
                wiki_url NVARCHAR(255),
                has_multiple_forms BIT,
                raw_html NVARCHAR(MAX),
                last_updated DATETIME
            )
        """)

        # Create npc_forms table
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='npc_forms' AND xtype='U')
            CREATE TABLE npc_forms (
                id INT PRIMARY KEY,
                npc_id INT NOT NULL,
                form_name NVARCHAR(255),
                form_order INT,
                combat_level INT,
                hitpoints INT,
                max_hit NVARCHAR(255),
                attack_speed INT,
                attack_style NVARCHAR(255),
                attack_level INT,
                strength_level INT,
                defence_level INT,
                magic_level INT,
                ranged_level INT,
                aggressive_attack_bonus INT,
                aggressive_strength_bonus INT,
                aggressive_magic_bonus INT,
                aggressive_magic_strength_bonus INT,
                aggressive_ranged_bonus INT,
                aggressive_ranged_strength_bonus INT,
                defence_stab INT,
                defence_slash INT,
                defence_crush INT,
                defence_magic INT,
                elemental_weakness_type NVARCHAR(100),
                elemental_weakness_percent NVARCHAR(100),
                defence_ranged_light INT,
                defence_ranged_standard INT,
                defence_ranged_heavy INT,
                attribute NVARCHAR(255),
                xp_bonus NVARCHAR(100),
                aggressive BIT,
                poisonous BIT,
                poison_immunity BIT,
                venom_immunity BIT,
                melee_immunity BIT,
                magic_immunity BIT,
                ranged_immunity BIT,
                cannon_immunity BIT,
                thrall_immunity BIT,
                special_mechanics NVARCHAR(MAX),
                image_url NVARCHAR(500),
                icons NVARCHAR(MAX),
                size INT,
                assigned_by NVARCHAR(255),
                FOREIGN KEY (npc_id) REFERENCES npcs(id)
            )
        """)
        
        # Create items table  
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='items' AND xtype='U')
            CREATE TABLE items (
                id INT PRIMARY KEY,
                name NVARCHAR(255) NOT NULL UNIQUE,
                has_special_attack BIT,
                special_attack_text NVARCHAR(MAX),
                has_passive_effect BIT,
                passive_effect_text NVARCHAR(MAX),
                has_combat_stats BIT,
                is_tradeable BIT,
                slot NVARCHAR(50),
                icons NVARCHAR(MAX),
                combat_stats NVARCHAR(MAX),
                raw_html NVARCHAR(MAX)
            )
        """)
        
        conn.commit()
        conn.close()
        print("✓ Tables created successfully!")
        return True
        
    except Exception as e:
        print(f"✗ Failed to create tables: {e}")
        return False


def migrate_items():
    """Migrate items from SQLite to Azure SQL"""
    try:
        print("Migrating items...")
        
        # Check if SQLite file exists
        if not os.path.exists(SQLITE_ITEMS_DB):
            print(f"✗ SQLite file not found: {SQLITE_ITEMS_DB}")
            return False
            
        # Connect to SQLite
        sqlite_conn = sqlite3.connect(SQLITE_ITEMS_DB)
        sqlite_cursor = sqlite_conn.cursor()
        
        # Connect to Azure SQL
        azure_conn = pyodbc.connect(AZURE_SQL_CONNECTION)
        azure_cursor = azure_conn.cursor()
        
        # Get items from SQLite
        sqlite_cursor.execute("SELECT * FROM items")
        items = sqlite_cursor.fetchall()
        
        print(f"Found {len(items)} items to migrate")
        
        # Get column names including the ID
        sqlite_cursor.execute("PRAGMA table_info(items)")
        columns = [col[1] for col in sqlite_cursor.fetchall()]
        
        item_count = 0
        for item in items:
            item_data = item
            
            # Create parameterized query
            placeholders = ', '.join(['?' for _ in range(len(columns))])
            insert_columns = ', '.join(columns)
            query = f"INSERT INTO items ({insert_columns}) VALUES ({placeholders})"
            
            try:
                azure_cursor.execute(query, item_data)
                item_count += 1
                if item_count % 100 == 0:
                    print(f"  Migrated {item_count} items...")
            except Exception as e:
                print(f"✗ Failed to migrate item {item[1]}: {e}")
        
        azure_conn.commit()
        azure_conn.close()
        sqlite_conn.close()
        
        print(f"✓ Migrated {item_count} items successfully!")
        return True
        
    except Exception as e:
        print(f"✗ Error migrating items: {e}")
        return False

def migrate_npcs():
    """Migrate NPCs from SQLite to Azure SQL"""
    try:
        print("Migrating NPCs...")

        if not os.path.exists(SQLITE_NPCS_DB):
            print(f"✗ SQLite file not found: {SQLITE_NPCS_DB}")
            return False

        sqlite_conn = sqlite3.connect(SQLITE_NPCS_DB)
        sqlite_cursor = sqlite_conn.cursor()

        azure_conn = pyodbc.connect(AZURE_SQL_CONNECTION)
        azure_cursor = azure_conn.cursor()

        sqlite_cursor.execute("SELECT * FROM npcs")
        npcs = sqlite_cursor.fetchall()

        print(f"Found {len(npcs)} NPCs to migrate")

        sqlite_cursor.execute("PRAGMA table_info(npcs)")
        columns = [col[1] for col in sqlite_cursor.fetchall()]

        npc_count = 0
        for npc in npcs:
            npc_data = npc


            placeholders = ', '.join(['?' for _ in range(len(columns))])
            insert_columns = ', '.join(columns)
            query = f"INSERT INTO npcs ({insert_columns}) VALUES ({placeholders})"

            try:
                azure_cursor.execute(query, npc_data)
                npc_count += 1
                if npc_count % 50 == 0:
                    print(f"  Migrated {npc_count} NPCs...")
            except Exception as e:
                print(f"✗ Failed to migrate NPC {npc[1]}: {e}")

        print(f"✓ Migrated {npc_count} NPCs successfully!")

        migrate_npc_forms(sqlite_cursor, azure_cursor)

        azure_conn.commit()
        azure_conn.close()
        sqlite_conn.close()
        return True

    except Exception as e:
        print(f"✗ Error migrating NPCs: {e}")
        return False

def migrate_npc_forms(sqlite_cursor, azure_cursor):
    """Migrate NPC forms"""
    try:
        print("Migrating NPC forms...")

        sqlite_cursor.execute("SELECT * FROM npc_forms")
        forms = sqlite_cursor.fetchall()

        print(f"Found {len(forms)} NPC forms to migrate")

        sqlite_cursor.execute("PRAGMA table_info(npc_forms)")
        columns = [col[1] for col in sqlite_cursor.fetchall()]

        form_count = 0
        for form in forms:
            form_data = form

            placeholders = ', '.join(['?' for _ in range(len(columns))])
            insert_columns = ', '.join(columns)
            query = f"INSERT INTO npc_forms ({insert_columns}) VALUES ({placeholders})"

            try:
                azure_cursor.execute(query, form_data)
                form_count += 1
                if form_count % 50 == 0:
                    print(f"  Migrated {form_count} NPC forms...")
            except Exception as e:
                print(f"✗ Failed to migrate form {form[2]}: {e}")

        print(f"✓ Migrated {form_count} NPC forms successfully!")

    except Exception as e:
        print(f"✗ Error migrating NPC forms: {e}")

def main():
    """Main migration function"""
    print("=" * 50)
    print("SQLite to Azure SQL Database Migration")
    print("=" * 50)
    
    # Check if we have the required connection details
    if "your-database-name" in AZURE_SQL_DATABASE:
        print("⚠️  IMPORTANT: Update the connection details at the top of this script!")
        print("   - AZURE_SQL_DATABASE")
        print("   - AZURE_SQL_USERNAME") 
        print("   - AZURE_SQL_PASSWORD")
        return
    
    # Test Azure connection
    if not test_azure_connection():
        return

    # Start from a clean slate each run
    if not drop_tables():
        return

    # Create tables
    if not create_tables():
        return
    
    # Migrate data
    print("\nStarting data migration...")
    

    # Migrate items
    if migrate_items():
        print("✓ Item migration completed")
    else:
        print("✗ Item migration failed")

    # Migrate NPCs
    if migrate_npcs():
        print("✓ NPC migration completed")
    else:
        print("✗ NPC migration failed")
    
    print("\n" + "=" * 50)
    print("Migration completed!")
    print("=" * 50)

if __name__ == "__main__":
    main()
