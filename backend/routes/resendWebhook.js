/**
 * Resend Webhook Receiver
 * Resend calls POST /api/resend-webhook when email events occur.
 *
 * Events: email.sent | email.delivered | email.delivery_delayed
 *         email.bounced | email.complained | email.opened | email.clicked
 *
 * Docs: https://resend.com/docs/dashboard/webhooks/introduction
 */

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');

// Verify the request genuinely came from Resend using svix signature headers.
// Set RESEND_WEBHOOK_SECRET in your .env (from Resend dashboard → Webhooks → Signing Secret).
function verifyResendSignature(req) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification if secret not configured (dev only)

  const svixId        = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Prevent replay attacks — reject if timestamp is older than 5 minutes
  const ts = parseInt(svixTimestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  // Signed content = "<svix-id>.<svix-timestamp>.<raw-body>"
  const signedContent = `${svixId}.${svixTimestamp}.${req.rawBody}`;
  const secretBytes   = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const computed      = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64');

  // svix-signature may contain multiple space-separated sigs (e.g. "v1,abc v1,xyz")
  return svixSignature
    .split(' ')
    .some(sig => sig.replace(/^v1,/, '') === computed);
}

// IMPORTANT: Resend needs the raw body for signature verification.
// This middleware captures it before express.json() parses it.
router.use(express.raw({ type: 'application/json' }));

router.post('/', (req, res) => {
  // Attach rawBody string for signature check
  req.rawBody = req.body.toString('utf8');

  if (!verifyResendSignature(req)) {
    console.warn('[resend-webhook] Invalid signature — request rejected');
    return res.status(401).json({ message: 'Invalid signature.' });
  }

  let event;
  try {
    event = JSON.parse(req.rawBody);
  } catch {
    return res.status(400).json({ message: 'Invalid JSON.' });
  }

  const { type, data } = event;
  console.log(`[resend-webhook] ${type}`, JSON.stringify(data, null, 2));

  // ── Handle each event type ────────────────────────────────────────────────
  switch (type) {
    case 'email.delivered':
      // Email successfully delivered — good to log or update a DB record
      console.log(`[resend-webhook] ✅ Delivered to ${data.to} (id: ${data.email_id})`);
      break;

    case 'email.bounced':
      // Hard bounce — the address doesn't exist or rejected permanently
      console.warn(`[resend-webhook] ❌ Bounced: ${data.to} — ${data.bounce?.message || ''}`);
      // TODO: mark user email as invalid in DB, e.g.:
      // await User.findOneAndUpdate({ email: data.to[0] }, { emailBounced: true });
      break;

    case 'email.complained':
      // User marked email as spam
      console.warn(`[resend-webhook] ⚠️  Spam complaint: ${data.to}`);
      // TODO: unsubscribe user from marketing emails
      break;

    case 'email.delivery_delayed':
      console.warn(`[resend-webhook] ⏳ Delivery delayed: ${data.to}`);
      break;

    case 'email.opened':
      console.log(`[resend-webhook] 👁  Opened by ${data.to}`);
      break;

    case 'email.clicked':
      console.log(`[resend-webhook] 🖱  Link clicked by ${data.to}: ${data.click?.link}`);
      break;

    default:
      console.log(`[resend-webhook] Unhandled event: ${type}`);
  }

  // Always respond 200 quickly — Resend retries if it doesn't get a 2xx
  res.status(200).json({ received: true });
});

module.exports = router;
