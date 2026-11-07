"""
Simple Compiler Desktop Application
Native desktop wrapper with spellcheck support
"""
import os
import sys
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
import json

# Get project root (works both in dev and PyInstaller frozen)
if getattr(sys, 'frozen', False):
    if hasattr(sys, '_MEIPASS'):
        # PyInstaller onefile: data files are extracted to _MEIPASS
        PROJECT_ROOT = sys._MEIPASS
        FRONTEND_DIR = os.path.join(PROJECT_ROOT, 'frontend')
    else:
        PROJECT_ROOT = os.path.dirname(sys.executable)
        FRONTEND_DIR = os.path.join(PROJECT_ROOT, 'frontend')
else:
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    FRONTEND_DIR = os.path.join(PROJECT_ROOT, 'frontend')

DESKTOP_DIR = os.path.abspath(os.path.dirname(__file__))
PORT = 8765

# Backend server used by the frontend for languages that need server-side execution.
BACKEND_URL = 'https://simple-compiler-ldj7.onrender.com/compile'

# Try to import webview, fallback to browser
try:
    import webview
    USE_WEBVIEW = True
except ImportError:
    USE_WEBVIEW = False
    print("pywebview not available, falling back to browser")

# Spellcheck support
try:
    from spellchecker import SpellChecker
    SPELLCHECKER_AVAILABLE = True
    # Initialize spell checkers for English and Portuguese
    spell_en = SpellChecker(language='en')
    spell_pt = SpellChecker(language='pt')
except ImportError:
    SPELLCHECKER_AVAILABLE = False
    spell_en = None
    spell_pt = None


class DesktopHandler(SimpleHTTPRequestHandler):
    """Custom handler to serve frontend files and API endpoints"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        # Serve desktop.js from desktop directory
        if path == '/desktop.js':
            self.serve_file(os.path.join(DESKTOP_DIR, 'desktop.js'), 'application/javascript')
            return
        
        # Inject desktop.js into index.html responses
        if path in ('/', '/index.html'):
            self.serve_index_with_desktop_js()
            return
        
        super().do_GET()
    
    def serve_file(self, filepath, content_type):
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_response(404)
            self.end_headers()
    
    def serve_index_with_desktop_js(self):
        index_path = os.path.join(FRONTEND_DIR, 'index.html')
        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                html = f.read()
            # Inject desktop.js script before closing body tag
            injection = '<script type="module" src="/desktop.js"></script>'
            if '/desktop.js' not in html:
                html = html.replace('</body>', injection + '\n</body>')
            content = html.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        if self.path == '/api/spellcheck':
            self.handle_spellcheck()
        elif self.path == '/api/compile':
            self.handle_compile()
        else:
            self.send_response(404)
            self.end_headers()
    
    def handle_spellcheck(self):
        """Handle spellcheck API requests"""
        if not SPELLCHECKER_AVAILABLE:
            self.send_response(503)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Spellchecker not available'}).encode())
            return
        
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            text = data.get('text', '')
            language = data.get('language', 'en')
            words = data.get('words', [])
            
            # Get appropriate spellchecker
            if language == 'pt' and spell_pt:
                checker = spell_pt
            else:
                checker = spell_en
            
            if not words:
                # Extract words from text
                import re
                words = re.findall(r'\b[a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]{3,}\b', text)
            
            misspelled = []
            for word in set(words):
                if word.lower() not in checker:
                    # Get suggestions
                    suggestions = list(checker.candidates(word.lower()))[:3]
                    misspelled.append({
                        'word': word,
                        'suggestions': suggestions
                    })
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'misspelled': misspelled}).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def handle_compile(self):
            """Proxy /api/compile to the remote backend (avoids CORS from localhost)."""
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
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

    def end_headers(self):
            self.send_header('Access-Control-Allow-Origin', '*')
            super().end_headers()


def start_server():
    """Start HTTP server in background thread"""
    server = HTTPServer(('localhost', PORT), DesktopHandler)
    print(f"Server running at http://localhost:{PORT}")
    server.serve_forever()


def main():
    """Main entry point"""
    print("Simple Compiler Desktop")
    print("=" * 50)
    
    # Start server in background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Wait a moment for server to start
    import time
    time.sleep(0.5)
    
    url = f'http://localhost:{PORT}'
    
    if USE_WEBVIEW:
        # Create native window
        window = webview.create_window(
            'Simple Compiler Desktop',
            url,
            width=1400,
            height=900,
            resizable=True,
            fullscreen=False
        )
        print(f"Opening native window...")
        webview.start()
    else:
        # Fallback to browser
        print(f"Opening in browser: {url}")
        webbrowser.open(url)
        print("Press Ctrl+C to stop server")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down...")


if __name__ == '__main__':
    main()
