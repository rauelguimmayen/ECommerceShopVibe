const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
// GET /api/orders/my  — current user's orders
router.get('/my', protect, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ message: 'Log in with a non-admin account' });
    }

    const orders = await Order.find({ user: req.user._id }).sort('-createdAt').limit(50);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// GET /api/orders  — admin: all orders
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find().sort('-createdAt').limit(200).populate('user', 'full_name email');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/orders  — place order
router.post('/', protect, async (req, res) => {
  try {
    const { items, total_amount, shipping_address, payment_method } = req.body;
    if (!items || !items.length) return res.status(400).json({ message: 'Order must contain items.' });

    const order = await Order.create({
      user: req.user._id,
      user_email: req.user.email,
      user_name: req.user.full_name,
      items,
      total_amount,
      shipping_address,
      payment_method: payment_method || 'simulated'
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/orders/:id/status  — admin: update status
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/orders/stats  — admin: aggregate stats
router.get('/stats/summary', protect, adminOnly, async (req, res) => {
  try {
    const [orderStats] = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total_amount' }
        }
      }
    ]);
    res.json(orderStats || { totalOrders: 0, totalRevenue: 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
