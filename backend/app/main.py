
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pymongo import AsyncMongoClient
from pymongo.errors import PyMongoError

from app.auth import router as auth_router
from app.config import get_settings
from app.database import check_database, create_mongo_client
from app.products import router as products_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = create_mongo_client(settings)
    app.state.mongo_client = client
    app.state.db = client[settings.mongodb_database]

    try:
        await app.state.db.users.create_index("email", unique=True)
        await app.state.db.users.create_index("shop_id")
        await app.state.db.shops.create_index("owner_user_id")
        await app.state.db.products.create_index(
    [("shop_id", 1), ("sku", 1)],
    unique=True,
    name="unique_sku_per_shop",
)
        await app.state.db.products.create_index(
    [("shop_id", 1), ("created_at", -1)],
    name="products_by_shop_and_date",
)
        yield
    finally:
        await client.close()


app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description="VoiceStock AI API — authentication foundation.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)

app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(products_router, prefix=settings.api_v1_prefix)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "message": "VoiceStock AI API is running",
        "docs": "/docs",
    }


@app.get("/health/live")
async def liveness():
    return {"status": "alive"}


@app.get("/health/ready")
async def readiness(request: Request):
    client: AsyncMongoClient = request.app.state.mongo_client

    try:
        await check_database(client)
        return {"status": "ready", "database": "connected"}
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail={"status": "not_ready", "database": "unavailable"},
        ) from None
