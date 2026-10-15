"""
Configuration.

Every credential comes from the environment. A `.env` file at the project root
(one level above `backend/`) is loaded first; variables already present in the
real environment always win. Nothing is hard-coded here.
"""
from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]  # project root (contains .env, backend/, frontend/)
load_dotenv(ROOT / ".env", override=False)
load_dotenv(override=False)  # also honour a .env in the current working directory


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        sys.exit(f"Missing required environment variable {name}. Add it to .env (see .env.example).")
    return value


def _flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    db_host: str
    db_port: int
    db_user: str
    db_password: str
    db_name: str
    db_schema: str
    db_ssl: str            # "require" (default) or "disable"
    db_ssl_ca: Path | None  # optional CA bundle for full certificate verification
    admin_password: str
    session_secret: str
    session_hours: int
    cookie_secure: bool
    trust_proxy: bool
    port: int
    frontend_dist: Path


def load_settings() -> Settings:
    schema = os.environ.get("DB_SCHEMA", "").strip() or "public"
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", schema):
        sys.exit("DB_SCHEMA must be a plain identifier (letters, digits and underscores only).")

    secret = _required("SESSION_SECRET")
    if len(secret) < 32:
        sys.exit("SESSION_SECRET must be at least 32 characters. Generate one with: openssl rand -hex 32")

    ca = os.environ.get("DB_SSL_CA", "").strip()
    return Settings(
        db_host=_required("DB_HOST"),
        db_port=int(os.environ.get("DB_PORT") or 5432),
        db_user=_required("DB_USER"),
        db_password=_required("DB_PASS"),
        db_name=_required("DB_DATABASE"),
        db_schema=schema,
        db_ssl=(os.environ.get("DB_SSL") or "require").strip().lower(),
        db_ssl_ca=(ROOT / ca).resolve() if ca else None,
        admin_password=_required("ADMIN_PASSWORD"),
        session_secret=secret,
        session_hours=int(os.environ.get("SESSION_HOURS") or 12),
        cookie_secure=_flag("COOKIE_SECURE"),
        trust_proxy=_flag("TRUST_PROXY"),
        port=int(os.environ.get("PORT") or 3000),
        frontend_dist=ROOT / "frontend" / "dist",
    )


settings = load_settings()
