const express = require('express');
const router = express.Router();
const CartItem = require('../models/CartItem');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// All cart routes require auth
router.use(protect);

// GET /api/cart
router.get('/', async (req, res) => {
  try {
    const items = await CartItem.find({ user: req.user._id });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/cart  — add or increment
router.post('/', async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    const product = await Product.findById(product_id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    let item = await CartItem.findOne({ user: req.user._id, product: product_id });

    if (item) {
      item.quantity += quantity;
      await item.save();
    } else {
      item = await CartItem.create({
        user: req.user._id,
        product: product._id,
        product_name: product.name,
        product_image: product.image_url,
        price: product.price,
        quantity
      });
    }

    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/cart/:id  — update quantity
router.put('/:id', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity <= 0) {
      await CartItem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      return res.json({ message: 'Item removed.' });
    }
    const item = await CartItem.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { quantity },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Cart item not found.' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/cart/:id  — remove item
router.delete('/:id', async (req, res) => {
  try {
    await CartItem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Item removed.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/cart  — clear entire cart
router.delete('/', async (req, res) => {
  try {
    await CartItem.deleteMany({ user: req.user._id });
    res.json({ message: 'Cart cleared.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
