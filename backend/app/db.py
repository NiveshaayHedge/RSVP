"""Database access: connection pool, schema setup and all RSVP queries."""
from __future__ import annotations

import re
from typing import Any

from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import settings

SCHEMA = sql.Identifier(settings.db_schema)
TABLE = sql.SQL("{}.rsvps").format(SCHEMA)
COLUMNS = sql.SQL("id, name, phone, party_size AS guests, travelling, created_at, updated_at")


def _conninfo() -> str:
    params: dict[str, Any] = {
        "host": settings.db_host,
        "port": settings.db_port,
        "user": settings.db_user,
        "password": settings.db_password,
        "dbname": settings.db_name,
        "connect_timeout": 10,
    }
    if settings.db_ssl == "disable":
        params["sslmode"] = "disable"
    elif settings.db_ssl_ca:
        # Full certificate verification against the provided CA bundle (e.g. AWS global-bundle.pem)
        params["sslmode"] = "verify-full"
        params["sslrootcert"] = str(settings.db_ssl_ca)
    else:
        # Managed databases (AWS Lightsail / RDS) require TLS. The link is encrypted,
        # but without a CA bundle the certificate chain is not verified.
        params["sslmode"] = "require"
    return make_conninfo(**params)


pool = ConnectionPool(_conninfo(), min_size=1, max_size=5, open=False, kwargs={"row_factory": dict_row})


def migrate() -> None:
    """Create the schema/table on first start. Safe to run on every start."""
    with pool.connection() as conn:
        conn.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(SCHEMA))
        conn.execute(
            sql.SQL(
                """
                CREATE TABLE IF NOT EXISTS {t} (
                    id           BIGSERIAL PRIMARY KEY,
                    name         TEXT        NOT NULL,
                    phone        TEXT        NOT NULL,
                    phone_digits TEXT        NOT NULL UNIQUE,
                    party_size   SMALLINT    NOT NULL CHECK (party_size BETWEEN 1 AND 5),
                    travelling   TEXT        CHECK (travelling IN ('Yes', 'No')),
                    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            ).format(t=TABLE)
        )
        # An earlier version allowed a party of 1-2 only; the form now offers "Me + 1" to "Me + 4".
        conn.execute(sql.SQL("ALTER TABLE {t} DROP CONSTRAINT IF EXISTS rsvps_party_size_check").format(t=TABLE))
        conn.execute(
            sql.SQL("ALTER TABLE {t} ADD CONSTRAINT rsvps_party_size_check CHECK (party_size BETWEEN 1 AND 5)").format(t=TABLE)
        )
        # The "travelling from outside Surat" question was dropped from the form; keep old answers, allow NULL.
        conn.execute(sql.SQL("ALTER TABLE {t} ALTER COLUMN travelling DROP NOT NULL").format(t=TABLE))


def ping() -> None:
    with pool.connection() as conn:
        conn.execute("SELECT 1")


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
MAX_PARTY = 5
PHONE_RE = re.compile(r"^[+\d\s().-]+$")


def normalise_phone(raw: str) -> str:
    """Digits only, no leading zeros; a bare 10-digit Indian mobile gets the 91 prefix so '+91 98…' and '98…' match."""
    digits = re.sub(r"\D", "", str(raw)).lstrip("0")
    if len(digits) == 10:
        digits = "91" + digits
    return digits


def validate_rsvp(body: Any) -> tuple[list[str], dict[str, Any], str | None]:
    body = body if isinstance(body, dict) else {}
    errors: list[str] = []

    name = re.sub(r"\s+", " ", str(body.get("name") or "")).strip()
    phone = str(body.get("phone") or "").strip()
    travelling = body.get("travelling")
    travelling = None if travelling in (None, "") else str(travelling)
    try:
        guests = int(body.get("guests"))
    except (TypeError, ValueError):
        guests = 0

    if not name:
        errors.append("Please add your name.")
    elif len(name) > 80:
        errors.append("Please keep your name under 80 characters.")

    digits = re.sub(r"\D", "", phone)
    if not PHONE_RE.match(phone) or len(phone) > 20 or not (10 <= len(digits) <= 15):
        errors.append("Please add a phone number with at least 10 digits.")
    if not (1 <= guests <= MAX_PARTY):
        errors.append("Please choose how many people are attending.")
    if travelling is not None and travelling not in ("Yes", "No"):
        errors.append("Travelling must be Yes or No.")

    previous = body.get("previousPhone")
    previous_digits = normalise_phone(previous) if previous else None
    value = {"name": name, "phone": phone, "phone_digits": normalise_phone(phone), "guests": guests, "travelling": travelling}
    return errors, value, previous_digits


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------
def save_rsvp(v: dict[str, Any], previous_digits: str | None) -> dict[str, Any]:
    """
    Insert or update an RSVP: one row per phone number.
    If the guest changed their number ("Change my RSVP"), the old row is moved instead of duplicated.
    """
    with pool.connection() as conn, conn.transaction():
        row = None
        if previous_digits and previous_digits != v["phone_digits"]:
            found = conn.execute(
                sql.SQL("SELECT id, phone_digits FROM {t} WHERE phone_digits = ANY(%s)").format(t=TABLE),
                ([previous_digits, v["phone_digits"]],),
            ).fetchall()
            prev = next((r for r in found if r["phone_digits"] == previous_digits), None)
            current = next((r for r in found if r["phone_digits"] == v["phone_digits"]), None)
            if prev and not current:
                row = conn.execute(
                    sql.SQL(
                        """
                        UPDATE {t}
                           SET name = %s, phone = %s, phone_digits = %s, party_size = %s, travelling = %s, updated_at = now()
                         WHERE id = %s
                     RETURNING {c}
                        """
                    ).format(t=TABLE, c=COLUMNS),
                    (v["name"], v["phone"], v["phone_digits"], v["guests"], v["travelling"], prev["id"]),
                ).fetchone()
            elif prev and current:
                conn.execute(sql.SQL("DELETE FROM {t} WHERE id = %s").format(t=TABLE), (prev["id"],))

        if row is None:
            row = conn.execute(
                sql.SQL(
                    """
                    INSERT INTO {t} (name, phone, phone_digits, party_size, travelling)
                         VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (phone_digits) DO UPDATE
                            SET name = EXCLUDED.name, phone = EXCLUDED.phone, party_size = EXCLUDED.party_size,
                                travelling = EXCLUDED.travelling, updated_at = now()
                      RETURNING {c}
                    """
                ).format(t=TABLE, c=COLUMNS),
                (v["name"], v["phone"], v["phone_digits"], v["guests"], v["travelling"]),
            ).fetchone()
        return dict(row)


def list_rsvps() -> dict[str, Any]:
    with pool.connection() as conn:
        rows = [dict(r) for r in conn.execute(sql.SQL("SELECT {c} FROM {t} ORDER BY updated_at DESC, id DESC").format(c=COLUMNS, t=TABLE))]
    stats = {
        "count": len(rows),
        "headcount": sum(int(r["guests"] or 1) for r in rows),
    }
    return {"rsvps": rows, "stats": stats}


def delete_rsvp(rsvp_id: int) -> bool:
    with pool.connection() as conn:
        cur = conn.execute(sql.SQL("DELETE FROM {t} WHERE id = %s").format(t=TABLE), (rsvp_id,))
        return cur.rowcount > 0
