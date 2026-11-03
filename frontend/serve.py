import http.server
import socketserver
import os
from urllib.parse import urlparse

PORT = int(os.environ.get("PORT", "8080"))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.mjs': 'application/javascript',
    }

    def translate_path(self, path):
        # Remove query string before mapping to file path
        path = urlparse(path).path
        return super().translate_path(path)


with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
