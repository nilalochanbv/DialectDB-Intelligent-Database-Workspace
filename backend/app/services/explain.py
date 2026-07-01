from app.services.llm import call_llm_api, format_schema_context

async def explain_sql_query(
    sql_query: str, 
    schema: dict, 
    dialect: str, 
    execution_plan: str = None,
    provider: str = "gemini",
    model: str = "gemini-2.5-flash"
) -> str:
    """
    Generates a natural language explanation for a SQL query, incorporating the schema
    and optional database execution plan.
    """
    schema_text = format_schema_context(schema)
    
    system_instruction = (
        "You are DialectDB AI Database Assistant, a world-class database administrator. "
        "Your task is to explain the provided SQL query clearly and concisely using markdown. "
        "Highlight what tables are used, why they are joined, what filters are applied, "
        "and what the query ultimately outputs. "
        "If an execution plan is provided, explain how the database processes the query "
        "(e.g., table scans, index lookups, sorts) in simple terms."
    )
    
    prompt = (
        f"Database Dialect: {dialect}\n\n"
        f"Database Schema:\n{schema_text}\n\n"
        f"SQL Query to Explain:\n```sql\n{sql_query}\n```\n\n"
    )
    
    if execution_plan:
        prompt += f"Database Execution Plan:\n```\n{execution_plan}\n```\n\n"
        
    prompt += "Provide the explanation now in clear markdown. If the query seems to have syntax errors or issues, point them out."
    
    contents = [{
        "role": "user",
        "parts": [{"text": prompt}]
    }]
    
    try:
        explanation = await call_llm_api(provider, model, contents, system_instruction=system_instruction)
        return explanation
    except Exception as e:
        return f"Failed to generate explanation: {str(e)}"
