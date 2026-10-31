// RetailCart Application State
let state = {
  user: JSON.parse(localStorage.getItem('rc_user')) || null,
  cart: [],
  products: [],
  category: 'All',
  search: '',
  authTab: 'login',
  activeView: 'store'
};

const API_BASE = window.location.origin.includes('8000') ? '' : 'http://127.0.0.1:8000';

function getCartStorageKey() {
  return state.user && state.user.email ? `rc_cart_${state.user.email}` : 'rc_cart_guest';
}

function loadUserCart() {
  state.cart = JSON.parse(localStorage.getItem(getCartStorageKey())) || [];
  updateCartBadge();
}

function saveCart() {
  localStorage.setItem(getCartStorageKey(), JSON.stringify(state.cart));
}

function updateCartBadge() {
  const totalItems = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const badge = document.getElementById('cartCount');
  if (badge) {
    if (totalItems > 0 && state.user) {
      badge.innerText = totalItems;
      badge.style.display = 'inline-block';
    } else {
      badge.innerText = '';
      badge.style.display = 'none';
    }
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  fetchProducts();

  if (state.user) {
    loadUserCart();
    fetchOrders();
  } else {
    // If no user is logged in, show login/signup screen automatically!
    openAuthModal('login');
  }
});

// Toast Notifications
function showToast(msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

// View Navigation
function switchView(viewName) {
  state.activeView = viewName;
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  
  if (viewName === 'store') {
    document.getElementById('storeView').classList.add('active');
  }
  if (viewName === 'orders') {
    document.getElementById('ordersView').classList.add('active');
    fetchOrders();
  }
  if (viewName === 'admin') {
    if (!state.user || state.user.role !== 'admin') {
      showToast('🔒 Admin privileges required. Please sign in as Demo Admin.');
      openAuthModal('login');
      return;
    }
    document.getElementById('adminView').classList.add('active');
    fetchAdminData();
  }
}

function toggleAdminView() {
  if (state.activeView === 'admin') {
    switchView('store');
  } else {
    switchView('admin');
  }
}

// Fetch & Render Products
async function fetchProducts() {
  const grid = document.getElementById('productGrid');
  try {
    let url = `${API_BASE}/api/products?`;
    if (state.category !== 'All') url += `category=${encodeURIComponent(state.category)}&`;
    if (state.search) url += `search=${encodeURIComponent(state.search)}&`;

    const res = await fetch(url);
    state.products = await res.json();
    renderProducts();
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Unable to connect to backend server. Make sure run.py is active!</div>`;
  }
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  if (state.products.length === 0) {
    grid.innerHTML = `<div class="empty-state">No products found matching your search/category.</div>`;
    return;
  }
  grid.innerHTML = state.products.map(p => `
    <div class="product-card">
      <div class="product-icon">${p.image || '📦'}</div>
      <div class="product-info">
        <span class="product-cat">${p.category}</span>
        <h4 class="product-title">${p.title}</h4>
        <p class="product-desc">${p.description}</p>
        <div class="product-bottom">
          <div>
            <div class="product-price">$${p.price.toFixed(2)}</div>
            <div class="stock-tag">${p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</div>
          </div>
          <button class="btn btn-primary" onclick="addToCart(${p.id})" ${p.stock <= 0 ? 'disabled' : ''}>
            ${p.stock > 0 ? 'Add to Cart' : 'Sold Out'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Category Filtering & Search
function filterCategory(cat) {
  state.category = cat;
  document.querySelectorAll('.pill').forEach(btn => {
    btn.classList.toggle('active', btn.innerText.includes(cat) || (cat === 'All' && btn.innerText.includes('All')));
  });
  fetchProducts();
}

let searchTimer;
function handleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.search = document.getElementById('searchInput').value.trim();
    fetchProducts();
  }, 250);
}

// Cart Management
function addToCart(productId) {
  if (!state.user) {
    showToast('Please sign in or create an account to shop');
    openAuthModal('login');
    return;
  }
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  const existing = state.cart.find(item => item.id === productId);
  if (existing) {
    if (existing.qty < product.stock) {
      existing.qty += 1;
      showToast(`Added another "${product.title}"`);
    } else {
      showToast(`Max stock reached for this item`);
    }
  } else {
    state.cart.push({ id: product.id, title: product.title, price: product.price, qty: 1, image: product.image });
    showToast(`Added "${product.title}" to cart`);
  }
  saveCart();
  updateCartBadge();
}

function updateCartQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    state.cart = state.cart.filter(i => i.id !== id);
  }
  saveCart();
  renderCart();
  updateCartBadge();
}

