import sqlite3
import pyodbc
import os

# ===== UPDATE THESE WITH YOUR AZURE SQL DATABASE DETAILS =====
AZURE_SQL_SERVER = "scapelab-db.database.windows.net"
AZURE_SQL_DATABASE = "ScapeLab-db"

# Entra ID authentication connection string
AZURE_SQL_CONNECTION = (
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={AZURE_SQL_SERVER};"
    f"DATABASE={AZURE_SQL_DATABASE};"
    f"Authentication=ActiveDirectoryInteractive;"
    f"Encrypt=yes;"
    f"TrustServerCertificate=no;"
    f"Connection Timeout=30;"
)

# SQLite database file paths
SQLITE_BOSSES_DB = "osrs_bosses.db"

def test_azure_connection():
    """Test connection to Azure SQL Database using Entra ID"""
    try:
        print("Testing Azure SQL Database connection with Entra ID...")
        conn = pyodbc.connect(AZURE_SQL_CONNECTION)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()
        print("✓ Azure SQL Database connection successful!")
        return True
    except Exception as e:
        print(f"✗ Azure SQL Database connection failed: {e}")
        return False

def check_boss_forms_status():
    """Check current status of boss forms migration"""
    try:
        print("Checking current migration status...")
        
        # Connect to SQLite
        sqlite_conn = sqlite3.connect(SQLITE_BOSSES_DB)
        sqlite_cursor = sqlite_conn.cursor()
        
        # Connect to Azure SQL
        azure_conn = pyodbc.connect(AZURE_SQL_CONNECTION)
        azure_cursor = azure_conn.cursor()
        
        # Count records in SQLite
        sqlite_cursor.execute("SELECT COUNT(*) FROM boss_forms")
        sqlite_count = sqlite_cursor.fetchone()[0]
        
        # Count records in Azure SQL
        azure_cursor.execute("SELECT COUNT(*) FROM boss_forms")
        azure_count = azure_cursor.fetchone()[0]
        
        print(f"SQLite boss_forms: {sqlite_count} records")
        print(f"Azure SQL boss_forms: {azure_count} records")
        
        sqlite_conn.close()
        azure_conn.close()
        
        return sqlite_count, azure_count
        
    except Exception as e:
        print(f"✗ Error checking status: {e}")
        return 0, 0

def migrate_boss_forms_standalone():
    """Migrate boss forms from SQLite to Azure SQL (standalone function)"""
    try:
        print("Starting boss forms migration...")
        
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
        
        # Clear existing boss_forms data in Azure SQL (in case of partial migration)
        print("Clearing existing boss_forms data in Azure SQL...")
        azure_cursor.execute("DELETE FROM boss_forms")
        azure_conn.commit()
        
        # Get boss forms from SQLite
        sqlite_cursor.execute("SELECT * FROM boss_forms")
        forms = sqlite_cursor.fetchall()
        
        print(f"Found {len(forms)} boss forms to migrate")
        
        if len(forms) == 0:
            print("No boss forms found in SQLite database")
            return True
        
        # Get column names (skip the first one which is ID)
        sqlite_cursor.execute("PRAGMA table_info(boss_forms)")
        columns = [col[1] for col in sqlite_cursor.fetchall()][1:]  # Skip ID column
        
        print(f"Columns to migrate: {columns}")
        
        form_count = 0
        failed_count = 0
        
        for form in forms:
            old_boss_id = form[1]  # boss_id is the second column after id
            
            # Get the boss name from SQLite
            sqlite_cursor.execute("SELECT name FROM bosses WHERE id = ?", (old_boss_id,))
            boss_result = sqlite_cursor.fetchone()
            
            if not boss_result:
                print(f"Warning: Boss with ID {old_boss_id} not found in SQLite")
                failed_count += 1
                continue
                
            boss_name = boss_result[0]
            
            # Get the new boss_id from Azure SQL
            azure_cursor.execute("SELECT id FROM bosses WHERE name = ?", (boss_name,))
            azure_result = azure_cursor.fetchone()
            
            if not azure_result:
                print(f"Warning: Boss '{boss_name}' not found in Azure SQL")
                failed_count += 1
                continue
                
            new_boss_id = azure_result[0]
            
            # Replace the boss_id in the form data
            form_data = list(form[1:])  # Skip SQLite ID
            form_data[0] = new_boss_id  # Replace boss_id with new Azure SQL boss_id
            
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
                print(f"✗ Failed to migrate form for boss '{boss_name}': {e}")
                failed_count += 1
        
        # Commit all changes
        azure_conn.commit()
        
        print(f"✓ Migration completed!")
        print(f"  Successfully migrated: {form_count} boss forms")
        print(f"  Failed: {failed_count} boss forms")
        
        sqlite_conn.close()
        azure_conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Error migrating boss forms: {e}")
        return False

def verify_migration():
    """Verify the migration was successful"""
    try:
        print("\nVerifying migration...")
        
        # Connect to Azure SQL
        azure_conn = pyodbc.connect(AZURE_SQL_CONNECTION)
        azure_cursor = azure_conn.cursor()
        
        # Get some sample data
        azure_cursor.execute("""
            SELECT TOP 5 
                bf.form_name, 
                b.name as boss_name,
                bf.combat_level,
                bf.hitpoints
            FROM boss_forms bf
            JOIN bosses b ON bf.boss_id = b.id
            ORDER BY b.name
        """)
        
        results = azure_cursor.fetchall()
        
        if results:
            print("✓ Sample migrated data:")
            for row in results:
                print(f"  {row[1]} - {row[0]} (Level: {row[2]}, HP: {row[3]})")
        else:
            print("✗ No data found in boss_forms table")
        
        azure_conn.close()
        
    except Exception as e:
        print(f"✗ Error verifying migration: {e}")

def main():
    """Main function to migrate boss forms"""
    print("=" * 50)
    print("Boss Forms Migration to Azure SQL Database")
    print("=" * 50)
    
    # Test Azure connection
    if not test_azure_connection():
        return
    
    # Check current status
    sqlite_count, azure_count = check_boss_forms_status()
    
    if azure_count > 0:
        response = input(f"\nAzure SQL already has {azure_count} boss forms. Continue and replace them? (y/n): ")
        if response.lower() != 'y':
            print("Migration cancelled.")
            return
    
    # Migrate boss forms
    if migrate_boss_forms_standalone():
        print("✓ Boss forms migration completed successfully!")
        verify_migration()
    else:
        print("✗ Boss forms migration failed")
    
    print("\n" + "=" * 50)
    print("Migration process completed!")
    print("=" * 50)

if __name__ == "__main__":
    main()