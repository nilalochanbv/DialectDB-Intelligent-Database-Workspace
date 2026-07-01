import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

GEMINI_API_KEY = None
ANTHROPIC_API_KEY = None

env_txt_path = BASE_DIR / ".env.txt"
if env_txt_path.exists():
    with open(env_txt_path, "r", encoding="utf-8") as f:
        for line in f:
            if "gemini" in line.lower() and "==" in line:
                GEMINI_API_KEY = line.split("==", 1)[1].strip()
            elif "anthropic" in line.lower() and "==" in line:
                ANTHROPIC_API_KEY = line.split("==", 1)[1].strip()

if not GEMINI_API_KEY:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not ANTHROPIC_API_KEY:
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

DEFAULT_DB_PATH = BASE_DIR / "dialectdb.db"
# We make sure the SQLite database URI uses 3 slashes on Windows for absolute path
# e.g. sqlite:///D:/Projects_Main/dialectdb/dialectdb.db
db_path_str = str(DEFAULT_DB_PATH.as_posix())
DATABASE_URL = f"sqlite:///{db_path_str}"
