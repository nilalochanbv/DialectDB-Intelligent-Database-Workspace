from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import os
from pathlib import Path
import traceback

from app.config import DATABASE_URL, DEFAULT_DB_PATH
from app.database.connection import db_manager
from app.database.inspector import inspect_database_schema
from app.database.executor import execute_raw_sql, get_query_execution_plan
from app.database.init_db import create_and_seed_demo_db
from app.services.validation import is_safe_sql
from app.services.assistant import run_ai_assistant
from app.services.explain import explain_sql_query
from app.services.optimize import optimize_sql_query
from app.services.dashboard import get_dashboard_stats

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dialectdb.main")

app = FastAPI(title="DialectDB API", description="AI Database Assistant API Backend")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to verify database existence or initialize it
@app.on_event("startup")
def startup_event():
    if not DEFAULT_DB_PATH.exists():
        logger.info(f"Demo database not found at {DEFAULT_DB_PATH}. Creating and seeding...")
        try:
            create_and_seed_demo_db()
        except Exception as e:
            logger.error(f"Failed to seed demo database: {str(e)}")
            
    success, msg = db_manager.connect(DATABASE_URL)
    if success:
        logger.info("Successfully connected to default SQLite database.")
    else:
        logger.error(f"Failed to connect to default SQLite database: {msg}")

# Pydantic Schemas for Requests
class QueryRequest(BaseModel):
    sql: str
    allow_write: bool = False

class ChatRequest(BaseModel):
    message: str
    history: list = []
    allow_write: bool = False
    provider: str = "gemini"
    model: str = "gemini-2.5-flash"

class ConnectRequest(BaseModel):
    url: str

class ActionRequest(BaseModel):
    sql: str
    provider: str = "gemini"
    model: str = "gemini-2.5-flash"

@app.get("/api/status")
def get_status():
    from app.config import GEMINI_API_KEY, ANTHROPIC_API_KEY
    if db_manager.engine:
        return {
            "connected": True,
            "dialect": db_manager.engine.dialect.name,
            "url": db_manager.current_url.split("/")[-1] if "/" in db_manager.current_url else db_manager.current_url,
            "gemini_configured": GEMINI_API_KEY is not None,
            "anthropic_configured": ANTHROPIC_API_KEY is not None
        }
    return {
        "connected": False,
        "dialect": None,
        "url": None,
        "gemini_configured": GEMINI_API_KEY is not None,
        "anthropic_configured": ANTHROPIC_API_KEY is not None
    }

@app.post("/api/connect")
def connect_database(req: ConnectRequest):
    success, msg = db_manager.connect(req.url)
    if not success:
        raise HTTPException(status_code=400, detail=f"Database connection failed: {msg}")
    
    try:
        schema = inspect_database_schema()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connected, but schema inspection failed: {str(e)}")
        
    return {
        "success": True,
        "dialect": db_manager.engine.dialect.name,
        "message": "Connected successfully.",
        "tables_count": len(schema)
    }

@app.post("/api/upload-db")
async def upload_database(file: UploadFile = File(...)):
    """
    Saves an uploaded SQLite database file locally in the workspace directory 
    and establishes a dynamic connection.
    """
    if not (file.filename.endswith(".db") or file.filename.endswith(".sqlite") or file.filename.endswith(".sqlite3")):
        raise HTTPException(status_code=400, detail="Invalid database file type. Please upload a SQLite file (.db, .sqlite, .sqlite3)")
        
    try:
        target_path = DEFAULT_DB_PATH.parent / file.filename
        with open(target_path, "wb") as f:
            f.write(await file.read())
            
        db_url = f"sqlite:///{target_path.as_posix()}"
        success, msg = db_manager.connect(db_url)
        if not success:
            raise HTTPException(status_code=400, detail=f"Uploaded database, but connection failed: {msg}")
            
        schema = inspect_database_schema()
        return {
            "success": True,
            "dialect": "sqlite",
            "url": file.filename,
            "tables_count": len(schema)
        }
    except Exception as e:
        logger.error(f"Failed to upload and connect SQLite db: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload and connection failed: {str(e)}")

@app.get("/api/schema")
def get_schema():
    try:
        schema = inspect_database_schema()
        return schema
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve database schema: {str(e)}")

@app.post("/api/query")
def run_query(req: QueryRequest):
    if not req.allow_write:
        is_safe, error_msg = is_safe_sql(req.sql)
        if not is_safe:
            raise HTTPException(status_code=403, detail=error_msg)
            
    try:
        result = execute_raw_sql(req.sql)
        plan = None
        if req.sql.strip().lower().startswith("select") or req.sql.strip().lower().startswith("with"):
            plan = get_query_execution_plan(req.sql)
            
        result["execution_plan"] = plan
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/ai/chat")
async def chat_assistant(req: ChatRequest):
    try:
        data = await run_ai_assistant(req.message, req.history, req.allow_write, req.provider, req.model)
        return data
    except Exception as e:
        err_msg = f"AI Assistant pipeline failed: {str(e)}\n{traceback.format_exc()}"
        logger.error(err_msg)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/explain")
async def explain_query(req: ActionRequest):
    try:
        schema = inspect_database_schema()
        dialect = db_manager.engine.dialect.name if db_manager.engine else "sqlite"
        plan = get_query_execution_plan(req.sql)
        explanation = await explain_sql_query(req.sql, schema, dialect, plan, req.provider, req.model)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/optimize")
async def optimize_query(req: ActionRequest):
    try:
        schema = inspect_database_schema()
        dialect = db_manager.engine.dialect.name if db_manager.engine else "sqlite"
        optimization = await optimize_sql_query(req.sql, schema, dialect, req.provider, req.model)
        return {"optimization": optimization}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/stats")
def get_dashboard_metrics():
    return get_dashboard_stats()
