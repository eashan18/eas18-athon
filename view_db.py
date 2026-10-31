import sqlite3, json, os

db_path = os.path.join(os.path.dirname(__file__), "backend", "retailcart.db")

if not os.path.exists(db_path):
    print("Database file does not exist yet. Run the app and place an order first!")
    exit()

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("\n" + "=" * 75)
print(" [USERS] REGISTERED ACCOUNTS & LOGINS (users table)")
print("=" * 75)
users = cur.execute("SELECT id, name, email, role FROM users").fetchall()
if users:
    print(f"{'ID':<4} | {'NAME':<22} | {'EMAIL':<30} | {'ROLE':<8}")
    print("-" * 75)
    for u in users:
        print(f"{u['id']:<4} | {u['name']:<22} | {u['email']:<30} | {u['role']:<8}")
else:
    print("No users found.")

print("\n" + "=" * 75)
print(" [ORDERS] CUSTOMER ORDERS & ITEMS PLACED (orders table)")
print("=" * 75)
orders = cur.execute("SELECT id, user_email, items, total, status, created_at FROM orders ORDER BY created_at DESC").fetchall()
if orders:
    for o in orders:
        print(f"\nOrder ID : {o['id']}")
        print(f"Customer : {o['user_email']}")
        print(f"Date     : {o['created_at']} | Status: {o['status']} | Total: ${o['total']:.2f}")
        try:
            items = json.loads(o['items'])
            item_list = ", ".join([f"{i.get('qty', 1)}x {i.get('title')} (${i.get('price')})" for i in items])
            print(f"Items    : {item_list}")
        except Exception:
            print(f"Items    : {o['items']}")
        print("-" * 75)
else:
    print("No orders placed yet.")

print("=" * 75 + "\n")
conn.close()
