"""Local development server for Moonlight Elixirs with strict ES Module & PWA MIME types."""
import http.server
import os
import socketserver

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8080


class MoonlightHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".webmanifest": "application/manifest+json; charset=utf-8",
        ".json": "application/json; charset=utf-8",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), MoonlightHandler) as httpd:
        print(f"Moonlight Elixirs running at http://127.0.0.1:{PORT}")
        httpd.serve_forever()
