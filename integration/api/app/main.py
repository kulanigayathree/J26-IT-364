"""Ocean AI – Marine Monitoring API.

Run from integration/api:  uvicorn app.main:app --reload   ->  http://localhost:8000/docs
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import auth
from app.db import init_db
from app.routers import c1, c2, c3, c4

app = FastAPI(
    title="Ocean AI – Marine Monitoring API",
    version="1.0.0",
    description="Serves the outputs of the four J26-IT-364 models. Component endpoints need a login token.",
)

origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


@app.get("/health", tags=["Health"])
def health() -> dict:
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(c1.router)
app.include_router(c2.router)
app.include_router(c3.router)
app.include_router(c4.router)
