require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const mongoose = require('mongoose');
const path    = require('path');

const authRoutes    = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes   = require('./routes/orders');
const cartRoutes    = require('./routes/cart');

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
// In production (Render) the frontend is served from the same origin,
// so CORS is only needed for local development.
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  process.env.RENDER_EXTERNAL_URL,   // set automatically by Render
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));

// ─── General Middleware ───────────────────────────────────────────────────────
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/cart',     cartRoutes);

// Health check (useful for Render's health-check setting)
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV, time: new Date() })
);

// ─── Serve Static Frontend ────────────────────────────────────────────────────
// Express serves the entire frontend from /public on the SAME origin.
// This means no CORS issues and no separate frontend server needed.
const PUBLIC = path.join(__dirname, 'public');
app.use(express.static(PUBLIC));

// SPA-style fallback: any non-API route returns the appropriate HTML file.
// We resolve .html files directly so /pages/shop → /pages/shop.html works.
app.get('*', (req, res) => {
  // Try to serve an exact .html match first
  const htmlPath = path.join(PUBLIC, req.path.endsWith('.html') ? req.path : req.path + '.html');
  const fs = require('fs');
  if (fs.existsSync(htmlPath)) return res.sendFile(htmlPath);

  // Fall back to index.html
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ─── Database + Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopvibe')
  .then(() => {
    console.log('✅  MongoDB connected');
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`🚀  Server running on http://0.0.0.0:${PORT}`)
    );
  })
  .catch(err => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });
