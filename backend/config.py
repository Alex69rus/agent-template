"""Configuration management for the realtime voice agent."""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Application configuration loaded from environment variables."""

    # OpenAI Settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    MODEL: str = os.getenv("MODEL", "gpt-4o-realtime-preview-2024-12-17")
    VOICE: str = os.getenv("VOICE", "alloy")

    # Server Settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Frontend Settings
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # OpenAI Realtime API
    REALTIME_API_URL: str = f"wss://api.openai.com/v1/realtime?model={MODEL}"

    @classmethod
    def validate(cls) -> None:
        """Validate required configuration."""
        if not cls.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required in .env file")

    @classmethod
    def get_headers(cls) -> dict:
        """Get headers for OpenAI Realtime API connection."""
        return {
            "Authorization": f"Bearer {cls.OPENAI_API_KEY}",
            "OpenAI-Beta": "realtime=v1"
        }


# Validate configuration on import
Config.validate()
