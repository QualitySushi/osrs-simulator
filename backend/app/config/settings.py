import os

# TTL for in-memory caches (in seconds)
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "3600"))

# Database connection settings
DB_CONNECTION_TIMEOUT = int(os.getenv("DB_CONNECTION_TIMEOUT", "30"))
DB_MAX_RETRIES = int(os.getenv("DB_MAX_RETRIES", "3"))
