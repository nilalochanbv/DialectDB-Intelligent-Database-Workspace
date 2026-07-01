import httpx
import json
import logging
from app.config import GEMINI_API_KEY, ANTHROPIC_API_KEY

logger = logging.getLogger("dialectdb.llm")

# Default models
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022"

def convert_to_anthropic_messages(contents: list) -> list:
    """
    Converts Gemini-style contents parameter into Anthropic messages structure.
    Gemini format: [{"role": "user"|"model", "parts": [{"text": "..."}]}]
    Anthropic format: [{"role": "user"|"assistant", "content": "..."}]
    """
    messages = []
    for content in contents:
        gemini_role = content.get("role", "user")
        role = "user" if gemini_role == "user" else "assistant"
        
        parts = content.get("parts", [])
        text_content = ""
        if parts:
            text_content = "".join([part.get("text", "") for part in parts if part.get("text")])
        
        messages.append({
            "role": role,
            "content": text_content
        })
    return messages

async def call_gemini_api(contents: list, system_instruction: str = None, json_mode: bool = False, model: str = None) -> str:
    """
    Calls Gemini API with the given contents structure.
    Supports system instructions and optional JSON output constraints.
    """
    if not GEMINI_API_KEY:
        raise Exception("Gemini API Key is not configured. Please make sure the key is present in .env.txt.")
        
    selected_model = model or DEFAULT_GEMINI_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{selected_model}:generateContent?key={GEMINI_API_KEY}"
    
    generation_config = {
        "temperature": 0.1
    }
    if json_mode:
        generation_config["responseMimeType"] = "application/json"
        
    payload = {
        "contents": contents,
        "generationConfig": generation_config
    }
    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }
        
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload)
        
        # Fallback if the primary model fails with any error (404, 503, etc.)
        if response.status_code != 200 and selected_model != "gemini-3.5-flash":
            logger.warning(f"Primary model {selected_model} returned status {response.status_code}. Trying fallback to gemini-3.5-flash...")
            fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={GEMINI_API_KEY}"
            try:
                fallback_response = await client.post(fallback_url, json=payload)
                if fallback_response.status_code == 200:
                    response = fallback_response
            except Exception as fe:
                logger.error(f"Fallback attempt failed: {str(fe)}")
            
        if response.status_code != 200:
            err_msg = f"Gemini API returned error {response.status_code}: {response.text}"
            logger.error(err_msg)
            raise Exception(err_msg)
            
        result = response.json()
        try:
            return result["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as e:
            logger.error(f"Failed to parse Gemini API response: {result}")
            raise Exception("Invalid response structure received from Gemini API.")

async def call_anthropic_api(contents: list, system_instruction: str = None, json_mode: bool = False, model: str = None) -> str:
    """
    Calls Anthropic API with the given contents structure mapped to Anthropic messages.
    """
    if not ANTHROPIC_API_KEY:
        raise Exception("Anthropic API Key is not configured. Please make sure the key is present in .env.txt.")
        
    selected_model = model or DEFAULT_ANTHROPIC_MODEL
    url = "https://api.anthropic.com/v1/messages"
    
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    messages = convert_to_anthropic_messages(contents)
    
    payload = {
        "model": selected_model,
        "max_tokens": 4096,
        "messages": messages,
        "temperature": 0.1
    }
    
    if system_instruction:
        payload["system"] = system_instruction
        
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        
        if response.status_code != 200:
            err_msg = f"Anthropic API returned error {response.status_code}: {response.text}"
            logger.error(err_msg)
            raise Exception(err_msg)
            
        result = response.json()
        try:
            return result["content"][0]["text"]
        except (KeyError, IndexError) as e:
            logger.error(f"Failed to parse Anthropic API response: {result}")
            raise Exception("Invalid response structure received from Anthropic API.")

async def call_llm_api(provider: str, model: str, contents: list, system_instruction: str = None, json_mode: bool = False) -> str:
    """
    Routes the request to the specified provider (gemini or anthropic) and model.
    """
    provider_lower = provider.lower() if provider else "gemini"
    if provider_lower == "gemini":
        return await call_gemini_api(contents, system_instruction, json_mode, model)
    elif provider_lower == "anthropic":
        return await call_anthropic_api(contents, system_instruction, json_mode, model)
    else:
        raise Exception(f"Unsupported LLM provider: {provider}")

def format_schema_context(schema: dict) -> str:
    """
    Formats the schema dictionary into a readable format for prompt insertion.
    """
    if not schema:
        return "No tables exist in the database."
        
    lines = []
    for table_name, details in schema.items():
        lines.append(f"Table: {table_name}")
        for col in details["columns"]:
            pk_suffix = " (PRIMARY KEY)" if col["name"] in details["primary_keys"] else ""
            nullable_suffix = " NULL" if col["nullable"] else " NOT NULL"
            lines.append(f"  - {col['name']}: {col['type']}{pk_suffix}{nullable_suffix}")
        for fk in details["foreign_keys"]:
            constrained = ", ".join(fk["constrained_columns"])
            referred_cols = ", ".join(fk["referred_columns"])
            lines.append(f"  - FOREIGN KEY ({constrained}) REFERENCES {fk['referred_table']}({referred_cols})")
    return "\n".join(lines)
