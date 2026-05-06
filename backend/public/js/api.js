// ─── ShopVibe API Client ──────────────────────────────────────────────────────
// Dynamically resolve the API base URL so the same build works
// locally (Express on :5000) AND on Render (same-origin /api).
const API_BASE = (() => {
  const { hostname, port, protocol } = window.location;
  // Running on Render or any real deployment → same-origin /api
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${protocol}//${hostname}/api`;
  }
  // Local dev: frontend served by Express on :5000
  return `${protocol}//${hostname}:${port || 5000}/api`;
})();

const api = {
  // ── helpers ──────────────────────────────────────────────────────────────────
  getToken() {
    return localStorage.getItem('sv_token');
  },
  setToken(t) {
    localStorage.setItem('sv_token', t);
  },
  clearToken() {
    localStorage.removeItem('sv_token');
    localStorage.removeItem('sv_user');
  },
  getUser() {
    const raw = localStorage.getItem('sv_user');
    return raw ? JSON.parse(raw) : null;
  },
  setUser(u) {
    localStorage.setItem('sv_user', JSON.stringify(u));
  },

  async request(path, options = {}) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  // ── auth ─────────────────────────────────────────────────────────────────────
  auth: {
    async register(full_name, email, password) {
      const data = await api.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name, email, password })
      });
      api.setToken(data.token);
      api.setUser(data.user);
      return data.user;
    },
    async login(email, password) {
      const data = await api.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      api.setToken(data.token);
      api.setUser(data.user);
      return data.user;
    },
    async me() {
      const data = await api.request('/auth/me');
      api.setUser(data.user);
      return data.user;
    },
    logout() {
      api.clearToken();
      window.location.href = '/pages/login.html';
    }
  },

  // ── products ─────────────────────────────────────────────────────────────────
  products: {
    list(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return api.request(`/products${qs ? '?' + qs : ''}`);
    },
    adminAll() {
      return api.request('/products/admin/all');
    },
    get(id) {
      return api.request(`/products/${id}`);
    },
    create(data) {
      return api.request('/products', { method: 'POST', body: JSON.stringify(data) });
    },
    update(id, data) {
      return api.request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    delete(id) {
      return api.request(`/products/${id}`, { method: 'DELETE' });
    }
  },

  // ── orders ───────────────────────────────────────────────────────────────────
  orders: {
    my() {
      return api.request('/orders/my');
    },
    all() {
      return api.request('/orders');
    },
    stats() {
      return api.request('/orders/stats/summary');
    },
    create(data) {
      return api.request('/orders', { method: 'POST', body: JSON.stringify(data) });
    },
    updateStatus(id, status) {
      return api.request(`/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
    }
  },

  // ── cart ─────────────────────────────────────────────────────────────────────
  cart: {
    get() {
      return api.request('/cart');
    },
    add(product_id, quantity = 1) {
      return api.request('/cart', { method: 'POST', body: JSON.stringify({ product_id, quantity }) });
    },
    update(id, quantity) {
      return api.request(`/cart/${id}`, { method: 'PUT', body: JSON.stringify({ quantity }) });
    },
    remove(id) {
      return api.request(`/cart/${id}`, { method: 'DELETE' });
    },
    clear() {
      return api.request('/cart', { method: 'DELETE' });
    }
  }
};

// Make available globally
window.api = api;
