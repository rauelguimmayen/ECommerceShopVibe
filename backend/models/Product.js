const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true, trim: true },
    description:    { type: String, trim: true },
    price:          { type: Number, required: true, min: 0 },
    original_price: { type: Number, min: 0 },
    category:       {
      type: String,
      enum: ['clothing', 'electronics', 'accessories', 'footwear', 'home', 'sports'],
      required: true
    },
    image_url:  { type: String },
    stock:      { type: Number, default: 0, min: 0 },
    is_active:  { type: Boolean, default: true },
    is_featured:{ type: Boolean, default: false },
    tags:       [{ type: String }]
  },
  { timestamps: true }
);

// Text index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
