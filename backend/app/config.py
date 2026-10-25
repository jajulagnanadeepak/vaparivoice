
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "VoiceStock AI API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"

    mongodb_uri: str
    mongodb_database: str = "voicestock"
    frontend_origins: str = "http://localhost:5173"

    jwt_secret_key: str = Field(min_length=32)
    jwt_access_token_expire_minutes: int = Field(
        default=30,
        ge=5,
        le=1440,
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
