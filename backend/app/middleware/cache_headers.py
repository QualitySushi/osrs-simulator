from typing import Dict, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

class CacheHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, path_ttls: Dict[str, int], default_ttl: Optional[int] = None):
        super().__init__(app)
        self.path_ttls = path_ttls
        self.default_ttl = default_ttl

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response: Response = await call_next(request)
        ttl = None

        # Exact-path matching; extend to prefix matching if needed
        if request.url.path in self.path_ttls:
            ttl = self.path_ttls[request.url.path]
        elif self.default_ttl is not None:
            ttl = self.default_ttl

        if ttl:
            response.headers["Cache-Control"] = f"public, max-age={ttl}"
        return response
