import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from app import app, LANG_CONFIG, MAX_CODE_SIZE


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
    assert 'timed out' in data['error'].lower()

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
