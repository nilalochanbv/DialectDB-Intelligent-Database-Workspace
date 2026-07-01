import json
import logging
from app.services.llm import call_llm_api, format_schema_context
from app.services.validation import is_safe_sql
from app.database.inspector import inspect_database_schema
from app.database.connection import db_manager

logger = logging.getLogger("dialectdb.assistant")

async def run_ai_assistant(
    user_message: str, 
    chat_history: list, 
    allow_write: bool = False,
    provider: str = "gemini",
    model: str = "gemini-2.5-flash"
) -> dict:
    """
    Orchestrates the AI Assistant flow:
    1. Inspects active database schema.
    2. Builds the system instructions with schema definition, dialect constraints, and JSON requirements.
    3. Feeds chat history + new message to LLM.
    4. Parses LLM JSON response.
    5. Validates the generated SQL using the safety layer.
    """
    try:
        engine = db_manager.get_engine()
        dialect = engine.dialect.name
    except Exception as e:
        return {
            "error": "No database connected. Please connect to a database in Settings first.",
            "sql": None,
            "explanation": "Please connect to a database.",
            "suggested_questions": []
        }
        
    try:
        schema = inspect_database_schema()
    except Exception as e:
        schema = {}
        
    schema_text = format_schema_context(schema)
    
    system_instruction = (
        "You are DialectDB AI Database Assistant, a production-quality database copilot.\n"
        f"Active Database Dialect: {dialect}\n\n"
        "Active Database Schema:\n"
        f"{schema_text}\n\n"
        "Guidelines:\n"
        "1. Generate valid SQL matching the active dialect and using only the tables/columns specified in the schema.\n"
        "2. Support universal multilingual input. If the user asks in Tamil, Tanglish, Hindi, Spanish, etc., "
        "detect their language and write the 'explanation' and 'suggested_questions' in that SAME language. "
        "Translate concepts accurately. Write the SQL syntax itself in standard SQL.\n"
        "3. You must always return a JSON object with these EXACT keys:\n"
        "   - 'sql': The generated SQL statement (string), or null if the input is conversational/general and cannot be answered with a SQL query.\n"
        "   - 'explanation': A friendly, clear explanation of the query or answer in the user's language, formatted in markdown.\n"
        "   - 'optimizations': Optional optimization remarks or index creation suggestions (string/markdown), or null.\n"
        "   - 'suggested_questions': An array of 2-3 logical follow-up questions the user might ask (strings, in the user's language).\n\n"
        "Do not wrap your JSON in triple backticks or markdown formatting. Output raw JSON."
    )
    
    # Format chat history for LLM API
    # contents is: [{"role": "user"|"model", "parts": [{"text": "..."}]}]
    contents = []
    for msg in chat_history:
        role = "user" if msg.get("sender") == "user" else "model"
        text = msg.get("text", "")
        # If the model previously output a structured JSON, we can supply the raw text or the clean explanation
        if role == "model" and isinstance(text, dict):
            text = json.dumps(text)
        contents.append({
            "role": role,
            "parts": [{"text": text}]
        })
        
    # Append the new user message
    contents.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })
    
    try:
        response_text = await call_llm_api(provider, model, contents, system_instruction=system_instruction, json_mode=True)
        # Parse JSON
        data = json.loads(response_text)
    except json.JSONDecodeError:
        # Fallback to cleaning markdown fences if LLM wrapped it
        try:
            cleaned = response_text.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned)
        except Exception as parse_err:
            logger.error(f"Failed to parse LLM JSON: {response_text}, err: {parse_err}")
            return {
                "sql": None,
                "explanation": f"Sorry, I had trouble parsing the model's response: {response_text}",
                "suggested_questions": ["Try rephrasing your question."]
            }
    except Exception as e:
        logger.error(f"Error calling LLM: {str(e)}")
        return {
            "sql": None,
            "explanation": f"Error interacting with AI Assistant: {str(e)}",
            "suggested_questions": ["Can you check your connection?"]
        }
        
    # Extract SQL & run validation
    generated_sql = data.get("sql")
    if generated_sql and not allow_write:
        is_safe, error_msg = is_safe_sql(generated_sql)
        if not is_safe:
            data["sql_original"] = generated_sql
            data["sql"] = None
            data["explanation"] = f"⚠️ **Safety Warning:** I generated a write operation, but write actions are disabled by default. \n\n{error_msg}\n\nGenerated query was:\n```sql\n{generated_sql}\n```"
            
    return data
