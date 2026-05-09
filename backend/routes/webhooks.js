/**
 * Webhook management routes — admin only.
 *
 * POST   /api/webhooks          — register a new webhook
 * GET    /api/webhooks          — list all webhooks
 * GET    /api/webhooks/:id      — get one webhook + delivery log
 * PATCH  /api/webhooks/:id      — update url / events / active
 * DELETE /api/webhooks/:id      — remove a webhook
 * POST   /api/webhooks/:id/ping — send a test ping event
 */

const express = require('express');
const router  = express.Router();
const Webhook = require('../models/Webhook');
const { protect, adminOnly } = require('../middleware/auth');
const { emit } = require('../utils/webhookEmitter');

const guard = [protect, adminOnly];

const VALID_EVENTS = [
  '*',
  'order.created',
  'order.status_updated',
  'user.registered',
  'user.password_reset'
];

// ── POST /api/webhooks ────────────────────────────────────────────────────────
router.post('/', guard, async (req, res) => {
  try {
    const { url, events = ['*'], secret } = req.body;
    if (!url) return res.status(400).json({ message: 'url is required.' });

    // Validate URL
    try { new URL(url); } catch {
      return res.status(400).json({ message: 'Invalid URL.' });
    }

    // Validate events
    const invalid = (Array.isArray(events) ? events : [events])
      .filter(e => !VALID_EVENTS.includes(e));
    if (invalid.length)
      return res.status(400).json({ message: `Unknown events: ${invalid.join(', ')}. Valid: ${VALID_EVENTS.join(', ')}` });

    const hook = await Webhook.create({
      createdBy: req.user._id,
      url,
      events: Array.isArray(events) ? events : [events],
      ...(secret && { secret })
    });

    res.status(201).json(hook);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/webhooks ─────────────────────────────────────────────────────────
router.get('/', guard, async (req, res) => {
  try {
    const hooks = await Webhook.find().sort('-createdAt').populate('createdBy', 'full_name email');
    res.json(hooks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/webhooks/:id ─────────────────────────────────────────────────────
router.get('/:id', guard, async (req, res) => {
  try {
    const hook = await Webhook.findById(req.params.id).populate('createdBy', 'full_name email');
    if (!hook) return res.status(404).json({ message: 'Webhook not found.' });
    res.json(hook);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/webhooks/:id ───────────────────────────────────────────────────
router.patch('/:id', guard, async (req, res) => {
  try {
    const { url, events, active, secret } = req.body;
    const hook = await Webhook.findById(req.params.id);
    if (!hook) return res.status(404).json({ message: 'Webhook not found.' });

    if (url !== undefined) {
      try { new URL(url); } catch { return res.status(400).json({ message: 'Invalid URL.' }); }
      hook.url = url;
    }
    if (events !== undefined) {
      const evArr = Array.isArray(events) ? events : [events];
      const invalid = evArr.filter(e => !VALID_EVENTS.includes(e));
      if (invalid.length)
        return res.status(400).json({ message: `Unknown events: ${invalid.join(', ')}` });
      hook.events = evArr;
    }
    if (active !== undefined) hook.active = active;
    if (secret  !== undefined) hook.secret = secret;

    await hook.save();
    res.json(hook);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/webhooks/:id ──────────────────────────────────────────────────
router.delete('/:id', guard, async (req, res) => {
  try {
    const hook = await Webhook.findByIdAndDelete(req.params.id);
    if (!hook) return res.status(404).json({ message: 'Webhook not found.' });
    res.json({ message: 'Webhook deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/webhooks/:id/ping ───────────────────────────────────────────────
router.post('/:id/ping', guard, async (req, res) => {
  try {
    const hook = await Webhook.findById(req.params.id);
    if (!hook) return res.status(404).json({ message: 'Webhook not found.' });

    await emit('ping', { message: 'ShopVibe webhook test ping', webhookId: hook._id });
    res.json({ message: 'Ping sent. Check the delivery log.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
