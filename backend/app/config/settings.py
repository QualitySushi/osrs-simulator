import os

# TTL for in-memory caches (in seconds)
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "3600"))

# Database connection pool settings
# Ensure the pool size is always at least 1 to avoid pool errors
try:
    DB_POOL_SIZE = max(1, int(os.getenv("DB_POOL_SIZE", "5")))
except ValueError:
    # Fallback to default if the environment variable is not an integer
    DB_POOL_SIZE = 5
DB_CONNECTION_TIMEOUT = int(os.getenv("DB_CONNECTION_TIMEOUT", "30"))
DB_MAX_RETRIES = int(os.getenv("DB_MAX_RETRIES", "3"))
