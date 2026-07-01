import re

FORBIDDEN_KEYWORDS = {"drop", "delete", "update", "insert", "alter", "truncate", "create"}

def remove_comments_and_strings(sql: str) -> str:
    """
    Removes SQL comments (single-line '--' and multi-line '/* ... */') 
    and string literals ('...' and "...") to prevent false positives.
    """
    # Remove multi-line comments
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
    
    # Remove single-line comments
    sql = re.sub(r'--.*$', '', sql, flags=re.MULTILINE)
    
    # Remove string literals (replace with empty to avoid scanning inside strings)
    sql = re.sub(r"'[^']*'", "", sql)
    sql = re.sub(r'"[^"]*"', "", sql)
    
    return sql

def is_safe_sql(sql_query: str) -> tuple[bool, str]:
    """
    Checks if a SQL query contains write operations (DROP, DELETE, UPDATE, etc.).
    Returns (True, "") if safe, or (False, "error message") if unsafe.
    """
    cleaned_sql = remove_comments_and_strings(sql_query)
    
    # Find all words (alphanumeric tokens)
    tokens = re.findall(r'\b[a-zA-Z_]+\b', cleaned_sql.lower())
    
    found_forbidden = [tok for tok in tokens if tok in FORBIDDEN_KEYWORDS]
    
    if found_forbidden:
        forbidden_list = ", ".join(f.upper() for f in set(found_forbidden))
        return False, f"Query contains blocked write/DDL keywords: {forbidden_list}. Enable 'Allow Write Operations' in settings to execute."
        
    return True, ""
