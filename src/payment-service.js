import Stripe from 'stripe';
import { updateAccountTier, updateStripeCustomerId, getAccountByStripeCustomerId } from '../db.js';

// Initialize Stripe (requires STRIPE_SECRET_KEY env var)
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

if (!stripeKey && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  STRIPE_SECRET_KEY not configured. Payment features disabled.');
}

/**
 * Stripe product IDs and prices (must be created in Stripe dashboard as one-time prices)
 * Pricing matches the public landing page:
 *   Starter      — $500   one-time — 10,000 records
 *   Professional — $2,000 one-time — 100,000 records
 *   Enterprise   — custom pricing
 */
const PRODUCTS = {
  starter: {
    productId: process.env.STRIPE_PRODUCT_STARTER || 'prod_starter',
    priceId: process.env.STRIPE_PRICE_STARTER || 'price_starter_onetime',
    tier: 'starter',
    amount: 50000,   // $500.00 in cents
    records: 10000,
    interval: 'one_time',
  },
  pro: {
    productId: process.env.STRIPE_PRODUCT_PRO || 'prod_pro',
    priceId: process.env.STRIPE_PRICE_PRO || 'price_pro_onetime',
    tier: 'pro',
    amount: 200000,  // $2,000.00 in cents
    records: 100000,
    interval: 'one_time',
  },
  enterprise: {
    productId: process.env.STRIPE_PRODUCT_ENTERPRISE || 'prod_enterprise',
    tier: 'enterprise',
    amount: null,    // Custom pricing — handled offline
    records: 'unlimited',
    interval: 'custom',
  },
};

/**
 * Create a one-time payment checkout session
 * @param {number} accountId - Account ID
 * @param {string} email - Customer email
 * @param {string} tier - 'starter' or 'pro'
 * @param {string} successUrl - URL after successful payment
 * @param {string} cancelUrl - URL after cancelled payment
 * @returns {Object} Checkout session with URL
 */
export async function createCheckoutSession(accountId, email, tier, successUrl, cancelUrl) {
  if (!stripe) {
    const error = new Error('Stripe not configured');
    error.code = 'STRIPE_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }

  const product = PRODUCTS[tier];
  if (!product || !product.priceId) {
    const error = new Error(product ? 'Enterprise pricing requires a custom quote — contact us' : 'Invalid tier');
    error.code = product ? 'ENTERPRISE_CUSTOM' : 'INVALID_TIER';
    error.status = 400;
    throw error;
  }

  try {
    const idempotencyKey = `checkout_${accountId}_${tier}_${Math.floor(Date.now() / 3600000)}`; // unique per account+tier per hour
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',        // one-time payment, not subscription
      customer_email: email,
      line_items: [
        {
          price: product.priceId,
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        accountId: accountId.toString(),
        tier,
      },
    }, { idempotencyKey });

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (err) {
    console.error('[stripe] Checkout session creation failed:', err.message);
    const error = new Error('Failed to create checkout session');
    error.code = 'CHECKOUT_ERROR';
    error.status = 500;
    throw error;
  }
}

/**
 * Retrieve checkout session details
 * @param {string} sessionId - Stripe session ID
 * @returns {Object} Session details
 */
export async function getCheckoutSession(sessionId) {
  if (!stripe) {
    const error = new Error('Stripe not configured');
    error.code = 'STRIPE_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }

  try {
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });
  } catch (err) {
    console.error('[stripe] Session retrieval failed:', err.message);
    const error = new Error('Failed to retrieve session');
    error.code = 'SESSION_ERROR';
    error.status = 500;
    throw error;
  }
}

/**
 * Create customer portal session for order history
 * @param {string} stripeCustomerId - Stripe customer ID
 * @param {string} returnUrl - URL to return to after portal
 * @returns {Object} Portal session with URL
 */
export async function createPortalSession(stripeCustomerId, returnUrl) {
  if (!stripe) {
    const error = new Error('Stripe not configured');
    error.code = 'STRIPE_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  } catch (err) {
    console.error('[stripe] Portal session creation failed:', err.message);
    const error = new Error('Failed to create portal session');
    error.code = 'PORTAL_ERROR';
    error.status = 500;
    throw error;
  }
}

/**
 * Handle Stripe webhook events
 * @param {Object} event - Stripe event object
 * @param {number} accountId - Account ID
 */
export async function handleWebhookEvent(event, accountId) {
  if (!stripe) {
    console.warn('[stripe] Webhook received but Stripe not configured');
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const tier = session.metadata?.tier;
      const now = new Date().toISOString();
      if (accountId && tier && session.payment_status === 'paid') {
        await updateAccountTier.run(tier, now, accountId);
        // Store Stripe customer ID so billing portal works
        if (session.customer) {
          await updateStripeCustomerId.run(session.customer, now, accountId);
        }
        console.log(`[stripe] Account ${accountId} upgraded to ${tier} tier`);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object;
      console.warn(`[stripe] Payment failed for intent ${intent.id}`);
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object;
      // Only downgrade if fully refunded (not a partial refund)
      if (charge.refunded !== true) break;
      const refundedAccountId = charge.metadata?.accountId;
      if (refundedAccountId) {
        await updateAccountTier.run('free', new Date().toISOString(), parseInt(refundedAccountId, 10));
        console.log(`[stripe] Account ${refundedAccountId} downgraded after full refund`);
      }
      break;
    }

    default:
      console.log(`[stripe] Unhandled event type: ${event.type}`);
  }
}

/**
 * Verify Stripe webhook signature
 * @param {string} body - Raw request body
 * @param {string} signature - Stripe signature header
 * @returns {Object} Verified event
 */
export function verifyWebhookSignature(body, signature) {
  if (!stripe) {
    const error = new Error('Stripe not configured');
    error.code = 'STRIPE_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    const error = new Error('Webhook secret not configured');
    error.code = 'WEBHOOK_SECRET_MISSING';
    error.status = 503;
    throw error;
  }

  try {
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe] Webhook verification failed:', err.message);
    const error = new Error('Invalid webhook signature');
    error.code = 'INVALID_SIGNATURE';
    error.status = 403;
    throw error;
  }
}

/**
 * Get pricing information (matches landing page)
 */
export function getPricingInfo() {
  return {
    free: {
      tier: 'free',
      price: '$0',
      billing: 'free sample',
      records: '1,000 records',
      features: [
        'Free sample dataset',
        '1,000 synthetic patient records',
        'CSV and JSON formats',
        'All 13 Canadian provinces',
        'Methodology summary',
      ],
    },
    starter: {
      tier: 'starter',
      price: '$500',
      billing: 'one-time',
      records: '10,000 records',
      features: [
        '10,000 synthetic patient records',
        '21 clinical fields per record',
        'All 13 Canadian provinces',
        'CSV and JSON formats',
        'Methodology summary document',
        'Email support',
      ],
    },
    pro: {
      tier: 'pro',
      display_name: 'Professional',
      price: '$2,000',
      billing: 'one-time',
      records: '100,000 records',
      features: [
        '100,000 synthetic patient records',
        '21 clinical fields per record',
        'All 13 Canadian provinces',
        'CSV, JSON, and Parquet formats',
        'Quality validation report',
        'Priority email support',
        'Methodology documentation',
      ],
    },
    enterprise: {
      tier: 'enterprise',
      price: 'Custom',
      billing: 'custom',
      records: '1M+ records',
      features: [
        '1M+ patient records',
        'Custom field configuration',
        'Custom condition distributions',
        'All formats including custom schema',
        'Dedicated account support',
        'White-label available',
      ],
    },
  };
}