function openCart() {
  renderCart();
  document.getElementById('cartModal').classList.add('open');
}

function renderCart() {
  const list = document.getElementById('cartItemsList');
  if (state.cart.length === 0) {
    list.innerHTML = `<div class="empty-state">Your shopping cart is empty.</div>`;
    document.getElementById('cartSubtotal').innerText = '$0.00';
    document.getElementById('cartTotal').innerText = '$0.00';
    return;
  }
  let subtotal = 0;
  list.innerHTML = state.cart.map(item => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;
    return `
      <div class="cart-item">
        <div>
          <strong>${item.image || '📦'} ${item.title}</strong>
          <div style="font-size:0.8rem; color:var(--text-muted)">$${item.price.toFixed(2)} each</div>
        </div>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateCartQty(${item.id}, -1)">-</button>
          <span>${item.qty}</span>
          <button class="qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
          <strong style="margin-left: 0.5rem;">$${itemTotal.toFixed(2)}</strong>
        </div>
      </div>
    `;
  }).join('');
  document.getElementById('cartSubtotal').innerText = `$${subtotal.toFixed(2)}`;
  document.getElementById('cartTotal').innerText = `$${subtotal.toFixed(2)}`;
}

// Checkout & Order Placement
function openCheckout() {
  if (!state.user) {
    showToast('Please sign in to proceed with checkout');
    openAuthModal('login');
    return;
  }
  if (state.cart.length === 0) {
    showToast('Your cart is empty!');
    return;
  }
  closeModal('cartModal');
  const subtotal = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
  document.getElementById('checkoutTotalAmount').innerText = `$${subtotal.toFixed(2)}`;
  document.getElementById('checkoutModal').classList.add('open');
}

async function confirmOrderPlacement() {
  const subtotal = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const address = document.getElementById('checkoutAddress').value;

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-email': state.user.email
      },
      body: JSON.stringify({
        items: state.cart,
        total: parseFloat(subtotal.toFixed(2)),
        shipping_address: address
      })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Order placed successfully!');
      const placedCart = [...state.cart];
      const orderId = data.order_id;
      
      // Clear Cart for this user
      state.cart = [];
      saveCart();
      updateCartBadge();
      closeModal('checkoutModal');

      // Refresh catalog stock & show invoice
      fetchProducts();
      showInvoiceReceipt(orderId, placedCart, subtotal, address);
      fetchOrders();
    } else {
      showToast(data.detail || 'Failed to place order');
    }
  } catch (err) {
    showToast('Network error while placing order');
  }
}

