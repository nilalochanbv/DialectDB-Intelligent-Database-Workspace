from app.services.llm import call_llm_api, format_schema_context

async def optimize_sql_query(
    sql_query: str, 
    schema: dict, 
    dialect: str,
    provider: str = "gemini",
    model: str = "gemini-2.5-flash"
) -> str:
    """
    Analyzes a SQL query and schema to suggest optimizations, rewritten queries, and index creations.
    """
    schema_text = format_schema_context(schema)
    
    system_instruction = (
        "You are DialectDB AI Database Assistant, a database performance optimization specialist. "
        "Analyze the provided SQL query and database schema, and recommend optimizations. "
        "Provide:\n"
        "1. Performance improvements (e.g. avoiding unnecessary joins, redundant columns, or table scans).\n"
        "2. Concrete INDEX creation statements relevant for the target database dialect (e.g. CREATE INDEX commands).\n"
        "3. A compare/alternative rewritten version of the query that is optimized, with code comments explaining why it is better.\n"
        "Format your entire response in clear, beautiful markdown."
    )
    
    prompt = (
        f"Database Dialect: {dialect}\n\n"
        f"Database Schema:\n{schema_text}\n\n"
        f"SQL Query to Optimize:\n```sql\n{sql_query}\n```\n\n"
        "Please provide performance suggestions, index recommendations, and optimized alternatives in markdown."
    )
    
    contents = [{
        "role": "user",
        "parts": [{"text": prompt}]
    }]
    
    try:
        optimization = await call_llm_api(provider, model, contents, system_instruction=system_instruction)
        return optimization
    except Exception as e:
        return f"Failed to generate optimization advice: {str(e)}"
