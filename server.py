"""Punto de entrada:  python server.py  →  http://localhost:3000"""
import os, json
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qsl
from database import db, seed
from controllers import api

VIEWS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'views')
MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml'}
# seed.cargar()

class Handler(BaseHTTPRequestHandler):
    def _api(self, u):
        n = int(self.headers.get('Content-Length') or 0)
        try: body = json.loads(self.rfile.read(n) or b'{}')
        except ValueError: body = {}
        with db.LOCK:
            code, out = api.manejar(self.command, u.path, dict(parse_qsl(u.query)), body, self.headers.get('Authorization', ''))
        if isinstance(out, dict) and 'raw' in out:
            data = out['raw'].encode('utf-8'); self.send_response(200)
            self.send_header('Content-Type', out['type']); self.send_header('Content-Disposition', f'attachment; filename="{out["file"]}"')
        else:
            data = json.dumps(out, ensure_ascii=False).encode('utf-8'); self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)

    def _handle(self):
        u = urlparse(self.path)
        if u.path.startswith('/api/'): return self._api(u)
        f = os.path.normpath(os.path.join(VIEWS, 'index.html' if u.path == '/' else u.path.lstrip('/')))
        if not f.startswith(VIEWS) or not os.path.isfile(f):
            self.send_response(302); self.send_header('Location', '/'); self.send_header('Content-Length', '0'); self.end_headers(); return
        data = open(f, 'rb').read(); self.send_response(200)
        self.send_header('Content-Type', MIME.get(os.path.splitext(f)[1], 'application/octet-stream')); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
    do_GET = do_POST = do_PUT = do_DELETE = _handle
    def log_message(self, *a): pass

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    print(f'INFRAVENZ Fútbol → http://localhost:{port}')
    ThreadingHTTPServer(('', port), Handler).serve_forever()
