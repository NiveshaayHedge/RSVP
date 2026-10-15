"""Start the server:  python run.py   (reads PORT and the database settings from ../.env)"""
import os

import uvicorn

from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=os.environ.get("HOST", "0.0.0.0"),
        port=settings.port,
        proxy_headers=settings.trust_proxy,
        forwarded_allow_ips="*" if settings.trust_proxy else None,
        reload=os.environ.get("RELOAD", "").lower() in {"1", "true"},
    )
