# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging
import os
from pathlib import Path

logger = logging.getLogger("dialectdb.connection")

class DatabaseManager:
    def __init__(self):
        self.engine = None
        self.SessionLocal = None
        self.current_url = None

    def connect(self, db_url: str):
        """
        Connects to a database using the provided URL.
        Supports standard SQLAlchemy connection strings.
        Automatically detects local file paths and prefixes them with sqlite:///
        """
        try:
            # Clean connection string
            db_url = db_url.strip()
            
            # Check if it lacks a database protocol prefix (e.g. "dialectdb.db" or "D:\path\to\db")
            if not (db_url.startswith("sqlite://") or 
                    db_url.startswith("postgresql://") or 
                    db_url.startswith("mysql") or 
                    db_url.startswith("mssql") or 
                    db_url.startswith("oracle")):
                
                # If it looks like a file path or a simple name, auto-prefix with sqlite:///
                # Also convert backslashes to forward slashes for SQLAlchemy
                clean_path = db_url.replace("\\", "/")
                
                # If it's a relative path, we resolve it to absolute path to avoid ambiguity
                if not (clean_path.startswith("/") or (len(clean_path) > 1 and clean_path[1] == ":")):
                    # Make it absolute relative to workspace root if running locally
                    base_path = Path("d:/Projects_Main/dialectdb")
                    resolved_path = (base_path / clean_path).resolve().as_posix()
                    db_url = f"sqlite:///{resolved_path}"
                else:
                    db_url = f"sqlite:///{clean_path}"
            
            # For MySQL, map mysql:// to mysql+pymysql://
            if db_url.startswith("mysql://"):
                db_url = db_url.replace("mysql://", "mysql+pymysql://")
            
            logger.info(f"Attempting connection to: {db_url.split('@')[-1] if '@' in db_url else db_url}")
            
            connect_args = {}
            if db_url.startswith("sqlite"):
                connect_args = {"check_same_thread": False}
                
            engine = create_engine(db_url, connect_args=connect_args)
            
            # Verify connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                conn.commit()
            
            self.engine = engine
            self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            self.current_url = db_url
            logger.info("Successfully connected to database.")
            return True, "Connected successfully"
        except Exception as e:
            logger.error(f"Failed to connect to database: {str(e)}")
            return False, str(e)

    def get_engine(self):
        if not self.engine:
            raise Exception("Database engine not initialized. Please connect to database.")
        return self.engine

db_manager = DatabaseManager()
