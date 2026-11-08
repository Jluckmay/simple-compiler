import http.server
import socketserver
import os
import json
from urllib.parse import urlparse
from urllib.request import Request, urlopen

PORT = int(os.environ.get("PORT", "8080"))
BACKEND_URL = os.environ.get("BACKEND_URL", "https://simple-compiler-ldj7.onrender.com/compile")

try:
    from local_compiler import try_local_execute
except ImportError:
    try_local_execute = lambda code, lang: None


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.mjs': 'application/javascript',
        '.js': 'application/javascript',
        '.wasm': 'application/wasm',
        '.json': 'application/json',
    }

    def translate_path(self, path):
        # Remove query string before mapping to file path
        path = urlparse(path).path
        return super().translate_path(path)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == '/api/compile':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)

            try:
                payload = json.loads(post_data.decode('utf-8'))
                code = payload.get('code', '')
                language = payload.get('language', '')
                local_res = try_local_execute(code, language)
                if local_res is not None:
                    body = json.dumps(local_res).encode('utf-8')
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(body)
                    return
            except Exception:
                pass  # Fall through to remote proxy on local exec error

            try:
                req = Request(
                    BACKEND_URL,
                    data=post_data,
                    headers={'Content-Type': 'application/json'},
                    method='POST',
                )
                with urlopen(req, timeout=120) as resp:
                    body = resp.read()
                    self.send_response(resp.status)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(body)
            except Exception as e:
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Backend proxy error: ' + str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        httpd.serve_forever()
