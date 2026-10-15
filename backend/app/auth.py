"""Admin authentication: password check, HMAC-signed session cookie and a small rate limiter."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time

from fastapi import Request, Response

from .config import settings

COOKIE_NAME = "niveshaay_admin"


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _sign(data: str) -> str:
    return _b64(hmac.new(settings.session_secret.encode(), data.encode(), hashlib.sha256).digest())


def create_session() -> str:
    payload = {"exp": int(time.time()) + settings.session_hours * 3600, "nonce": secrets.token_hex(8)}
    data = _b64(json.dumps(payload, separators=(",", ":")).encode())
    return f"{data}.{_sign(data)}"


def read_session(token: str | None) -> dict | None:
    if not token or "." not in token:
        return None
    data, _, sig = token.rpartition(".")
    if not hmac.compare_digest(sig, _sign(data)):
        return None
    try:
        payload = json.loads(_unb64(data))
    except (ValueError, UnicodeDecodeError):
        return None
    return payload if isinstance(payload, dict) and payload.get("exp", 0) > time.time() else None


def is_authenticated(request: Request) -> bool:
    return read_session(request.cookies.get(COOKIE_NAME)) is not None


def set_session_cookie(request: Request, response: Response, value: str, max_age: int) -> None:
    response.set_cookie(
        COOKIE_NAME,
        value,
        max_age=max_age,
        path="/",
        httponly=True,
        samesite="strict",
        secure=settings.cookie_secure or request.url.scheme == "https",
    )


def password_matches(given: object) -> bool:
    a = hashlib.sha256(str(given if given is not None else "").encode()).digest()
    b = hashlib.sha256(settings.admin_password.encode()).digest()
    return hmac.compare_digest(a, b)


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


class RateLimiter:
    """Fixed-window limiter per client IP, kept in memory (one process)."""

    def __init__(self, window_seconds: int, max_hits: int, message: str) -> None:
        self.window = window_seconds
        self.max_hits = max_hits
        self.message = message
        self._hits: dict[str, tuple[int, float]] = {}

    def check(self, request: Request) -> int | None:
        """Return seconds to wait if the client is over the limit, otherwise None."""
        now = time.time()
        if len(self._hits) > 5000:
            self._hits = {k: v for k, v in self._hits.items() if v[1] > now}
        key = client_ip(request)
        count, reset_at = self._hits.get(key, (0, 0.0))
        if reset_at <= now:
            count, reset_at = 0, now + self.window
        count += 1
        self._hits[key] = (count, reset_at)
        return int(reset_at - now) + 1 if count > self.max_hits else None
