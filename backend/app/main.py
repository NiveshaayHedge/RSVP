"""
Niveshaay office-opening RSVP — API and static server.

Routes
  POST   /api/rsvp                 submit or change an RSVP (public)
  POST   /api/admin/login          password sign-in, sets a signed HttpOnly cookie
  POST   /api/admin/logout
  GET    /api/admin/session        {"authenticated": bool}
  GET    /api/admin/rsvps          guest list + stats (admin)
  GET    /api/admin/rsvps.csv      CSV download (admin)
  DELETE /api/admin/rsvps/{id}     remove an entry (admin)
  GET    /api/health
  GET    /{anything}               the built React app (frontend/dist)
"""
from __future__ import annotations

import csv
import io
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles

from . import auth, db
from .config import settings

IST = ZoneInfo("Asia/Kolkata")


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.pool.open()
    try:
        db.migrate()
    except Exception as exc:  # noqa: BLE001 - surface a clear message and stop
        print(f"Could not prepare the database: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    print(f"Invitation → http://localhost:{settings.port}")
    print(f"Admin      → http://localhost:{settings.port}/admin")
    yield
    db.pool.close()


app = FastAPI(title="Niveshaay RSVP", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; "
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = CSP
    return response


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    print(f"Unhandled error on {request.method} {request.url.path}: {exc!r}", file=sys.stderr)
    return JSONResponse({"error": "Something went wrong on our side. Please try again."}, status_code=500)


def error(message: str, status: int, **extra) -> JSONResponse:
    return JSONResponse({"error": message, **extra}, status_code=status)


async def json_body(request: Request) -> dict | None:
    body = await request.body()
    if len(body) > 10_000:
        return None
    try:
        data = __import__("json").loads(body or b"{}")
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


rsvp_limiter = auth.RateLimiter(10 * 60, 60, "Too many RSVPs from this connection. Please try again in a few minutes.")
login_limiter = auth.RateLimiter(15 * 60, 10, "Too many sign-in attempts. Please wait 15 minutes and try again.")


def limited(limiter: auth.RateLimiter, request: Request) -> JSONResponse | None:
    wait = limiter.check(request)
    if wait is None:
        return None
    resp = error(limiter.message, 429)
    resp.headers["Retry-After"] = str(wait)
    return resp


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    try:
        db.ping()
    except Exception:  # noqa: BLE001
        return JSONResponse({"ok": False, "error": "Database unavailable"}, status_code=503)
    return {"ok": True}


@app.post("/api/rsvp")
async def create_rsvp(request: Request):
    if (resp := limited(rsvp_limiter, request)) is not None:
        return resp
    body = await json_body(request)
    if body is None:
        return error("Invalid request body.", 400)
    errors, value, previous = db.validate_rsvp(body)
    if errors:
        return error(errors[0], 400, errors=errors)
    row = db.save_rsvp(value, previous)
    return JSONResponse(jsonable_encoder({"ok": True, "rsvp": row}), status_code=201)


@app.post("/api/admin/login")
async def admin_login(request: Request):
    if (resp := limited(login_limiter, request)) is not None:
        return resp
    body = await json_body(request)
    if body is None or not auth.password_matches(body.get("password")):
        return error("That password is not right.", 401)
    response = JSONResponse({"ok": True})
    auth.set_session_cookie(request, response, auth.create_session(), settings.session_hours * 3600)
    return response


@app.post("/api/admin/logout")
def admin_logout(request: Request):
    response = JSONResponse({"ok": True})
    auth.set_session_cookie(request, response, "", 0)
    return response


@app.get("/api/admin/session")
def admin_session(request: Request):
    return JSONResponse({"authenticated": auth.is_authenticated(request)}, headers={"Cache-Control": "no-store"})


@app.get("/api/admin/rsvps")
def admin_list(request: Request):
    if not auth.is_authenticated(request):
        return error("Please sign in.", 401)
    return JSONResponse(jsonable_encoder(db.list_rsvps()), headers={"Cache-Control": "no-store"})


def _ist(value: datetime) -> str:
    return value.astimezone(IST).strftime("%d/%m/%Y %H:%M")


def _csv_safe(value: object) -> str:
    text = "" if value is None else str(value)
    # Neutralise spreadsheet formula injection; a plain phone number such as "+91 98…" is harmless.
    if text[:1] in "=+-@\t\r" and not re_phone.match(text):
        text = "'" + text
    return text


re_phone = db.PHONE_RE


@app.get("/api/admin/rsvps.csv")
def admin_csv(request: Request):
    if not auth.is_authenticated(request):
        return error("Please sign in.", 401)
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\r\n")
    writer.writerow(["Name", "Phone", "Party", "First RSVP (IST)", "Last updated (IST)"])
    for r in db.list_rsvps()["rsvps"]:
        writer.writerow([_csv_safe(r["name"]), _csv_safe(r["phone"]), r["guests"], _ist(r["created_at"]), _ist(r["updated_at"])])
    return Response(
        "﻿" + buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="niveshaay-rsvps.csv"', "Cache-Control": "no-store"},
    )


@app.delete("/api/admin/rsvps/{rsvp_id}")
def admin_delete(rsvp_id: str, request: Request):
    if not auth.is_authenticated(request):
        return error("Please sign in.", 401)
    if not rsvp_id.isdigit() or int(rsvp_id) <= 0:
        return error("Invalid id.", 400)
    if not db.delete_rsvp(int(rsvp_id)):
        return error("That RSVP no longer exists.", 404)
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# React app (frontend/dist) — must come after the API routes
# ---------------------------------------------------------------------------
DIST = settings.frontend_dist
if (DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.get("/{path:path}", include_in_schema=False)
def spa(path: str):
    if path == "api" or path.startswith("api/"):
        return error("Not found", 404)
    if not (DIST / "index.html").is_file():
        return PlainTextResponse("Frontend not built yet. Run `npm run build` inside frontend/.", status_code=503)
    if path:
        candidate = (DIST / path).resolve()
        if candidate.is_file() and DIST.resolve() in candidate.parents:
            return FileResponse(candidate, headers={"Cache-Control": "public, max-age=86400"})
    return FileResponse(DIST / "index.html", headers={"Cache-Control": "no-store"})
