/**
 * webhookEmitter.js — fires events to all active webhook subscribers.
 *
 * Usage anywhere in the backend:
 *   const { emit } = require('../utils/webhookEmitter');
 *   await emit('order.created', { order });
 *
 * Supported events:
 *   order.created | order.status_updated
 *   user.registered | user.password_reset
 */

const crypto = require('crypto');
const Webhook = require('../models/Webhook');

function sign(secret, body) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function deliver(webhook, event, payload) {
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload
  });
  const signature = sign(webhook.secret, body);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'X-ShopVibe-Event':     event,
        'X-ShopVibe-Signature': signature,
        'X-ShopVibe-Delivery':  crypto.randomUUID()
      },
      body,
      signal: controller.signal
    });

    clearTimeout(timer);
    return { statusCode: res.status, success: res.ok };
  } catch (err) {
    return { statusCode: 0, success: false, error: err.message };
  }
}

async function emit(event, payload) {
  try {
    const hooks = await Webhook.find({
      active: true,
      $or: [{ events: '*' }, { events: event }]
    });

    if (!hooks.length) return;

    await Promise.allSettled(
      hooks.map(async (hook) => {
        const result = await deliver(hook, event, payload);

        // Rolling delivery log — keep last 10
        hook.deliveries.push({ event, ...result });
        if (hook.deliveries.length > 10) hook.deliveries.shift();
        await hook.save();

        console.log(`[webhook] ${event} → ${hook.url} — ${result.success ? result.statusCode : 'FAIL: ' + result.error}`);
      })
    );
  } catch (err) {
    console.error('[webhook] emit error:', err.message);
  }
}

module.exports = { emit };
