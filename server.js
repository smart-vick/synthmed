import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import db, { insertPageView, getPreviewCount } from './db.js';
import { getClientIp } from './src/utils.js';

import authRoutes from './src/routes/auth.js';
import generateRoutes from './src/routes/generate.js';
import billingRoutes from './src/routes/billing.js';
import adminRoutes from './src/routes/admin.js';
import leadsRoutes from './src/routes/leads.js';
import apiKeysRoutes from './src/routes/apiKeys.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────
// SECURITY MIDDLEWARE
// ─────────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Stripe webhook must receive raw body — register BEFORE express.json()
app.post('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ ok: false, error: 'Missing Stripe signature', code: 'MISSING_SIGNATURE' });
  }
  try {
    const { verifyWebhookSignature, handleWebhookEvent } = await import('./src/payment-service.js');
    const event = verifyWebhookSignature(req.body, signature);
    const accountId = event.data?.object?.metadata?.accountId || event.data?.object?.subscription?.metadata?.accountId;
    await handleWebhookEvent(event, parseInt(accountId, 10) || null);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] Error:', err.message);
    if (err.code === 'INVALID_SIGNATURE') {
      return res.status(403).json({ ok: false, error: 'Invalid signature', code: 'INVALID_SIGNATURE' });
    }
    res.status(500).json({ ok: false, error: 'Webhook processing failed', code: 'WEBHOOK_ERROR' });
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static files — serve only the public/ directory, never the project root
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────────────────────
// VISITOR TRACKING MIDDLEWARE
// ─────────────────────────────────────────────────────────────
const BOT_PATTERNS = /bot|crawler|spider|slurp|bingbot|googlebot|facebookexternalhit|render-health/i;

app.use((req, res, next) => {
  const isPage = req.method === 'GET' && !req.path.startsWith('/api/');
  const isAsset = /\.(js|css|png|jpg|ico|svg|woff|ttf|map)$/.test(req.path);
  const isBot = BOT_PATTERNS.test(req.headers['user-agent'] || '');
  if (isPage && !isAsset && !isBot) {
    try {
      insertPageView.run(req.path, getClientIp(req), req.headers['user-agent'] || null, req.headers['referer'] || null, new Date().toISOString());
    } catch (_) { /* never crash on tracking failure */ }
  }
  next();
});

// ─────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  let dbStatus = 'healthy';
  let previewCount = 0;
  try {
    previewCount = getPreviewCount().count;
  } catch {
    dbStatus = 'unhealthy';
  }
  res.status(dbStatus === 'healthy' ? 200 : 503).json({
    ok: dbStatus === 'healthy',
    service: 'synthmed-api',
    version: 'v2',
    uptime_seconds: Math.floor(process.uptime()),
    previews_generated: previewCount,
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', billingRoutes);
app.use('/api/v1/generate', generateRoutes);
app.use('/api/v1/api-keys', apiKeysRoutes);
app.use('/api/v1/leads', leadsRoutes);
app.use('/api/v1/admin', adminRoutes);

// Account endpoints live under auth routes at /api/v1/auth/account
// but were originally at /api/v1/account — keep backwards compatibility
app.get('/api/v1/account', (req, res, next) => { req.url = '/account'; authRoutes(req, res, next); });
app.delete('/api/v1/account', (req, res, next) => { req.url = '/account'; authRoutes(req, res, next); });

// ─────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({
    ok: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint not found', code: 'NOT_FOUND' });
});

// ─────────────────────────────────────────────────────────────
// SERVER STARTUP
// ─────────────────────────────────────────────────────────────

const REQUIRED_ENV = ['JWT_SECRET', 'ADMIN_KEY'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
  const requiredProd = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
  const missingProd = requiredProd.filter(k => !process.env[k]);
  if (missingProd.length > 0) {
    console.error(`[startup] Missing required production env vars: ${missingProd.join(', ')}`);
    process.exit(1);
  }
}

const server = app.listen(PORT, () => {
  console.log(`\n  SynthMed API v2  →  http://localhost:${PORT}`);
  console.log(`  Health check     →  http://localhost:${PORT}/api/health\n`);
});

export default app;
