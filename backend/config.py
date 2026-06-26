import os
from pathlib import Path
from dotenv import load_dotenv

# Load env variables relative to config file location
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

class Settings:
    SUPABASE_URL: str = os.getenv("SUPABASE_URL")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY")
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = os.getenv("ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")
    USE_LOCAL_DB: bool = os.getenv("USE_LOCAL_DB", "False").lower() in ("true", "1", "t")

settings = Settings()