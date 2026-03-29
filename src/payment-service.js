import Stripe from 'stripe';
import { updateAccountTier } from '../db.js';

// Initialize Stripe (requires STRIPE_SECRET_KEY env var)
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

if (!stripeKey && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  STRIPE_SECRET_KEY not configured. Payment features disabled.');
}

/**
 * Stripe product IDs and prices (should be created in Stripe dashboard)
 * Format: stripe_prod_{tier}_{interval}
 */
const PRODUCTS = {
  starter: {
    productId: process.env.STRIPE_PRODUCT_STARTER || 'prod_starter',
    priceId: process.env.STRIPE_PRICE_STARTER || 'price_starter_monthly',
    tier: 'starter',
    amount: 2500, // $25.00 in cents
    records: 50000,
    interval: 'month',
  },
  pro: {
    productId: process.env.STRIPE_PRODUCT_PRO || 'prod_pro',
    priceId: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
    tier: 'pro',
    amount: 12500, // $125.00 in cents
    records: 500000,
    interval: 'month',
  },
  enterprise: {
    productId: process.env.STRIPE_PRODUCT_ENTERPRISE || 'prod_enterprise',
    tier: 'enterprise',
    amount: null, // Custom pricing
    records: 'unlimited',
    interval: 'custom',
  },
};

/**
 * Create a checkout session for subscription
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
  if (!product) {
    const error = new Error('Invalid tier');
    error.code = 'INVALID_TIER';
    error.status = 400;
    throw error;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
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
    });

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
      expand: ['line_items', 'subscription'],
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
 * Create customer portal session for subscription management
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

    return {
      url: session.url,
    };
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
      if (accountId && tier) {
        updateAccountTier.run(tier, new Date().toISOString(), accountId);
        console.log(`[stripe] Account ${accountId} upgraded to ${tier} tier`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const accountIdFromMetadata = subscription.metadata?.accountId;
      // Handle subscription updates (e.g., tier changes)
      console.log(`[stripe] Subscription updated for account ${accountIdFromMetadata}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const accountIdFromMetadata = subscription.metadata?.accountId;
      // Handle subscription cancellation - downgrade to free
      if (accountIdFromMetadata) {
        updateAccountTier.run('free', new Date().toISOString(), accountIdFromMetadata);
        console.log(`[stripe] Account ${accountIdFromMetadata} downgraded to free tier`);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.warn(`[stripe] Payment failed for invoice ${invoice.id}`);
      // Send notification email to customer
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      console.log(`[stripe] Payment successful for invoice ${invoice.id}`);
      // Send receipt email
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
 * Get pricing information
 */
export function getPricingInfo() {
  return {
    free: {
      tier: 'free',
      price: '$0/month',
      records: '1,000/month',
      features: [
        'Public data generation',
        'Preview API access',
        'Basic rate limiting',
        'Community support',
      ],
    },
    starter: {
      tier: 'starter',
      price: '$25/month',
      records: '50,000/month',
      features: [
        'Everything in Free',
        'API key access',
        'Standard rate limits',
        'Email support',
        'Monthly invoice',
      ],
    },
    pro: {
      tier: 'pro',
      price: '$125/month',
      records: '500,000/month',
      features: [
        'Everything in Starter',
        'Higher rate limits',
        'Priority support',
        'Custom integrations',
        'Usage analytics',
      ],
    },
    enterprise: {
      tier: 'enterprise',
      price: 'Custom',
      records: 'Unlimited',
      features: [
        'Everything in Pro',
        'Dedicated support',
        'SLA guarantee',
        'Custom features',
        'Volume discounts',
      ],
    },
  };
}