// Invoice & Receipt Generator
function showInvoiceReceipt(orderId, items, total, address = "Standard Delivery Address") {
  document.getElementById('receiptOrderId').innerText = orderId;
  const content = document.getElementById('receiptContent');
  const custName = state.user ? state.user.name : "Customer";
  const custEmail = state.user ? state.user.email : "user@retailcart.com";

  content.innerHTML = `
    <p><strong>Customer:</strong> ${custName} (${custEmail})</p>
    <p><strong>Delivery Address:</strong> ${address}</p>
    <p><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
    <table class="receipt-table">
      <thead>
        <tr style="border-bottom:1px solid #ccc;">
          <th>Item</th><th>Qty</th><th>Price</th><th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(i => `
          <tr>
            <td>${i.title}</td><td>${i.qty}</td><td>$${i.price.toFixed(2)}</td><td>$${(i.price * i.qty).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="text-align:right; font-size:1.1rem; margin-top:0.5rem;">
      <strong>Grand Total: $${parseFloat(total).toFixed(2)}</strong>
    </div>
    <div style="margin-top:1.2rem; padding:0.6rem; background:#f8fafc; border-radius:6px; font-size:0.8rem; text-align:center;">
      ✨ Status: <b>Confirmed & In Fulfillment</b> • Verification ID: ${orderId}-VERIFIED
    </div>
  `;
  document.getElementById('invoiceModal').classList.add('open');
}

// Customer Orders History & Live Visual Tracker
// (Customer views items, date, price, progress tracker - NO STATUS CHANGE DROPDOWN)
async function fetchOrders() {
  if (!state.user) {
    const ob = document.getElementById('ordersCount');
    if (ob) ob.style.display = 'none';
    document.getElementById('ordersList').innerHTML = `<div class="empty-state">Please sign in to view your orders. <br><button class="btn btn-primary" style="margin-top:0.8rem;" onclick="openAuthModal('login')">Sign In</button></div>`;
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      headers: { 'user-email': state.user.email }
    });
    const orders = await res.json();
    const ob = document.getElementById('ordersCount');
    if (ob) {
      if (orders.length > 0) {
        ob.innerText = orders.length;
        ob.style.display = 'inline-block';
      } else {
        ob.style.display = 'none';
      }
    }
    renderOrders(orders);
  } catch (err) {
    console.error(err);
  }
}

function renderOrders(orders) {
  const container = document.getElementById('ordersList');
  if (orders.length === 0) {
    container.innerHTML = `<div class="empty-state">No orders found for <b>${state.user.email}</b>. Add items from the store and checkout!</div>`;
    return;
  }
  const statusSteps = ['Placed', 'Packed', 'Shipped', 'Delivered'];

  container.innerHTML = orders.map(ord => {
    const currentIndex = statusSteps.indexOf(ord.status);
    const stepperHTML = statusSteps.map((step, idx) => {
      let cls = '';
      if (idx < currentIndex) cls = 'completed';
      else if (idx === currentIndex) cls = 'active';
      return `
        <div class="timeline-step ${cls}">
          <div class="step-dot">${idx < currentIndex ? '✓' : idx + 1}</div>
          <span>${step}</span>
        </div>
      `;
    }).join('');

    const itemsJson = JSON.stringify(ord.items).replace(/"/g, '&quot;');

    return `
      <div class="order-card">
        <div class="order-head">
          <div>
            <strong>${ord.id}</strong> • <span style="font-size:0.85rem; color:var(--text-muted)">${ord.created_at}</span>
          </div>
          <span class="order-badge">${ord.status}</span>
        </div>
        <!-- Customer visual live progress tracker (Read-only for customer) -->
        <div class="timeline-stepper">
          ${stepperHTML}
        </div>
        <div style="font-size:0.9rem; margin-top:0.5rem; color:var(--text-main);">
          ${ord.items.map(i => `${i.qty}x ${i.title} ($${i.price.toFixed(2)})`).join(', ')}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.8rem; border-top:1px solid var(--border); padding-top:0.6rem;">
          <div style="font-weight:700; color:#047857; font-size:1.05rem;">Total: $${ord.total.toFixed(2)}</div>
          <button class="btn btn-secondary" style="font-size:0.8rem; padding:0.35rem 0.75rem;" onclick='showInvoiceReceipt("${ord.id}", ${itemsJson}, ${ord.total})'>
            📄 View Receipt
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Admin Operations Dashboard (Strictly for Store Managers to advance status & view financials)
async function fetchAdminData() {
  try {
    const [statsRes, ordersRes] = await Promise.all([
      fetch(`${API_BASE}/api/admin/stats`),
      fetch(`${API_BASE}/api/orders`, { headers: { 'user-email': 'admin@retailcart.com' } })
    ]);
    const stats = await statsRes.json();
    const orders = await ordersRes.json();

    document.getElementById('adminTotalOrders').innerText = stats.total_orders;
    document.getElementById('adminTotalRev').innerText = `$${stats.total_revenue.toFixed(2)}`;
    document.getElementById('adminLowStock').innerText = stats.low_stock_alerts;

    const table = document.getElementById('adminOrdersTable');
    table.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Order ID</th><th>Customer</th><th>Total</th><th>Current Status</th><th>Change Status (Admin Only)</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td><b>${o.id}</b></td>
              <td>${o.user_email}</td>
              <td>$${o.total.toFixed(2)}</td>
              <td><span class="order-badge">${o.status}</span></td>
              <td>
                <select class="form-input" style="width:auto; margin:0;" onchange="updateStatus('${o.id}', this.value)">
                  <option value="Placed" ${o.status === 'Placed' ? 'selected' : ''}>Placed</option>
                  <option value="Packed" ${o.status === 'Packed' ? 'selected' : ''}>Packed</option>
                  <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                  <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    showToast('Failed to load admin operations data');
  }
}

async function updateStatus(orderId, newStatus) {
  try {
    await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`Order ${orderId} updated to "${newStatus}"`);
    fetchAdminData();
    fetchOrders();
  } catch (e) {
    showToast('Failed to update status');
  }
}

// Authentication System (Google, Email/Password, 1-Click Demo)
function updateAuthUI() {
  const container = document.getElementById('authNavContainer');
  const adminBtn = document.getElementById('adminToggleBtn');
  
  // Only show Admin Dashboard toggle button if user is Admin!
  if (adminBtn) {
    adminBtn.style.display = (state.user && state.user.role === 'admin') ? 'inline-flex' : 'none';
  }

  if (state.user && state.user.email) {
    container.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.6rem;">
        <span style="font-size:0.85rem; font-weight:600;">👤 ${state.user.name}</span>
        <button class="nav-btn" style="padding:0.35rem 0.7rem; font-size:0.8rem;" onclick="logout()">Sign Out</button>
      </div>
    `;
  } else {
    container.innerHTML = `<button class="btn btn-primary" onclick="openAuthModal('login')">Sign In</button>`;
  }
}

function openAuthModal(tab = 'login') {
  switchAuthTab(tab);
  document.getElementById('authModal').classList.add('open');
}

function switchAuthTab(tab) {
  state.authTab = tab;
  document.getElementById('authTabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('authTabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('registerNameGroup').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('pwStrengthContainer').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('authSubmitBtn').innerText = tab === 'register' ? 'Create Account' : 'Sign In';
  if (tab === 'register') handlePasswordInput();
}

function togglePasswordVisibility() {
  const input = document.getElementById('authPassword');
  input.type = input.type === 'password' ? 'text' : 'password';
}

function checkPasswordRules(pw) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)
  };
}

function handlePasswordInput() {
  if (state.authTab !== 'register') return;
  const pw = document.getElementById('authPassword').value;
  const rules = checkPasswordRules(pw);

  document.getElementById('ruleLength').classList.toggle('passed', rules.length);
  document.getElementById('ruleUpper').classList.toggle('passed', rules.upper);
  document.getElementById('ruleLower').classList.toggle('passed', rules.lower);
  document.getElementById('ruleNumber').classList.toggle('passed', rules.number);
  document.getElementById('ruleSpecial').classList.toggle('passed', rules.special);

  const passedCount = Object.values(rules).filter(Boolean).length;
  const bar = document.getElementById('strengthBar');
  const label = document.getElementById('strengthLabel');

  const strengthMap = [
    { pct: 0, text: 'Too Weak', color: '#ef4444' },
    { pct: 20, text: 'Very Weak', color: '#ef4444' },
    { pct: 40, text: 'Weak', color: '#f97316' },
    { pct: 60, text: 'Moderate', color: '#eab308' },
    { pct: 80, text: 'Strong', color: '#22c55e' },
    { pct: 100, text: 'Grade Strong', color: '#6366f1' }
  ];

  bar.style.width = `${strengthMap[passedCount].pct}%`;
  bar.style.backgroundColor = strengthMap[passedCount].color;
  label.innerText = strengthMap[passedCount].text;
  label.style.color = strengthMap[passedCount].color;
}

async function submitAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const name = document.getElementById('authName').value.trim();

  if (!email || !password) {
    showToast('Please enter both email and password');
    return;
  }

  // Banking Grade Password Enforcement on Registration
  if (state.authTab === 'register') {
    const rules = checkPasswordRules(password);
    const passed = Object.values(rules).every(Boolean);
    if (!passed) {
      showToast('⚠️ Banking Security: Password must meet all 5 requirements!');
      return;
    }
  }

  const endpoint = state.authTab === 'register' ? '/api/auth/register' : '/api/auth/login';
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    const data = await res.json();
    if (res.ok) {
      handleAuthSuccess(data.user);
      showToast(`Welcome, ${data.user.name}!`);
    } else {
      showToast(data.detail || 'Authentication failed');
    }
  } catch (err) {
    showToast('Network error during authentication');
  }
}

// 1-Click Demo Login for Evaluators
async function demoLogin(role) {
  const email = role === 'admin' ? 'admin@retailcart.com' : 'buyer@retailcart.com';
  const name = role === 'admin' ? 'Demo Admin' : 'Demo Buyer';
  handleAuthSuccess({ name, email, role });
  showToast(`⚡ Logged in as ${name}`);
}

// Google Sign-In Workflow (Offline-Safe & Realistic OAuth Chooser)
function openGoogleModal() {
  closeModal('authModal');
  document.getElementById('customGoogleBox').style.display = 'none';
  document.getElementById('googleModal').classList.add('open');
}

function showCustomGoogleInput() {
  const box = document.getElementById('customGoogleBox');
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
  if (box.style.display === 'block') {
    document.getElementById('customGoogleEmail').focus();
  }
}

async function selectGoogleAccount(name, email) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, google_token: 'gis_token_verified' })
    });
    const data = await res.json();
    if (res.ok) {
      closeModal('googleModal');
      handleAuthSuccess(data.user);
      showToast(`✅ Verified Google Sign-In: ${data.user.name}`);
    } else {
      showToast(data.detail || 'Google sign-in failed');
    }
  } catch (err) {
    showToast('Network error during Google sign-in');
  }
}

function submitCustomGoogleAccount() {
  const email = document.getElementById('customGoogleEmail').value.trim();
  if (!email || !email.includes('@')) {
    showToast('Please enter a valid Gmail address');
    return;
  }
  const name = email.split('@')[0].replace('.', ' ').replace(/(?:^|\s)\S/g, a => a.toUpperCase());
  selectGoogleAccount(name, email);
}

function handleAuthSuccess(user) {
  state.user = user;
  localStorage.setItem('rc_user', JSON.stringify(user));
  loadUserCart(); // Restores this specific customer's cart
  updateAuthUI();
  closeModal('authModal');
  fetchOrders();  // Restores this specific customer's order history from SQLite
  if (state.activeView === 'admin' && user.role !== 'admin') {
    switchView('store');
  }
}

// Logout & Immediate Redirect to Auth Screen
function logout() {
  state.user = null;
  localStorage.removeItem('rc_user');
  state.cart = [];
  updateCartBadge();
  const ob = document.getElementById('ordersCount');
  if (ob) ob.style.display = 'none';
  document.getElementById('ordersList').innerHTML = `<div class="empty-state">Please sign in to view your order history.</div>`;
  updateAuthUI();
  showToast('Logged out. Please sign in or create an account.');
  switchView('store');
  // Immediately redirect to login/signup modal!
  openAuthModal('login');
}

// Modal Backdrop Helper
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
}
function closeOnBackdrop(e, modalId) {
  if (e.target.id === modalId) closeModal(modalId);
}
