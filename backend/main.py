import sqlite3, json, hashlib, time, os, re
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "retailcart.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'user'
        )""")
        c.execute("""CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, category TEXT, price REAL, stock INTEGER, image TEXT, description TEXT
        )""")
        c.execute("""CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY, user_email TEXT, items TEXT, total REAL, status TEXT DEFAULT 'Placed', created_at TEXT
        )""")
        cur = c.cursor()
        cur.execute("SELECT COUNT(*) FROM products")
        if cur.fetchone()[0] == 0:
            sample_products = [
                ("Noise-Cancelling Headphones", "Electronics", 129.99, 15, "🎧", "Premium wireless audio with active ANC."),
                ("Mechanical Keyboard RGB", "Electronics", 79.50, 20, "⌨️", "Tactile mechanical switches with backlit keys."),
                ("Smart Fitness Watch", "Electronics", 99.00, 12, "⌚", "Tracks heart rate, sleep, and workouts."),
                ("Classic Denim Jacket", "Fashion", 59.99, 25, "🧥", "Timeless style denim jacket with brass buttons."),
                ("Running Sneakers Pro", "Fashion", 89.90, 18, "👟", "Ultra-cushioned breathable mesh sneakers."),
                ("Minimalist Ceramic Planter", "Home", 24.50, 30, "🪴", "Modern matte ceramic planter with saucer."),
                ("Stainless Steel Water Bottle", "Home", 19.99, 40, "🍶", "Vacuum insulated, keeps water cold 24hrs.")
            ]
            cur.executemany("INSERT INTO products (title, category, price, stock, image, description) VALUES (?,?,?,?,?,?)", sample_products)
        c.execute("INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
                  ("Demo Admin", "admin@retailcart.com", hashlib.sha256("Admin@1234!".encode()).hexdigest(), "admin"))
        c.execute("INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
                  ("Demo Buyer", "buyer@retailcart.com", hashlib.sha256("Buyer@1234!".encode()).hexdigest(), "user"))
        c.execute("UPDATE users SET password=? WHERE email='admin@retailcart.com'", (hashlib.sha256("Admin@1234!".encode()).hexdigest(),))
        c.execute("UPDATE users SET password=? WHERE email='buyer@retailcart.com'", (hashlib.sha256("Buyer@1234!".encode()).hexdigest(),))
        c.commit()

init_db()

app = FastAPI(title="RetailCart API", description="Retail & Multi-Category Store API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def validate_password_policy(pw: str):
    if len(pw) < 8: return "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", pw): return "Password must contain an uppercase letter (A-Z)."
    if not re.search(r"[a-z]", pw): return "Password must contain a lowercase letter (a-z)."
    if not re.search(r"\d", pw): return "Password must contain a number (0-9)."
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", pw): return "Password must contain a special character (!@#$%^&* etc)."
    return None

class AuthReq(BaseModel):
    email: str
    password: Optional[str] = ""
    name: Optional[str] = "User"
    google_token: Optional[str] = None

class OrderReq(BaseModel):
    items: List[dict]
    total: float
    shipping_address: Optional[str] = "Standard Delivery Address"

def hash_pw(pw: str): return hashlib.sha256(pw.encode()).hexdigest()

@app.post("/api/auth/register")
def register(req: AuthReq):
    err = validate_password_policy(req.password or "")
    if err: raise HTTPException(400, f"Banking Security Alert: {err}")
    with get_db() as c:
        try:
            c.execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", (req.name, req.email, hash_pw(req.password)))
            c.commit()
            return {"status": "success", "user": {"email": req.email, "name": req.name, "role": "user"}}
        except sqlite3.IntegrityError:
            raise HTTPException(400, "Email already registered")

@app.post("/api/auth/login")
def login(req: AuthReq):
    with get_db() as c:
        cur = c.cursor()
        cur.execute("SELECT name, email, role FROM users WHERE email=? AND password=?", (req.email, hash_pw(req.password)))
        user = cur.fetchone()
        if not user: raise HTTPException(401, "Invalid email or password")
        return {"status": "success", "user": dict(user)}

@app.post("/api/auth/google")
def google_auth(req: AuthReq):
    name = req.name or req.email.split("@")[0].title()
    with get_db() as c:
        c.execute("INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')", 
                  (name, req.email, hash_pw("google_oauth_token_secret")))
        c.commit()
        cur = c.cursor()
        cur.execute("SELECT name, email, role FROM users WHERE email=?", (req.email,))
        return {"status": "success", "user": dict(cur.fetchone())}

@app.get("/api/products")
def get_products(category: Optional[str] = None, search: Optional[str] = None):
    with get_db() as c:
        cur = c.cursor()
        query = "SELECT * FROM products WHERE 1=1"
        params = []
        if category and category != "All":
            query += " AND category=?"
            params.append(category)
        if search:
            query += " AND (title LIKE ? OR description LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])
        cur.execute(query, params)
        return [dict(row) for row in cur.fetchall()]

@app.post("/api/orders")
def place_order(req: OrderReq, user_email: str = Header("guest@retailcart.com")):
    if not req.items: raise HTTPException(400, "Cart is empty")
    order_id = f"ORD-{int(time.time())}-{os.urandom(2).hex().upper()}"
    with get_db() as c:
        c.execute("INSERT INTO orders (id, user_email, items, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                  (order_id, user_email, json.dumps(req.items), req.total, "Placed", time.strftime("%Y-%m-%d %H:%M")))
        for item in req.items:
            c.execute("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?", (item.get("qty", 1), item.get("id")))
        c.commit()
    return {"status": "success", "order_id": order_id, "message": "Order placed successfully!"}

@app.get("/api/orders")
def get_orders(user_email: str = Header("guest@retailcart.com")):
    with get_db() as c:
        cur = c.cursor()
        if "admin" in user_email.lower():
            cur.execute("SELECT * FROM orders ORDER BY created_at DESC")
        else:
            cur.execute("SELECT * FROM orders WHERE user_email=? ORDER BY created_at DESC", (user_email,))
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows: r["items"] = json.loads(r["items"])
        return rows

@app.patch("/api/orders/{order_id}/status")
def update_status(order_id: str, payload: dict):
    new_status = payload.get("status")
    with get_db() as c:
        c.execute("UPDATE orders SET status=? WHERE id=?", (new_status, order_id))
        c.commit()
    return {"status": "success", "order_id": order_id, "new_status": new_status}

@app.get("/api/admin/stats")
def get_admin_stats():
    with get_db() as c:
        cur = c.cursor()
        cur.execute("SELECT COUNT(*), COALESCE(SUM(total), 0) FROM orders")
        orders_cnt, total_rev = cur.fetchone()
        cur.execute("SELECT COUNT(*) FROM products WHERE stock <= 15")
        low_stock = cur.fetchone()[0]
        return {"total_orders": orders_cnt, "total_revenue": round(total_rev, 2), "low_stock_alerts": low_stock}

# Serve frontend directly from single port
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
