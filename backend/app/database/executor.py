from sqlalchemy import text
from app.database.connection import db_manager
import time
import logging
from decimal import Decimal

logger = logging.getLogger("dialectdb.executor")

def execute_raw_sql(sql_query: str) -> dict:
    """
    Executes a raw SQL query on the active database engine.
    Returns:
    - columns: List of column names
    - rows: List of lists containing serialized values
    - execution_time_ms: float (duration of query)
    - row_count: int
    """
    engine = db_manager.get_engine()
    start_time = time.time()
    
    with engine.connect() as conn:
        result = conn.execute(text(sql_query))
        
        columns = []
        rows = []
        if result.returns_rows:
            columns = list(result.keys())
            for row in result:
                row_vals = []
                for val in row:
                    if val is None:
                        row_vals.append(None)
                    elif hasattr(val, "isoformat"):
                        row_vals.append(val.isoformat())
                    elif isinstance(val, Decimal):
                        row_vals.append(float(val))
                    elif isinstance(val, (bytes, bytearray)):
                        row_vals.append("<Binary Data>")
                    else:
                        row_vals.append(val)
                rows.append(row_vals)
        else:
            # Handles commit automatically for write statements
            conn.commit()
            
        execution_time_ms = (time.time() - start_time) * 1000
        
        return {
            "columns": columns,
            "rows": rows,
            "execution_time_ms": round(execution_time_ms, 2),
            "row_count": len(rows) if rows else result.rowcount
        }

def get_query_execution_plan(sql_query: str) -> str:
    """
    Fetches the database execution plan for a SQL query in a dialect-aware way.
    Supports SQLite, PostgreSQL, MySQL, and Microsoft SQL Server.
    """
    engine = db_manager.get_engine()
    dialect = engine.dialect.name
    
    clean_query = sql_query.strip().rstrip(";")
    if not clean_query:
        return "Empty query"

    # Only explain SELECT statements
    if not clean_query.lower().startswith("select") and not clean_query.lower().startswith("with"):
        return "Execution plans are only available for SELECT / query statements."
    
    try:
        with engine.connect() as conn:
            if dialect == "sqlite":
                explain_sql = f"EXPLAIN QUERY PLAN {clean_query}"
                result = conn.execute(text(explain_sql))
                plan_rows = []
                for row in result:
                    # SQLite EXPLAIN columns: id, parent, notused, detail
                    row_str = " | ".join(str(val) for val in row)
                    plan_rows.append(row_str)
                return "\n".join(plan_rows) if plan_rows else "No plan returned."
                
            elif dialect == "postgresql":
                explain_sql = f"EXPLAIN {clean_query}"
                result = conn.execute(text(explain_sql))
                plan_rows = [row[0] for row in result]
                return "\n".join(plan_rows)
                
            elif dialect == "mysql":
                explain_sql = f"EXPLAIN {clean_query}"
                result = conn.execute(text(explain_sql))
                columns = list(result.keys())
                plan_rows = []
                plan_rows.append(" | ".join(columns))
                plan_rows.append("-" * 40)
                for row in result:
                    plan_rows.append(" | ".join(str(val) for val in row))
                return "\n".join(plan_rows)
                
            elif dialect == "mssql":
                # SET SHOWPLAN_TEXT is connection-scoped
                conn.execute(text("SET SHOWPLAN_TEXT ON"))
                try:
                    result = conn.execute(text(clean_query))
                    plan_rows = []
                    for row in result:
                        plan_rows.append(str(row[0]))
                    plan_text = "\n".join(plan_rows)
                finally:
                    conn.execute(text("SET SHOWPLAN_TEXT OFF"))
                return plan_text
                
            else:
                return f"Execution plan is not supported for dialect '{dialect}'."
    except Exception as e:
        logger.error(f"Error fetching execution plan: {str(e)}")
        return f"Could not fetch execution plan: {str(e)}"
