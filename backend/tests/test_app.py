import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from app import app, LANG_CONFIG, MAX_CODE_SIZE, contains_dangerous_pattern, sanitize_error


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_python_success(client):
    resp = client.post('/compile', json={'code': 'print("OK")', 'language': 'python'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['error'] == ''
    assert data['output'].strip() == 'OK'

def test_python_timeout(client):
    resp = client.post('/compile', json={'code': 'while True: pass', 'language': 'python'})
    data = resp.get_json()
    assert 'timed out' in data['error'].lower() or 'unavailable' in data['error'].lower()

def test_unsupported_language(client):
    resp = client.post('/compile', json={'code': 'print "hi"', 'language': 'ruby'})
    data = resp.get_json()
    assert 'not supported' in data['error'].lower()

# --- Security / bug-fix tests ---

def test_code_size_limit(client):
    """Oversized code payloads must be rejected with 413."""
    big_code = "print('x')\n" * (MAX_CODE_SIZE // 10 + 1)
    resp = client.post('/compile', json={'code': big_code, 'language': 'python'})
    assert resp.status_code == 413
    data = resp.get_json()
    assert 'exceeds' in data['error'].lower()

def test_sql_uses_stdin_not_shell_redirection():
    """SQL run command must not rely on shell redirection (<)."""
    cmd = LANG_CONFIG['sql']['run']('/tmp/dummy.sql')
    assert '<' not in cmd, "SQL command must not use shell redirection"
    assert ':memory:' in cmd

def test_java_uses_basename_for_class_name():
    """Java run command must use basename without .java extension."""
    cmd = LANG_CONFIG['java']['run']('/tmp/HelloWorld.java')
    assert cmd == ['java', 'HelloWorld'], f"Expected ['java', 'HelloWorld'], got {cmd}"

# --- Dangerous pattern detection tests ---

def test_dangerous_pattern_import_os():
    """import os must be detected as dangerous."""
    dangerous, reason = contains_dangerous_pattern("import os")
    assert dangerous is True
    assert 'os' in reason.lower()

def test_dangerous_pattern_subprocess():
    """import subprocess must be detected as dangerous."""
    dangerous, reason = contains_dangerous_pattern("import subprocess")
    assert dangerous is True

def test_dangerous_pattern_eval():
    """eval() must be detected as dangerous."""
    dangerous, reason = contains_dangerous_pattern("eval('1+1')")
    assert dangerous is True

def test_dangerous_pattern_exec():
    """exec() must be detected as dangerous."""
    dangerous, reason = contains_dangerous_pattern("exec('print(1)')")
    assert dangerous is True

def test_dangerous_pattern_open():
    """open() must be detected as dangerous."""
    dangerous, reason = contains_dangerous_pattern("open('/etc/passwd')")
    assert dangerous is True

def test_dangerous_pattern_os_system():
    """os.system() must be detected as dangerous."""
    dangerous, reason = contains_dangerous_pattern("os.system('echo hi')")
    assert dangerous is True

def test_dangerous_pattern_shell_injection():
    """Shell injection patterns must be detected."""
    dangerous, reason = contains_dangerous_pattern("print(1); rm -rf /")
    assert dangerous is True

def test_dangerous_pattern_backticks():
    """Backticks must be detected as dangerous."""
    dangerous, reason = contains_dangerous_pattern("`ls`")
    assert dangerous is True

def test_safe_code_no_patterns():
    """Safe code must not be flagged as dangerous."""
    dangerous, reason = contains_dangerous_pattern('print("Hello World")')
    assert dangerous is False

def test_safe_code_math():
    """Math operations must not be flagged."""
    dangerous, reason = contains_dangerous_pattern('x = 2 + 2\nprint(x)')
    assert dangerous is False

# --- API security tests ---

def test_api_rejects_dangerous_code(client):
    """API must reject code with dangerous patterns."""
    resp = client.post('/compile', json={'code': 'import os; os.system("echo PWNED")', 'language': 'python'})
    assert resp.status_code == 400
    data = resp.get_json()
    assert 'security' in data['error'].lower()

def test_api_rejects_file_read(client):
    """API must reject file read attempts."""
    resp = client.post('/compile', json={'code': "open('/etc/passwd').read()", 'language': 'python'})
    assert resp.status_code == 400
    data = resp.get_json()
    assert 'security' in data['error'].lower()

def test_api_sanitizes_error_messages(client):
    """Error messages must not reveal system paths."""
    resp = client.post('/compile', json={'code': 'print("OK")', 'language': 'python'})
    data = resp.get_json()
    # Error should not contain Windows paths like C:\Users\...
    assert 'C:\\' not in data.get('error', '')
    assert '/Users/' not in data.get('error', '')
    assert '/home/' not in data.get('error', '')

def test_api_empty_code(client):
    """Empty code should return empty output without error."""
    resp = client.post('/compile', json={'code': '', 'language': 'python'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['output'] == ''
