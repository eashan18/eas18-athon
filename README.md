# RetailCart | Multi-Category Shopping Application

A complete, resilient, full-stack application built for a **2-hour offline hackathon**.

---

## 🚀 Quick Start (Single Command)

```bash
cd retailcart
python run.py
```
- **Web Application**: Open [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger API Docs**: Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) (Show this to evaluators!)

---

## 📁 Directory Structure (Clean & Aligned)

```text
retailcart/
├── backend/
│   └── main.py          # Complete REST API + SQLite DB (Strictly < 250 lines!)
├── frontend/
│   ├── index.html       # Single-Page UI (Store, Cart, Orders, Admin, Modals)
│   ├── style.css        # Modern responsive design & animations
│   └── app.js           # Auth, Cart State, Order Engine, Live Tracker
├── run.py               # 1-Click launcher (starts server & opens browser)
└── README.md            # Demo pitch guide & architecture notes
```

---

## 🏆 Key Features & Differentiators ("Edge Points")

1. **Dual Persona (Storefront & Admin Mode)**:
   - Evaluator can click **⚙️ Admin Dashboard** in the top bar to view **real-time gross revenue**, **order count**, and **low stock alerts**.
   - Admin can change any order's live status (*Placed $\rightarrow$ Packed $\rightarrow$ Shipped $\rightarrow$ Delivered*).
2. **Visual Order Progress Tracker**:
   - Every order placed displays an interactive multi-step visual tracker (*Placed $\rightarrow$ Packed $\rightarrow$ Shipped $\rightarrow$ Delivered*).
3. **1-Click Printable Invoice**:
   - Order confirmation displays an itemized receipt with unique order ID, timestamp, and a 1-click **Print / Save Receipt** button.
4. **Resilient Dual-Mode Auth**:
   - **Google Sign-In**: Ready for Google Identity verification.
   - **1-Click Evaluator Demo**: Instant *Demo Buyer* & *Demo Admin* buttons so you never waste demo time typing credentials.
5. **Zero-Configuration SQLite Storage**:
   - `retailcart.db` is created automatically in the project folder. No cloud or database setup required.

---

## 🎤 2-Minute Evaluator Presentation Script

When demonstrating to the evaluator:

1. **Introduction (15s)**:
   > *"I have built RetailCart, an end-to-end multi-category retail platform supporting real-time catalog filtering, cart management, checkout, order tracking, and administrative operations."*
2. **Architecture & Technical Decisions (30s)**:
   > *"For the backend, I used Python FastAPI paired with an embedded SQLite database. This ensures high throughput, strict schema validation, zero-dependency offline persistence, and automatic OpenAPI documentation at `/docs`. The frontend is built with high-performance vanilla JavaScript and CSS, ensuring instantaneous load times without heavy build-step overhead."*
3. **Core Demonstration (45s)**:
   > 1. Show the **Storefront**: Filter by *Electronics*, search for *"Headphones"*, and add to cart.
   > 2. Open the **Cart Drawer**: Adjust quantities, click **Proceed to Checkout**, and place the order.
   > 3. Show the **Receipt & Printable Invoice**: Point out the unique Order ID and verified itemization.
   > 4. Go to **Orders**: Show the live **4-step fulfillment tracker** (*Placed $\rightarrow$ Delivered*).
4. **The Differentiator / Edge Point (30s)**:
   > *"Beyond standard retail features, I engineered an Admin Operations Dashboard. As an administrator, I can monitor real-time gross revenue, check inventory alerts, and advance dispatch status directly, which immediately updates the customer's live tracking timeline."*
   > Open `/docs` to show the clean REST API specification.

---

## 🔄 Adapting `main.py` to Any Other Problem Statement (2-Min Guide)

All Domain 3 problems follow the exact same catalog $\rightarrow$ action $\rightarrow$ tracking pattern. To adapt:

- **CareBook (Clinic Portal)**:
  - In `main.py`: Change `sample_products` to doctors/slots `("Dr. Smith - Cardiologist", "Cardiology", 50.0, 8, "🩺")`.
  - In `frontend/index.html`: Change button text *"Add to Cart"* to *"Book Appointment"*.
- **MediStore (Pharmacy)**:
  - In `main.py`: Change `sample_products` to medicines `("Amoxicillin 500mg", "Antibiotics", 14.50, 20, "💊")`.
- **LabConnect (Diagnostic Booking)**:
  - In `main.py`: Change `sample_products` to tests `("Complete Blood Count (CBC)", "Blood Test", 35.0, 50, "🔬")`.
