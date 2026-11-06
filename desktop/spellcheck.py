"""
Spellcheck module for Simple Compiler Desktop
Extracts words from code and checks spelling in comments/strings
"""
import re
from typing import List, Tuple, Set

# Language-specific comment and string patterns
CODE_PATTERNS = {
    'python': {
        'comments': [r'#.*$'],
        'strings': [r'(?P<quote>["\'])(.*?)(?P=quote)'],
        'docstrings': [r'""".*?"""', r"'''.*?'''"]
    },
    'javascript': {
        'comments': [r'//.*$', r'/\*.*?\*/'],
        'strings': [r'(?P<quote>["\'])(.*?)(?P=quote)', r'(?P<quote>`)(.*?)(?P=quote)']
    },
    'typescript': {
        'comments': [r'//.*$', r'/\*.*?\*/'],
        'strings': [r'(?P<quote>["\'])(.*?)(?P=quote)', r'(?P<quote>`)(.*?)(?P=quote)']
    },
    'c': {
        'comments': [r'//.*$', r'/\*.*?\*/'],
        'strings': [r'(?P<quote>["\'])(.*?)(?P=quote)']
    },
    'cpp': {
        'comments': [r'//.*$', r'/\*.*?\*/'],
        'strings': [r'(?P<quote>["\'])(.*?)(?P=quote)']
    },
    'java': {
        'comments': [r'//.*$', r'/\*.*?\*/'],
        'strings': [r'(?P<quote>["\'])(.*?)(?P=quote)']
    },
    'csharp': {
        'comments': [r'//.*$', r'/\*.*?\*/'],
        'strings': [r'(?P<quote>["\'])(.*?)(?P=quote)']
    },
    'go': {
        'comments': [r'//.*$', r'/\*.*?\*/'],
        'strings': [r'(?P<quote>["\'])(.*?)(?P=quote)']
    },
    'lua': {
        'comments': [r'--.*$'],
        'strings': [r'(?P<quote>["\'])(.*?)(?P=quote)']
    },
    'r': {
        'comments': [r'#.*$'],
        'strings': [r'(?P<quote>["\'])(.*?)(?P=quote)']
    },
    'sql': {
        'comments': [r'--.*$', r'/\*.*?\*/'],
        'strings': [r'(?P<quote>\')(.*?)(?P=quote)']
    },
    'lean': {
        'comments': [r'--.*$', r'/\*.*?\*/'],
        'strings': [r'(?P<quote>["\'])(.*?)(?P=quote)']
    },
}


def extract_text_from_code(code: str, language: str) -> str:
    """
    Extract comment and string content from code for spell checking
    Returns concatenated text from comments and strings only
    """
    if not code or not language:
        return ""
    
    language = language.lower()
    patterns = CODE_PATTERNS.get(language)
    if not patterns:
        # Default: assume comments with # or //
        patterns = {
            'comments': [r'#.*$', r'//.*$'],
            'strings': []
        }
    
    extracted_parts = []
    
    # Extract comments
    for pattern in patterns.get('comments', []):
        matches = re.findall(pattern, code, re.MULTILINE | re.DOTALL)
        for match in matches:
            if isinstance(match, tuple):
                match = ''.join(match)
            extracted_parts.append(match)
    
    # Extract strings
    for pattern in patterns.get('strings', []):
        matches = re.findall(pattern, code, re.DOTALL)
        for match in matches:
            if isinstance(match, tuple):
                # Get the string content (not the quotes)
                match = match[1] if len(match) > 1 else ''.join(match)
            extracted_parts.append(match)
    
    # Extract docstrings for Python
    if language == 'python':
        for pattern in patterns.get('docstrings', []):
            matches = re.findall(pattern, code, re.DOTALL)
            for match in matches:
                extracted_parts.append(match)
    
    return ' '.join(extracted_parts)


def extract_words_from_text(text: str) -> Set[str]:
    """
    Extract words from text, filtering out code-like tokens
    """
    # Find words with at least 3 characters
    # Include accented characters for Portuguese
    words = re.findall(
        r'\b[a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]{3,}\b',
        text
    )
    
    # Filter out common code tokens
    code_tokens = {
        'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
        'case', 'break', 'continue', 'class', 'def', 'var', 'let', 'const',
        'import', 'from', 'package', 'public', 'private', 'protected',
        'static', 'void', 'int', 'string', 'boolean', 'true', 'false',
        'null', 'undefined', 'this', 'super', 'new', 'try', 'catch',
        'finally', 'throw', 'with', 'as', 'in', 'and', 'or', 'not',
        'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'the', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'by',
        'html', 'css', 'js', 'json', 'xml', 'yaml', 'csv',
        'http', 'https', 'api', 'url', 'id', 'url', 'path',
        'error', 'warning', 'info', 'debug', 'log',
        'get', 'set', 'post', 'put', 'delete', 'patch',
        'name', 'value', 'key', 'data', 'result', 'output',
    }
    
    # Return lowercase words not in code tokens
    filtered = {w.lower() for w in words if w.lower() not in code_tokens}
    return filtered


def get_misspelled_words(code: str, language: str, spellchecker) -> List[dict]:
    """
    Get misspelled words from code (comments and strings only)
    Returns list of dicts with word and suggestions
    """
    if not spellchecker or not code:
        return []
    
    text = extract_text_from_code(code, language)
    words = extract_words_from_text(text)
    
    misspelled = []
    for word in words:
        if word not in spellchecker:
            suggestions = list(spellchecker.candidates(word))[:3]
            misspelled.append({
                'word': word,
                'suggestions': suggestions
            })
    
    return misspelled
