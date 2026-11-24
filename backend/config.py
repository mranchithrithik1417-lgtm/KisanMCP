"""Configuration management loading from environment variables."""

import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file from project root or backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


class Settings(BaseSettings):
    DEMO_MODE: bool = False
    LLM_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    SCALE_OF_FINANCE_PER_ACRE: float = 10000.0
    DATABASE_PATH: str = os.path.join(os.path.dirname(__file__), "kisanclaim.db")
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
