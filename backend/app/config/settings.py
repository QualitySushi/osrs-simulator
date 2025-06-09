import os

# TTL for in-memory caches (in seconds)
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "3600"))
