from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pathlib import Path

class Settings(BaseSettings):
    # Runtime
    ENV: str = "development"
    PORT: int = 8000

    # CORS: comma-separated string, e.g. "http://localhost:5173,http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:5173"

    # OpenAI API Key
    OPENAI_API_KEY: str = ""

    # Slack Integration
    SLACK_BOT_TOKEN: str = ""
    SLACK_CHANNEL_ID: str = ""

    # Feature flags (keep minimal template by default)
    FEATURE_OPENAI: bool = False

    # Load variables from backend/.env
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def cors_origins_list(self) -> List[str]:
        """Convert comma-separated CORS_ORIGINS string to list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()