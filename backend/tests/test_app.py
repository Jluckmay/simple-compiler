import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from app import app


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
