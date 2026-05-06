const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  product_name:  { type: String, required: true },
  product_image: { type: String },
  price:         { type: Number, required: true },
  quantity:      { type: Number, required: true, min: 1 }
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
  full_name: String,
  address:   String,
  city:      String,
  zip:       String,
  country:   String
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user_email:       { type: String, required: true },
    user_name:        { type: String },
    items:            [orderItemSchema],
    total_amount:     { type: Number, required: true, min: 0 },
    status:           {
      type: String,
      enum: ['processing', 'shipped', 'delivered', 'cancelled'],
      default: 'processing'
    },
    shipping_address: shippingAddressSchema,
    payment_method:   { type: String, default: 'simulated' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
