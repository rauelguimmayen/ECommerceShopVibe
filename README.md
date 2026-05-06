# ShopVibe 🛍️

A full-stack e-commerce app built with **Bootstrap 5 + Vanilla JS** (frontend) and **Node.js + Express + MongoDB** (backend), deployable to **Render** in minutes.

---

## Architecture

```
shopvibe/
├── render.yaml              ← Render deployment blueprint
├── .gitignore
├── README.md
└── backend/                 ← Root of the deployed service
    ├── server.js            ← Express: serves API + static frontend
    ├── seed.js              ← Populates DB with 12 products + admin user
    ├── package.json
    ├── .env.example
    ├── middleware/
    │   └── auth.js          ← JWT protect + adminOnly
    ├── models/
    │   ├── User.js
    │   ├── Product.js
    │   ├── Order.js
    │   └── CartItem.js
    ├── routes/
    │   ├── auth.js
    │   ├── products.js
    │   ├── orders.js
    │   └── cart.js
    └── public/              ← Static frontend (served by Express)
        ├── index.html       ← Home
        ├── css/style.css
        ├── js/
        │   ├── api.js       ← Fetch wrapper (auto-detects localhost vs Render)
        │   └── app.js       ← Cart state, toasts, navbar inject
        ├── components/
        │   └── navbar.html  ← Shared navbar (loaded via fetch)
        └── pages/
            ├── shop.html
            ├── product.html
            ├── checkout.html
            ├── orders.html
            ├── login.html
            ├── register.html
            ├── 404.html
            └── admin/
                ├── dashboard.html
                ├── products.html
                └── orders.html
```

**Key design:** Express serves both the API (`/api/*`) and the entire frontend (`/public`) from the **same origin**. No CORS, no separate frontend server, one Render service.

---

## Deploy to Render

### Step 1 — MongoDB Atlas (free)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → create a free **M0** cluster.
2. Create a database user (username + password — no special chars in password).
3. Under **Network Access** → Add IP Address → **Allow Access From Anywhere** (`0.0.0.0/0`).
4. Click **Connect** → **Drivers** → copy the connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/shopvibe?retryWrites=true&w=majority
   ```

### Step 2 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/shopvibe.git
git push -u origin main
```

### Step 3 — Create Render Web Service

**Option A — Blueprint (auto)**
1. In Render dashboard → **New** → **Blueprint**.
2. Connect your GitHub repo — Render reads `render.yaml` automatically.
3. In the environment variables panel, set `MONGO_URI` to the Atlas connection string from Step 1.
4. Click **Apply** — deployment starts.

**Option B — Manual**
1. Render dashboard → **New** → **Web Service** → connect your repo.
2. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Node version**: 18+
3. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | *(your Atlas URI)* |
   | `JWT_SECRET` | *(any long random string)* |
   | `JWT_EXPIRES_IN` | `7d` |
4. Click **Create Web Service**.

### Step 4 — Seed the Database

Once the service is live, open Render's **Shell** tab and run:

```bash
node seed.js
```

This creates 12 sample products and an admin account:
- **Email**: `admin@shopvibe.com`
- **Password**: `admin123`

*(Change this password after first login via the database or add a change-password route.)*

Your app is now live at `https://shopvibe.onrender.com` (or your custom domain).

---

## Run Locally

```bash
cd backend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# Edit .env — set MONGO_URI (local or Atlas) and JWT_SECRET

# Seed sample data
node seed.js

# Start server (frontend + API on same port)
npm run dev          # with nodemon (auto-reload)
# or
npm start            # plain node
```

Open **http://localhost:5000** — frontend and API are both served from port 5000.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Defaults to `5000` locally; Render sets this automatically |
| `MONGO_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Secret key for signing JWTs (use a long random string) |
| `JWT_EXPIRES_IN` | No | Token lifetime, default `7d` |
| `NODE_ENV` | No | Set to `production` on Render |

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login → JWT |
| GET | `/api/auth/me` | Bearer | Current user |

### Products
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | — | List active products (`?category=&featured=&search=&sort=&limit=`) |
| GET | `/api/products/admin/all` | Admin | All products incl. inactive |
| GET | `/api/products/:id` | — | Single product |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Delete product |

### Cart
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cart` | Bearer | Get cart |
| POST | `/api/cart` | Bearer | Add/increment item |
| PUT | `/api/cart/:id` | Bearer | Update quantity |
| DELETE | `/api/cart/:id` | Bearer | Remove item |
| DELETE | `/api/cart` | Bearer | Clear cart |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/orders/my` | Bearer | User's orders |
| POST | `/api/orders` | Bearer | Place order |
| GET | `/api/orders` | Admin | All orders |
| PUT | `/api/orders/:id/status` | Admin | Update status |
| GET | `/api/orders/stats/summary` | Admin | Revenue stats |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Bootstrap 5.3, Bootstrap Icons, Vanilla JS (ES6+) |
| Backend | Node.js 18+, Express 4 |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Hosting | Render (single Web Service) |
| DB Hosting | MongoDB Atlas (M0 free tier) |
