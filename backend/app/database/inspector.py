from sqlalchemy import inspect
from app.database.connection import db_manager
import logging

logger = logging.getLogger("dialectdb.inspector")

def inspect_database_schema() -> dict:
    """
    Inspects the active database schema and returns a dictionary listing:
    - Tables
    - Columns (name, type, nullable, default)
    - Primary keys
    - Foreign keys (constrained_columns, referred_table, referred_columns)
    Works with SQLite, PostgreSQL, MySQL, and Microsoft SQL Server.
    """
    try:
        engine = db_manager.get_engine()
        inspector = inspect(engine)
        schema = {}

        table_names = inspector.get_table_names()
        for table_name in table_names:
            columns = []
            for col in inspector.get_columns(table_name):
                columns.append({
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col["nullable"],
                    "default": str(col.get("default")) if col.get("default") is not None else None
                })

            pk_constraint = inspector.get_pk_constraint(table_name)
            primary_keys = pk_constraint.get("constrained_columns", [])

            foreign_keys = []
            for fk in inspector.get_foreign_keys(table_name):
                foreign_keys.append({
                    "constrained_columns": fk["constrained_columns"],
                    "referred_table": fk["referred_table"],
                    "referred_columns": fk["referred_columns"]
                })

            indexes = []
            try:
                for idx in inspector.get_indexes(table_name):
                    indexes.append({
                        "name": idx["name"],
                        "column_names": idx["column_names"],
                        "unique": idx["unique"]
                    })
            except Exception:
                pass

            schema[table_name] = {
                "columns": columns,
                "primary_keys": primary_keys,
                "foreign_keys": foreign_keys,
                "indexes": indexes
            }

        return schema
    except Exception as e:
        logger.error(f"Error inspecting database schema: {str(e)}")
        raise e
