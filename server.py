#!/usr/bin/env python3
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        pass  # suppress logs

port = int(sys.argv[1]) if len(sys.argv) > 1 else 3333
print(f'Serving on http://localhost:{port}', flush=True)
HTTPServer(('', port), NoCacheHandler).serve_forever()
