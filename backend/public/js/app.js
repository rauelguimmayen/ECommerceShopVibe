// ─── ShopVibe Shared App Logic ───────────────────────────────────────────────

// ── Cart State (in-memory, synced from backend) ───────────────────────────────
const cart = {
  items: [],
  count: 0,
  total: 0,

  async load() {
    try {
      if (!api.getToken()) { this.items = []; this._update(); return; }
      this.items = await api.cart.get();
      this._update();
    } catch { this.items = []; this._update(); }
  },

  _update() {
    this.count = this.items.reduce((s, i) => s + i.quantity, 0);
    this.total = this.items.reduce((s, i) => s + i.price * i.quantity, 0);
    this._renderBadge();
    this._renderSlideOver();
  },

  _renderBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    badge.textContent = this.count;
    badge.classList.toggle('d-none', this.count === 0);
  },

  _renderSlideOver() {
    const body = document.getElementById('cart-body');
    const totalEl = document.getElementById('cart-total');
    if (!body) return;

    if (this.items.length === 0) {
      body.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-bag display-4 text-muted"></i>
          <p class="mt-3 text-muted">Your cart is empty</p>
          <a href="/pages/shop.html" class="btn btn-sv mt-2">Browse Products</a>
        </div>`;
    } else {
      body.innerHTML = this.items.map(item => `
        <div class="d-flex gap-3 align-items-center mb-3 cart-item-row">
          <img src="${item.product_image || 'https://via.placeholder.com/60'}"
               class="rounded" width="60" height="60" style="object-fit:cover" alt="${item.product_name}">
          <div class="flex-grow-1">
            <p class="mb-0 fw-semibold small">${item.product_name}</p>
            <p class="mb-1 text-violet small">$${(item.price * item.quantity).toFixed(2)}</p>
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-sm btn-outline-secondary px-2 py-0"
                      onclick="cart.changeQty('${item._id}', ${item.quantity - 1})">−</button>
              <span class="small fw-bold">${item.quantity}</span>
              <button class="btn btn-sm btn-outline-secondary px-2 py-0"
                      onclick="cart.changeQty('${item._id}', ${item.quantity + 1})">+</button>
            </div>
          </div>
          <button class="btn btn-sm text-danger p-0 ms-auto"
                  onclick="cart.remove('${item._id}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>`).join('');
    }
    if (totalEl) totalEl.textContent = `$${this.total.toFixed(2)}`;
  },

  async add(product_id) {
    try {
      if (!api.getToken()) { window.location.href = '/pages/login.html'; return; }
      await api.cart.add(product_id);
      await this.load();
      showToast('Added to cart!', 'success');
    } catch (e) { showToast(e.message, 'danger'); }
  },

  async changeQty(id, qty) {
    try {
      await api.cart.update(id, qty);
      await this.load();
    } catch (e) { showToast(e.message, 'danger'); }
  },

  async remove(id) {
    try {
      await api.cart.remove(id);
      await this.load();
    } catch (e) { showToast(e.message, 'danger'); }
  },

  async clear() {
    try {
      await api.cart.clear();
      await this.load();
    } catch (e) { showToast(e.message, 'danger'); }
  }
};

// ── Toast Notifications ───────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = 9999;
    document.body.appendChild(container);
  }

  const id = 'toast-' + Date.now();
  const icons = { success: 'bi-check-circle-fill', danger: 'bi-exclamation-circle-fill', warning: 'bi-exclamation-triangle-fill' };
  const html = `
    <div id="${id}" class="toast align-items-center text-bg-${type} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${icons[type] || 'bi-info-circle-fill'}"></i>
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', html);

  const toastEl = document.getElementById(id);
  const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// ── Auth Guard ────────────────────────────────────────────────────────────────
function requireAuth(redirectTo = '/pages/login.html') {
  if (!api.getToken()) {
    window.location.href = redirectTo;
    return null;
  }
  return api.getUser();
}

function requireAdmin() {
  const user = requireAuth();
  if (user && user.role !== 'admin') {
    window.location.href = '/index.html';
    return null;
  }
  return user;
}

// ── Navbar Render ─────────────────────────────────────────────────────────────
function renderNavUser() {
  const user = api.getUser();
  const navUser = document.getElementById('nav-user-section');
  if (!navUser) return;

  if (user) {
    const adminLink = user.role === 'admin'
      ? `<li><a class="dropdown-item" href="/pages/admin/dashboard.html"><i class="bi bi-speedometer2 me-2"></i>Admin</a></li><li><hr class="dropdown-divider"></li>`
      : '';
    navUser.innerHTML = `
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle d-flex align-items-center gap-1" href="#" data-bs-toggle="dropdown">
          <div class="bg-violet text-white rounded-circle d-flex align-items-center justify-content-center"
               style="width:28px;height:28px;font-size:12px;font-weight:700">
            ${(user.full_name || 'U')[0].toUpperCase()}
          </div>
          <span class="d-none d-md-inline small">${user.full_name?.split(' ')[0]}</span>
        </a>
        <ul class="dropdown-menu dropdown-menu-end shadow border-0">
          ${adminLink}
          <li><a class="dropdown-item" href="/pages/orders.html"><i class="bi bi-bag me-2"></i>My Orders</a></li>
          <li><a class="dropdown-item" href="/pages/change-password.html"><i class="bi bi-key me-2"></i>Change Password</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" href="#" onclick="api.auth.logout()"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
        </ul>
      </li>`;
  } else {
    navUser.innerHTML = `
      <li class="nav-item"><a class="nav-link" href="/pages/login.html">Login</a></li>
      <li class="nav-item"><a class="btn btn-sv btn-sm ms-1" href="/pages/register.html">Sign Up</a></li>`;
  }
}

// ── Product Card Builder ──────────────────────────────────────────────────────
function buildProductCard(p) {
  const discount = p.original_price && p.original_price > p.price
    ? Math.round((1 - p.price / p.original_price) * 100) : null;
  return `
    <div class="col">
      <div class="card product-card h-100 border-0 shadow-sm">
        <div class="position-relative overflow-hidden" style="height:220px">
          <img src="${p.image_url || 'https://via.placeholder.com/300x220?text=No+Image'}"
               class="card-img-top w-100 h-100 product-card-img"
               style="object-fit:cover" alt="${p.name}">
          ${discount ? `<span class="badge bg-danger position-absolute top-0 start-0 m-2">-${discount}%</span>` : ''}
          ${p.is_featured ? `<span class="badge bg-violet position-absolute top-0 end-0 m-2"><i class="bi bi-star-fill"></i></span>` : ''}
        </div>
        <div class="card-body d-flex flex-column">
          <span class="badge bg-light text-muted mb-2 text-capitalize">${p.category}</span>
          <h6 class="card-title fw-bold mb-1">${p.name}</h6>
          <p class="card-text text-muted small flex-grow-1 text-truncate-2">${p.description || ''}</p>
          <div class="d-flex align-items-center justify-content-between mt-auto pt-2">
            <div>
              <span class="fw-black text-violet fs-5">$${p.price.toFixed(2)}</span>
              ${p.original_price ? `<small class="text-decoration-line-through text-muted ms-1">$${p.original_price.toFixed(2)}</small>` : ''}
            </div>
            <div class="d-flex gap-2">
              <a href="/pages/product.html?id=${p._id}" class="btn btn-outline-secondary btn-sm"><i class="bi bi-eye"></i></a>
              <button class="btn btn-sv btn-sm" onclick="cart.add('${p._id}')">
                <i class="bi bi-cart-plus"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// ── Init on every page ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  renderNavUser();
  await cart.load();
});
