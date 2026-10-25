from pymongo import AsyncMongoClient

from app.config import Settings


def create_mongo_client(settings: Settings) -> AsyncMongoClient:
    return AsyncMongoClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        tz_aware=True,
    )


async def check_database(client: AsyncMongoClient) -> None:
    await client.admin.command("ping")
