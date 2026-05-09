const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User     = require('../models/User');
const { protect } = require('../middleware/auth');
const { emit } = require('../utils/webhookEmitter');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password)
      return res.status(400).json({ message: 'All fields are required.' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use.' });

    const user = await User.create({ full_name, email, password });

    // Fire webhook (non-blocking)
    emit('user.registered', { userId: user._id, email: user.email, method: 'email' }).catch(() => {});

    res.status(201).json({ token: signToken(user._id), user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password.' });

    res.json({ token: signToken(user._id), user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/google ─────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential required.' });

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (user) {
      if (!user.googleId) { user.googleId = googleId; user.avatar = user.avatar || picture; await user.save(); }
    } else {
      user = await User.create({ full_name: name, email, googleId, avatar: picture });
      emit('user.registered', { userId: user._id, email: user.email, method: 'google' }).catch(() => {});
    }

    res.json({ token: signToken(user._id), user });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user || user.googleId) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get('host')}/pages/reset-password.html?token=${rawToken}`;

    // Send email
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from:    `"ShopVibe" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to:      user.email,
      subject: 'Reset your ShopVibe password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <div style="background:#7C3AED;padding:24px;border-radius:12px 12px 0 0;text-align:center">
            <span style="color:#fff;font-size:22px;font-weight:900">⚡ ShopVibe</span>
          </div>
          <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e9ecef">
            <h2 style="margin:0 0 8px;font-size:20px">Reset your password</h2>
            <p style="color:#6c757d;margin:0 0 24px">Hi ${user.full_name}, click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
            <a href="${resetURL}"
               style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;
                      padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">
              Reset Password
            </a>
            <p style="color:#adb5bd;font-size:12px;margin:24px 0 0">
              If you didn't request this, you can safely ignore this email.<br>
              Link expires at ${user.resetPasswordExpires.toUTCString()}
            </p>
          </div>
        </div>
      `
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    // Clean up token if email failed
    try {
      const user = await User.findOne({ email: req.body.email });
      if (user) { user.resetPasswordToken = undefined; user.resetPasswordExpires = undefined; await user.save({ validateBeforeSave: false }); }
    } catch (_) {}
    res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ message: 'Token and new password are required.' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken:   hashed,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user)
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });

    user.password             = password;
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Fire webhook (non-blocking)
    emit('user.password_reset', { userId: user._id, email: user.email }).catch(() => {});

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/change-password (logged-in users) ─────────────────────────
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Current and new password are required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });

    const user = await User.findById(req.user._id).select('+password');

    // Google-only accounts have no password
    if (!user.password)
      return res.status(400).json({ message: 'Your account uses Google sign-in and has no password to change.' });

    const match = await user.comparePassword(currentPassword);
    if (!match)
      return res.status(401).json({ message: 'Current password is incorrect.' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
