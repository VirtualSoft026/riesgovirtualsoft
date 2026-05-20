import http.server
import socketserver
import json
import os
from urllib.parse import urlparse

PORT = 8080
DB_FILE = "database.json"

# Initialize DB
if not os.path.exists(DB_FILE):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump({"users": [], "permissions": []}, f)

def read_db():
    with open(DB_FILE, "r", encoding="utf-8") as f:
        db = json.load(f)
    
    # Auto-inyectar cuenta administradora maestra si no existe
    if not any(u.get("email", "").lower() == "maria.sanchez@virtualsoft.tech" for u in db.get("users", [])):
        if "users" not in db: db["users"] = []
        db["users"].append({
            "name": "Maria Sanchez (Admin)",
            "email": "maria.sanchez@virtualsoft.tech",
            "password": "admin123",
            "shift": "Master",
            "role": "Admin",
            "approved": True
        })
        write_db(db)
        
    return db

def write_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

class APIHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent caching for all files to ensure latest JS/CSS loads
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            db = read_db()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            if parsed.path == "/api/users":
                self.wfile.write(json.dumps(db.get("users", [])).encode('utf-8'))
            elif parsed.path == "/api/permissions":
                self.wfile.write(json.dumps(db.get("permissions", [])).encode('utf-8'))
            elif parsed.path == "/api/documents":
                # Leer dinámicamente los archivos de la carpeta "Procesos"
                try:
                    files = [f for f in os.listdir("Procesos") if os.path.isfile(os.path.join("Procesos", f))]
                except:
                    files = []
                self.wfile.write(json.dumps(files).encode('utf-8'))
            else:
                self.wfile.write(b"{}")
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
            except:
                data = {}

            db = read_db()
            
            if parsed.path == "/api/users":
                if "users" not in db: db["users"] = []
                db["users"].append(data)
                write_db(db)
                self.send_response(200)
            elif parsed.path == "/api/users/approve":
                for u in db.get("users", []):
                    if u.get("email") == data.get("email"):
                        u["approved"] = True
                write_db(db)
                self.send_response(200)
            elif parsed.path == "/api/users/promote":
                for u in db.get("users", []):
                    if u.get("email", "").lower() == data.get("email", "").lower():
                        if "role" in data: u["role"] = data["role"]
                        if "password" in data: u["password"] = data["password"]
                        if "approved" in data: u["approved"] = data["approved"]
                write_db(db)
                self.send_response(200)
            elif parsed.path == "/api/permissions":
                if "permissions" not in db: db["permissions"] = []
                db["permissions"].append(data)
                write_db(db)
                self.send_response(200)
            elif parsed.path == "/api/permissions/status":
                for p in db.get("permissions", []):
                    if p.get("id") == data.get("id"):
                        p["status"] = data.get("status")
                write_db(db)
                self.send_response(200)
            else:
                self.send_response(404)
            
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"success": true}')
        else:
            self.send_response(405)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

Handler = APIHandler

# Allow quick restart of the server on the same port
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Backend Server running at port {PORT}")
    httpd.serve_forever()
