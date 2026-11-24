"""Serve the reader and synthesize Russian text with RHVoice."""
import os
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import BoundedSemaphore

PUBLIC = Path(__file__).resolve().parent / "public"
STATIC = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
    "/reader.js": ("reader.js", "text/javascript; charset=utf-8"),
}
MAX_TEXT_BYTES = 64 * 1024
VOICE = "Aleksandr-hq"
SYNTHESIS_SLOTS = BoundedSemaphore(2)


class ReaderHandler(BaseHTTPRequestHandler):
    def respond(self, status, content_type, body):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def message(self, status, text):
        self.respond(status, "text/plain; charset=utf-8", text.encode("utf-8"))

    def do_GET(self):
        asset = STATIC.get(self.path)
        if asset is None:
            self.message(404, "Página no encontrada.")
            return
        filename, content_type = asset
        self.respond(200, content_type, (PUBLIC / filename).read_bytes())

    def do_POST(self):
        self.close_connection = True
        if self.path != "/api/speech":
            self.message(404, "Página no encontrada.")
            return
        if self.headers.get_content_type() != "text/plain":
            self.message(415, "Envía el texto como texto plano.")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0:
                raise ValueError
        except ValueError:
            self.message(400, "Escribe un texto para leer.")
            return
        if length > MAX_TEXT_BYTES:
            self.message(413, "El texto es demasiado largo. Léelo en partes.")
            return
        raw_text = self.rfile.read(length)
        try:
            text = raw_text.decode("utf-8")
        except UnicodeDecodeError:
            self.message(400, "El texto debe estar en UTF-8.")
            return
        if len(raw_text) != length or not text.strip() or "\x00" in text:
            self.message(400, "Escribe un texto válido para leer.")
            return

        if not SYNTHESIS_SLOTS.acquire(blocking=False):
            self.message(503, "El lector está ocupado. Inténtalo en unos segundos.")
            return
        try:
            with tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / "speech.wav"
                subprocess.run(
                    ["RHVoice-test", "-p", VOICE, "-o", str(output)],
                    input=raw_text,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=90,
                    check=True,
                )
                audio = output.read_bytes()
                if len(audio) <= 44 or not audio.startswith(b"RIFF"):
                    raise ValueError("Empty or invalid WAV")
        except (OSError, ValueError, subprocess.SubprocessError):
            self.message(502, "RHVoice no pudo generar el audio para este texto.")
            return
        finally:
            SYNTHESIS_SLOTS.release()

        try:
            self.respond(200, "audio/wav", audio)
        except (BrokenPipeError, ConnectionResetError):
            # The reader can cancel playback while synthesis is in progress.
            pass


if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    with ThreadingHTTPServer((host, port), ReaderHandler) as server:
        print(f"Lector de ruso en http://{host}:{port}", flush=True)
        server.serve_forever()
