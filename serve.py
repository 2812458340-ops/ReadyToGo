#!/usr/bin/env python3
"""Tiny static server for the travel-risk map (no dependencies)."""
import http.server
import socketserver
import os
import sys
import webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    os.chdir(ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        url = "http://127.0.0.1:%d/" % PORT
        print("Travel Risk Atlas running at %s" % url)
        print("Press Ctrl+C to stop.")
        if "--open" in sys.argv:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
