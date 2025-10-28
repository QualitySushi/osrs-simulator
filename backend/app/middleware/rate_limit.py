import time
from typing import Dict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

class _Bucket:
    __slots__ = ("tokens", "last")
    def __init__(self, tokens: float, last: float):
        self.tokens = tokens
        self.last = last

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rate: int = 10, per_seconds: int = 1, burst: int = 30):
        """
        rate: tokens refilled every per_seconds
        burst: max bucket size
        """
        super().__init__(app)
        self.rate = float(rate)
        self.per_seconds = float(per_seconds)
        self.burst = float(burst)
        self.buckets: Dict[str, _Bucket] = {}

    def _key(self, request: Request) -> str:
        return request.client.host if request.client else "unknown"

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        key = self._key(request)
        now = time.monotonic()
        b = self.buckets.get(key)
        if not b:
            b = _Bucket(tokens=self.burst, last=now)
            self.buckets[key] = b

        # Refill
        elapsed = now - b.last
        b.tokens = min(self.burst, b.tokens + (elapsed * (self.rate / self.per_seconds)))
        b.last = now

        # Spend
        if b.tokens < 1.0:
            raise HTTPException(status_code=429, detail="Too many requests")
        b.tokens -= 1.0

        return await call_next(request)
