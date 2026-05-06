const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    product_name:  { type: String, required: true },
    product_image: { type: String },
    price:         { type: Number, required: true },
    quantity:      { type: Number, default: 1, min: 1 }
  },
  { timestamps: true }
);

// One cart item per user per product
cartItemSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('CartItem', cartItemSchema);
