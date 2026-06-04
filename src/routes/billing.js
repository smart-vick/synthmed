import { Router } from 'express';
import { getAccountById, recordAudit } from '../../db.js';
import db from '../../db.js';
import { requireAuth } from '../auth-middleware.js';
import { createCheckoutSession, getCheckoutSession, createPortalSession, getPricingInfo } from '../payment-service.js';
import { getClientIp } from '../utils.js';

const router = Router();

router.get('/pricing', (req, res) => {
  res.status(200).json({ ok: true, pricing: getPricingInfo() });
});

router.post('/billing/checkout', requireAuth, async (req, res) => {
  const { tier, successUrl, cancelUrl } = req.body;

  if (!tier || !['starter', 'pro', 'enterprise'].includes(tier)) {
    return res.status(400).json({ ok: false, error: 'Invalid tier', code: 'INVALID_TIER' });
  }
  if (!successUrl || !cancelUrl) {
    return res.status(400).json({ ok: false, error: 'Success and cancel URLs required', code: 'MISSING_URLS' });
  }

  try {
    const session = await createCheckoutSession(req.auth.accountId, req.auth.email, tier, successUrl, cancelUrl);

    recordAudit.run(req.auth.accountId, 'CHECKOUT_SESSION_CREATED', 'subscription', null, getClientIp(req), req.headers['user-agent'], new Date().toISOString());

    res.status(200).json({ ok: true, checkout: session });
  } catch (err) {
    if (err.code === 'STRIPE_NOT_CONFIGURED') {
      return res.status(503).json({ ok: false, error: 'Payment processing not configured', code: 'SERVICE_UNAVAILABLE' });
    }
    res.status(500).json({ ok: false, error: 'Failed to create checkout session', code: 'CHECKOUT_ERROR' });
  }
});

router.get('/billing/checkout/:sessionId', requireAuth, async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: 'Session ID required', code: 'MISSING_SESSION_ID' });
  }

  try {
    const session = await getCheckoutSession(sessionId);
    res.status(200).json({
      ok: true,
      session: { id: session.id, status: session.payment_status, customer_email: session.customer_email, subscription: session.subscription?.id || null },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to retrieve session', code: 'SESSION_ERROR' });
  }
});

router.post('/billing/portal', requireAuth, async (req, res) => {
  const { returnUrl } = req.body;
  if (!returnUrl) {
    return res.status(400).json({ ok: false, error: 'Return URL required', code: 'MISSING_RETURN_URL' });
  }

  try {
    const account = getAccountById.get(req.auth.accountId);
    if (!account?.stripe_customer_id) {
      return res.status(400).json({ ok: false, error: 'No billing account found. Please complete a purchase first.', code: 'NO_STRIPE_CUSTOMER' });
    }

    const portal = await createPortalSession(account.stripe_customer_id, returnUrl);
    res.status(200).json({ ok: true, portal });
  } catch (err) {
    if (err.code === 'STRIPE_NOT_CONFIGURED') {
      return res.status(503).json({ ok: false, error: 'Payment processing not configured', code: 'SERVICE_UNAVAILABLE' });
    }
    res.status(500).json({ ok: false, error: 'Failed to create portal session', code: 'PORTAL_ERROR' });
  }
});

router.get('/usage', requireAuth, (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usage = db.prepare(`
      SELECT COUNT(*) as total_requests, SUM(records_generated) as total_records, endpoint as endpoint_name
      FROM usage_events WHERE account_id = ? AND timestamp >= ? GROUP BY endpoint ORDER BY total_requests DESC
    `).all(req.auth.accountId, thirtyDaysAgo.toISOString());

    const totalStats = db.prepare(`
      SELECT COUNT(*) as total_requests, COALESCE(SUM(records_generated), 0) as total_records
      FROM usage_events WHERE account_id = ? AND timestamp >= ?
    `).get(req.auth.accountId, thirtyDaysAgo.toISOString());

    const account = getAccountById.get(req.auth.accountId);

    res.status(200).json({
      ok: true,
      usage: {
        last_30_days: { total_requests: totalStats.total_requests || 0, total_records: totalStats.total_records || 0, by_endpoint: usage || [] },
        current_tier: account.tier,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to retrieve usage stats', code: 'STATS_ERROR' });
  }
});

export default router;
