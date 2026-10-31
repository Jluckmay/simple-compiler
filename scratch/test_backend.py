import requests, json, time, sys
url='http://127.0.0.1:5000/compile'
payload={"code": "print('Hello')", "language": "python"}
time.sleep(2)
try:
    r=requests.post(url, json=payload, timeout=5)
    print('status', r.status_code)
    print('response', r.json())
except Exception as e:
    print('error', e)
