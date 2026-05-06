# 🛍️ ShopVibe

A full-stack e-commerce application converted from React/Base44 to:

- **Frontend:** HTML5 · Bootstrap 5 · Vanilla JavaScript
- **Backend:** Node.js · Express.js · MongoDB (Mongoose)

---

## 📁 Project Structure

```
shopvibe/
├── backend/                   # Node.js + Express API
│   ├── models/
│   │   ├── User.js            # User schema (auth + roles)
│   │   ├── Product.js         # Product schema
│   │   ├── Order.js           # Order schema
│   │   └── CartItem.js        # Cart item schema
│   ├── routes/
│   │   ├── auth.js            # POST /register, POST /login, GET /me
│   │   ├── products.js        # CRUD products (admin) + public listing
│   │   ├── orders.js          # Place & manage orders
│   │   └── cart.js            # Cart CRUD (per-user)
│   ├── middleware/
│   │   └── auth.js            # JWT protect + adminOnly middleware
│   ├── .env.example           # Environment variable template
│   ├── package.json
│   └── server.js              # Express app entry point
│
└── frontend/                  # Static HTML/CSS/JS
    ├── index.html             # Home page
    ├── components/
    │   └── navbar.html        # Shared navbar + cart offcanvas
    ├── css/
    │   └── style.css          # Custom styles (brand colors, components)
    ├── js/
    │   ├── api.js             # Fetch-based API client
    │   └── app.js             # Shared cart state, toast, auth guard
    ├── pages/
    │   ├── shop.html          # Product listing with filters
    │   ├── product.html       # Product detail
    │   ├── checkout.html      # 2-step checkout (shipping + payment)
    │   ├── orders.html        # User order history
    │   ├── login.html         # Login form
    │   ├── register.html      # Registration form
    │   └── admin/
    │       ├── dashboard.html # Admin stats + recent orders
    │       ├── products.html  # CRUD products table + modal
    │       └── orders.html    # All orders with status management
    └── package.json
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js v18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 2. Backend Setup

```bash
cd backend
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET

npm run dev    # development (nodemon)
# or
npm start      # production
```

The API server starts on **http://localhost:5000**

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start      # serves on http://localhost:3000
```

Or simply open `frontend/index.html` with any static server (VS Code Live Server, nginx, etc.).

---

## 🔑 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | API server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/shopvibe` |
| `JWT_SECRET` | Secret key for JWT signing | *(required — change this!)* |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:3000` |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login, returns JWT | Public |
| GET | `/api/auth/me` | Get current user | 🔒 JWT |

### Products
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/products` | List active products (`?category=&featured=&search=`) | Public |
| GET | `/api/products/admin/all` | All products (including inactive) | 🔒 Admin |
| GET | `/api/products/:id` | Get single product | Public |
| POST | `/api/products` | Create product | 🔒 Admin |
| PUT | `/api/products/:id` | Update product | 🔒 Admin |
| DELETE | `/api/products/:id` | Delete product | 🔒 Admin |

### Cart
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/cart` | Get user's cart | 🔒 JWT |
| POST | `/api/cart` | Add item (or increment qty) | 🔒 JWT |
| PUT | `/api/cart/:id` | Update item quantity | 🔒 JWT |
| DELETE | `/api/cart/:id` | Remove one item | 🔒 JWT |
| DELETE | `/api/cart` | Clear entire cart | 🔒 JWT |

### Orders
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/orders/my` | Current user's orders | 🔒 JWT |
| GET | `/api/orders` | All orders | 🔒 Admin |
| GET | `/api/orders/stats/summary` | Revenue + count stats | 🔒 Admin |
| POST | `/api/orders` | Place order | 🔒 JWT |
| PUT | `/api/orders/:id/status` | Update order status | 🔒 Admin |

---

## 👤 Creating an Admin User

After registering a user, update the role directly in MongoDB:

```js
// In MongoDB shell or Compass
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

Or seed via a script using `mongoose`.

---

## 🎨 Frontend Architecture

### API Client (`js/api.js`)
- Central `api` object with namespaced methods (`api.auth`, `api.products`, `api.cart`, `api.orders`)
- JWT stored in `localStorage` and auto-attached to every request
- User cached in `localStorage` for instant UI rendering

### Shared App (`js/app.js`)
- **`cart`** — global cart state object. Loads from backend on every page, syncs badge + slide-over
- **`showToast(msg, type)`** — Bootstrap 5 toast notifications
- **`buildProductCard(p)`** — reusable product card HTML builder
- **`renderNavUser()`** — injects user dropdown or login/register links into navbar
- **`requireAuth()` / `requireAdmin()`** — page-level auth guards

### Navbar
The navbar is in `components/navbar.html` and fetched + injected on every page via `fetch()`. This keeps it DRY without a build step.

---

## 🔐 Security Notes

- Passwords hashed with **bcryptjs** (12 salt rounds)
- JWTs expire in 7 days by default
- Admin routes protected by `protect` + `adminOnly` middleware
- Cart items scoped to `req.user._id` — users can't touch others' carts
- **Always change `JWT_SECRET`** in production to a long random string

---

## 📦 Product Categories

`clothing` · `electronics` · `accessories` · `footwear` · `home` · `sports`

---

## 🛒 Checkout Flow

1. User must be logged in (redirects to `/pages/login.html` if not)
2. **Step 1 — Shipping:** Fill name, address, city, ZIP, country
3. **Step 2 — Payment:** Simulated demo payment (no real payment gateway)
4. Order is created in MongoDB, cart is cleared, success screen shown

---

## 🎨 Brand Colors

| Token | Hex |
|---|---|
| Violet (primary) | `#7C3AED` |
| Violet Dark | `#6D28D9` |
| Orange (accent) | `#FF4D00` |
| Dark | `#0A0A0B` |
| Gray (bg) | `#F4F4F5` |
