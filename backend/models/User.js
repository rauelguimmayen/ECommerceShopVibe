const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const userSchema = new mongoose.Schema(
  {
    full_name:             { type: String, required: true, trim: true },
    email:                 { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:              { type: String, minlength: 6, select: false },
    role:                  { type: String, enum: ['user', 'admin'], default: 'user' },
    googleId:              { type: String, unique: true, sparse: true },
    avatar:                { type: String },
    resetPasswordToken:    { type: String },
    resetPasswordExpires:  { type: Date }
  },
  { timestamps: true }
);

// Hash password before saving (only if password is set/changed)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare plain password against hash
userSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

// Generate a password-reset token; stores SHA-256 hash in DB, returns raw token
userSchema.methods.createPasswordResetToken = function () {
  const raw = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken   = crypto.createHash('sha256').update(raw).digest('hex');
  this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return raw;
};

// Never expose password or reset fields in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
