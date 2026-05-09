const mongoose = require('mongoose');
const crypto   = require('crypto');

const webhookSchema = new mongoose.Schema(
  {
    // Who owns this webhook (admin only can create)
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    url:        { type: String, required: true, trim: true },
    // Events to subscribe to; ['*'] means all
    events:     { type: [String], default: ['*'] },
    secret:     { type: String },   // HMAC signing secret
    active:     { type: Boolean, default: true },
    // Rolling log of last 10 deliveries
    deliveries: {
      type: [{
        event:      String,
        statusCode: Number,
        success:    Boolean,
        error:      String,
        sentAt:     { type: Date, default: Date.now }
      }],
      default: []
    }
  },
  { timestamps: true }
);

// Auto-generate a signing secret if not provided
webhookSchema.pre('save', function (next) {
  if (!this.secret) this.secret = crypto.randomBytes(24).toString('hex');
  next();
});

module.exports = mongoose.model('Webhook', webhookSchema);
