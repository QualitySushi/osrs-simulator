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
SQLITE_BOSSES_DB = "osrs_bosses.db"
SQLITE_ITEMS_DB = "osrs_combat_items.db"  # Using combat items DB

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

def create_tables():
    """Create tables in Azure SQL Database"""
    try:
        print("Creating tables in Azure SQL Database...")
        conn = pyodbc.connect(AZURE_SQL_CONNECTION)
        cursor = conn.cursor()
        
        # Create bosses table
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='bosses' AND xtype='U')
            CREATE TABLE bosses (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(255) NOT NULL UNIQUE,
                raid_group NVARCHAR(255),
                examine NVARCHAR(MAX),
                release_date NVARCHAR(100),
                location NVARCHAR(255),
                slayer_level INT,
                slayer_xp INT,
                slayer_category NVARCHAR(100),
                has_multiple_forms BIT DEFAULT 0,
                raw_html NVARCHAR(MAX)
            )
        """)
        
        # Create boss_forms table
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='boss_forms' AND xtype='U')
            CREATE TABLE boss_forms (
                id INT IDENTITY(1,1) PRIMARY KEY,
                boss_id INT NOT NULL,
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
                npc_ids NVARCHAR(255),
                assigned_by NVARCHAR(255),
                FOREIGN KEY (boss_id) REFERENCES bosses(id)
            )
        """)
        
        # Create items table  
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='items' AND xtype='U')
            CREATE TABLE items (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(255) NOT NULL,
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

def migrate_bosses():
    """Migrate bosses from SQLite to Azure SQL"""
    try:
        print("Migrating bosses...")
        
        # Check if SQLite file exists
        if not os.path.exists(SQLITE_BOSSES_DB):
            print(f"✗ SQLite file not found: {SQLITE_BOSSES_DB}")
            return False
            
        # Connect to SQLite
        sqlite_conn = sqlite3.connect(SQLITE_BOSSES_DB)
        sqlite_cursor = sqlite_conn.cursor()
        
        # Connect to Azure SQL
        azure_conn = pyodbc.connect(AZURE_SQL_CONNECTION)
        azure_cursor = azure_conn.cursor()
        
        # Get bosses from SQLite
        sqlite_cursor.execute("SELECT * FROM bosses")
        bosses = sqlite_cursor.fetchall()
        
        print(f"Found {len(bosses)} bosses to migrate")
        
        # Get column names (skip the first one which is ID)
        sqlite_cursor.execute("PRAGMA table_info(bosses)")
        columns = [col[1] for col in sqlite_cursor.fetchall()][1:]  # Skip ID column
        
        boss_count = 0
        for boss in bosses:
            boss_data = boss[1:]  # Skip the SQLite ID
            
            # Create parameterized query
            placeholders = ', '.join(['?' for _ in range(len(columns))])
            insert_columns = ', '.join(columns)
            query = f"INSERT INTO bosses ({insert_columns}) VALUES ({placeholders})"
            
            try:
                azure_cursor.execute(query, boss_data)
                boss_count += 1
                if boss_count % 10 == 0:
                    print(f"  Migrated {boss_count} bosses...")
            except Exception as e:
                print(f"✗ Failed to migrate boss {boss[1]}: {e}")
        
        azure_conn.commit()
        print(f"✓ Migrated {boss_count} bosses successfully!")
        
        # Now migrate boss forms
        migrate_boss_forms(sqlite_cursor, azure_cursor)
        
        sqlite_conn.close()
        azure_conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Error migrating bosses: {e}")
        return False

def migrate_boss_forms(sqlite_cursor, azure_cursor):
    """Migrate boss forms"""
    try:
        print("Migrating boss forms...")
        
        sqlite_cursor.execute("SELECT * FROM boss_forms")
        forms = sqlite_cursor.fetchall()
        
        print(f"Found {len(forms)} boss forms to migrate")
        
        # Get column names
        sqlite_cursor.execute("PRAGMA table_info(boss_forms)")
        columns = [col[1] for col in sqlite_cursor.fetchall()][1:]  # Skip ID column
        
        form_count = 0
        for form in forms:
            old_boss_id = form[1]
            
            # Get the boss name from SQLite
            sqlite_cursor.execute("SELECT name FROM bosses WHERE id = ?", (old_boss_id,))
            boss_result = sqlite_cursor.fetchone()
            
            if not boss_result:
                continue
                
            boss_name = boss_result[0]
            
            # Get the new boss_id from Azure SQL
            azure_cursor.execute("SELECT id FROM bosses WHERE name = ?", (boss_name,))
            azure_result = azure_cursor.fetchone()
            
            if not azure_result:
                continue
                
            new_boss_id = azure_result[0]
            
            # Replace the boss_id in the form data
            form_data = list(form[1:])  # Skip SQLite ID
            form_data[0] = new_boss_id  # Replace boss_id
            
            # Create parameterized query
            placeholders = ', '.join(['?' for _ in range(len(columns))])
            insert_columns = ', '.join(columns)
            query = f"INSERT INTO boss_forms ({insert_columns}) VALUES ({placeholders})"
            
            try:
                azure_cursor.execute(query, form_data)
                form_count += 1
                if form_count % 10 == 0:
                    print(f"  Migrated {form_count} boss forms...")
            except Exception as e:
                print(f"✗ Failed to migrate form {form[2]}: {e}")
        
        print(f"✓ Migrated {form_count} boss forms successfully!")
        
    except Exception as e:
        print(f"✗ Error migrating boss forms: {e}")

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
        
        # Get column names (skip the first one which is ID)
        sqlite_cursor.execute("PRAGMA table_info(items)")
        columns = [col[1] for col in sqlite_cursor.fetchall()][1:]  # Skip ID column
        
        item_count = 0
        for item in items:
            item_data = item[1:]  # Skip the SQLite ID
            
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
    
    # Create tables
    if not create_tables():
        return
    
    # Migrate data
    print("\nStarting data migration...")
    
    # Migrate bosses (this also migrates boss forms)
    if migrate_bosses():
        print("✓ Boss migration completed")
    else:
        print("✗ Boss migration failed")
    
    # Migrate items
    if migrate_items():
        print("✓ Item migration completed")
    else:
        print("✗ Item migration failed")
    
    print("\n" + "=" * 50)
    print("Migration completed!")
    print("=" * 50)

if __name__ == "__main__":
    main()