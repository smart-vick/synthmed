import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Database imports
import db, {
  createAccount,
  getAccountByEmail,
  getAccountById,
  createApiKey,
  insertLead,
  getAllLeads,
  getLeadById,
  updateLeadStatus,
  getLeadsWithPagination,
  countAllLeads,
  recordAudit,
  getPreviewCount,
  insertPreviewEvent,
  recordUsage,
  deleteAccount,
} from './db.js';

// Auth imports
import {
  register,
  login,
  refreshAccessToken,
  verifyToken,
} from './src/auth-service.js';

// Middleware imports
import {
  requireAuth,
  requireApiKey,
  requireAuthEither,
  attachAccountId,
  requireAdmin,
} from './src/auth-middleware.js';

// Schema imports
import {
  validateRequest,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  createApiKeySchema,
  generateBatchSchema,
  generatePreviewSchema,
  leadSchema,
  paginationSchema,
} from './src/schemas.js';

// Utilities
import { sendLeadNotification } from './mailer.js';

// Rate limiter imports
import {
  publicLimiter,
  authLimiter,
  leadsLimiter,
  apiLimiter,
} from './src/rate-limiter.js';

// API key service
import {
  createAccountApiKey,
  revokeAccountApiKey,
  listAccountApiKeys,
} from './src/api-key-service.js';

// Payment service
import {
  createCheckoutSession,
  getCheckoutSession,
  createPortalSession,
  handleWebhookEvent,
  verifyWebhookSignature,
  getPricingInfo,
} from './src/payment-service.js';

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

// CORS with validation
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Stripe webhook must receive raw body — register BEFORE express.json()
app.post('/api/v1/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ ok: false, error: 'Missing Stripe signature', code: 'MISSING_SIGNATURE' });
  }
  try {
    const { verifyWebhookSignature, handleWebhookEvent } = await import('./src/payment-service.js');
    const event = verifyWebhookSignature(req.body, signature);
    const accountId = event.data?.object?.metadata?.accountId ||
      event.data?.object?.subscription?.metadata?.accountId;
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

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static files
app.use(express.static(__dirname));

// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress;
}

function escapeCSVValue(value) {
  if (typeof value !== 'string') return value;
  if (/[",\n\r]/.test(value) || /^[=+@-]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Clinical data for patient generation
const PROVINCES = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
  NS: 'Nova Scotia', MB: 'Manitoba', SK: 'Saskatchewan', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', PE: 'Prince Edward Island',
  YT: 'Yukon', NT: 'Northwest Territories', NU: 'Nunavut',
};

const CONDITIONS = {
  cardiovascular: [
    { icd: 'I10', diagnosis_label: 'Essential Hypertension', medication: 'Lisinopril 10mg', bp_mmhg: '148/92', glucose_mmol: 5.2, hba1c_pct: 5.4 },
    { icd: 'I25', diagnosis_label: 'Chronic Ischaemic Heart Disease', medication: 'Metoprolol 50mg', bp_mmhg: '136/84', glucose_mmol: 5.8, hba1c_pct: 5.6 },
    { icd: 'I48', diagnosis_label: 'Atrial Fibrillation', medication: 'Apixaban 5mg', bp_mmhg: '132/80', glucose_mmol: 5.1, hba1c_pct: 5.3 },
  ],
  diabetes: [
    { icd: 'E11', diagnosis_label: 'Type 2 Diabetes Mellitus', medication: 'Metformin 500mg', bp_mmhg: '138/86', glucose_mmol: 9.4, hba1c_pct: 8.1 },
    { icd: 'E11.6', diagnosis_label: 'T2DM with Complications', medication: 'Empagliflozin 10mg', bp_mmhg: '144/90', glucose_mmol: 11.2, hba1c_pct: 9.3 },
  ],
  respiratory: [
    { icd: 'J44', diagnosis_label: 'COPD', medication: 'Tiotropium Inhaler', bp_mmhg: '158/94', glucose_mmol: 5.9, hba1c_pct: 5.7 },
    { icd: 'J45', diagnosis_label: 'Asthma', medication: 'Salbutamol Inhaler PRN', bp_mmhg: '122/76', glucose_mmol: 5.0, hba1c_pct: 5.2 },
  ],
  'mental-health': [
    { icd: 'F32', diagnosis_label: 'Depressive Episode', medication: 'Sertraline 50mg', bp_mmhg: '118/74', glucose_mmol: 4.8, hba1c_pct: 5.1 },
    { icd: 'F41', diagnosis_label: 'Anxiety Disorder', medication: 'Escitalopram 10mg', bp_mmhg: '124/78', glucose_mmol: 5.0, hba1c_pct: 5.2 },
  ],
  orthopedic: [
    { icd: 'M79.3', diagnosis_label: 'Myalgia', medication: 'Ibuprofen 200mg', bp_mmhg: '120/80', glucose_mmol: 5.1, hba1c_pct: 5.2 },
    { icd: 'M17', diagnosis_label: 'Osteoarthritis of knee', medication: 'Naproxen 250mg', bp_mmhg: '130/85', glucose_mmol: 5.3, hba1c_pct: 5.3 },
  ],
};

const ALL_CONDITIONS = Object.values(CONDITIONS).flat();
const randomFrom = arr => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const randomFloat = (a, b, d = 1) => Number((Math.random() * (b - a) + a).toFixed(d));
const makeId = () => `SYN-CA-${String(randomInt(1000, 9999)).padStart(4, '0')}`;

function generateRecord({ province, conditionCategory }) {
  const pvCode = (province && province !== 'random')
    ? province : randomFrom(Object.keys(PROVINCES));
  const pool = (conditionCategory && conditionCategory !== 'random')
    ? (CONDITIONS[conditionCategory] || ALL_CONDITIONS) : ALL_CONDITIONS;
  const cond = randomFrom(pool);
  return {
    patient_id: makeId(),
    age: randomInt(28, 84),
    sex: Math.random() > 0.48 ? 'Female' : 'Male',
    province_code: pvCode,
    province: PROVINCES[pvCode],
    icd10_primary: cond.icd,
    diagnosis_label: cond.diagnosis_label,
    medication: cond.medication,
    bmi: randomFloat(18, 36),
    bp_mmhg: cond.bp_mmhg,
    glucose_mmol: cond.glucose_mmol,
    hba1c_pct: cond.hba1c_pct,
    los_days: randomInt(2, 12),
    readmit_30d: Math.random() > 0.72,
    synthetic: true,
  };
}

// ─────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
  let dbStatus = 'healthy';
  let previewCount = 0;
  try {
    const result = await getPreviewCount.get();
    previewCount = result.count || 0;
  } catch {
    dbStatus = 'unhealthy';
  }
  res.status(dbStatus === 'healthy' ? 200 : 503).json({
    ok: dbStatus === 'healthy',
    service: 'synthmed-api',
    version: 'v1',
    uptime_seconds: Math.floor(process.uptime()),
    previews_generated: previewCount,
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
// AUTHENTICATION ENDPOINTS
// ─────────────────────────────────────────────────────────────

// Register new account
app.post('/api/v1/auth/register', authLimiter, async (req, res) => {
  const validation = validateRequest(registerSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      code: 'VALIDATION_FAILED',
      errors: validation.errors,
    });
  }

  try {
    const { email, organization, password } = validation.data;
    const account = await register(email, organization, password);

    // Log audit
    await recordAudit.run(
      account.id,
      'ACCOUNT_CREATED',
      'account',
      account.id,
      getClientIp(req),
      req.headers['user-agent'],
      new Date().toISOString()
    );

    res.status(201).json({
      ok: true,
      message: 'Account created successfully',
      account,
    });
  } catch (err) {
    if (err.code === 'ACCOUNT_EXISTS') {
      return res.status(409).json({
        ok: false,
        error: 'Account already exists',
        code: 'ACCOUNT_EXISTS',
      });
    }
    res.status(500).json({
      ok: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

// Login
app.post('/api/v1/auth/login', authLimiter, async (req, res) => {
  const validation = validateRequest(loginSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      code: 'VALIDATION_FAILED',
      errors: validation.errors,
    });
  }

  try {
    const { email, password } = validation.data;
    const result = await login(email, password);

    // Log audit
    await recordAudit.run(
      result.account.id,
      'LOGIN_SUCCESS',
      'account',
      result.account.id,
      getClientIp(req),
      req.headers['user-agent'],
      new Date().toISOString()
    );

    res.status(200).json({
      ok: true,
      ...result,
    });
  } catch (err) {
    if (err.code === 'INVALID_CREDENTIALS') {
      await recordAudit.run(
        null,
        'LOGIN_FAILED',
        'account',
        null,
        getClientIp(req),
        req.headers['user-agent'],
        new Date().toISOString()
      );
      return res.status(401).json({
        ok: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }
    res.status(500).json({
      ok: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

// Refresh token
app.post('/api/v1/auth/refresh', async (req, res) => {
  const validation = validateRequest(refreshTokenSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      code: 'VALIDATION_FAILED',
      errors: validation.errors,
    });
  }

  try {
    const result = await refreshAccessToken(validation.data.refreshToken);
    res.status(200).json({
      ok: true,
      ...result,
    });
  } catch (err) {
    res.status(401).json({
      ok: false,
      error: 'Invalid refresh token',
      code: 'INVALID_TOKEN',
    });
  }
});

// Get account info
app.get('/api/v1/account', requireAuth, async (req, res) => {
  const account = await getAccountById.get(req.auth.accountId);
  if (!account) {
    return res.status(404).json({
      ok: false,
      error: 'Account not found',
      code: 'NOT_FOUND',
    });
  }

  res.status(200).json({
    ok: true,
    account: {
      id: account.id,
      email: account.email,
      organization: account.organization,
      tier: account.tier,
      status: account.status,
      created_at: account.created_at,
    },
  });
});

// Download full dataset — tier determines record count
app.get('/api/v1/generate/download', requireAuth, async (req, res) => {
  const account = await getAccountById.get(req.auth.accountId);
  if (!account) {
    return res.status(404).json({ ok: false, error: 'Account not found', code: 'NOT_FOUND' });
  }

  const TIER_LIMITS = { free: 1000, starter: 10000, pro: 100000, enterprise: 100000 };
  const count = TIER_LIMITS[account.tier] || 1000;
  const format = req.query.format === 'json' ? 'json' : 'csv';

  const records = [];
  for (let i = 0; i < count; i++) {
    records.push(generateRecord({ province: 'random', conditionCategory: 'random' }));
  }

  await recordUsage.run(req.auth.accountId, null, '/api/v1/generate/download', count, new Date().toISOString());

  if (format === 'csv') {
    const headers = Object.keys(records[0]);
    const lines = [headers.join(',')];
    for (const r of records) lines.push(headers.map(h => escapeCSVValue(String(r[h]))).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="synthmed-${account.tier}-${Date.now()}.csv"`);
    return res.status(200).send(lines.join('\n'));
  } else {
    res.setHeader('Content-Disposition', `attachment; filename="synthmed-${account.tier}-${Date.now()}.json"`);
    return res.status(200).json({ ok: true, records, count, tier: account.tier, generated_at: new Date().toISOString() });
  }
});

// Delete account
app.delete('/api/v1/account', requireAuth, async (req, res) => {
  const now = new Date().toISOString();
  await deleteAccount.run(now, req.auth.accountId);

  await recordAudit.run(
    req.auth.accountId,
    'ACCOUNT_DELETED',
    'account',
    req.auth.accountId,
    getClientIp(req),
    req.headers['user-agent'],
    now
  );

  res.status(200).json({
    ok: true,
    message: 'Account deleted successfully',
  });
});

// ─────────────────────────────────────────────────────────────
// API KEY MANAGEMENT
// ─────────────────────────────────────────────────────────────

// Create API key
app.post('/api/v1/api-keys', requireAuth, async (req, res) => {
  const validation = validateRequest(createApiKeySchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      code: 'VALIDATION_FAILED',
      errors: validation.errors,
    });
  }

  try {
    const { name } = validation.data;
    const apiKey = await createAccountApiKey(req.auth.accountId, name);

    await recordAudit.run(
      req.auth.accountId,
      'API_KEY_CREATED',
      'api_key',
      apiKey.id,
      getClientIp(req),
      req.headers['user-agent'],
      new Date().toISOString()
    );

    res.status(201).json({
      ok: true,
      message: 'API key created successfully',
      apiKey,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'Failed to create API key',
      code: 'KEY_ERROR',
    });
  }
});

// List API keys
app.get('/api/v1/api-keys', requireAuth, async (req, res) => {
  try {
    const keys = await listAccountApiKeys(req.auth.accountId);

    res.status(200).json({
      ok: true,
      keys,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve API keys',
      code: 'KEY_ERROR',
    });
  }
});

// Revoke API key
app.delete('/api/v1/api-keys/:id', requireAuth, async (req, res) => {
  const keyId = parseInt(req.params.id, 10);
  if (!Number.isInteger(keyId) || keyId <= 0) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid key ID',
      code: 'INVALID_ID',
    });
  }

  try {
    await revokeAccountApiKey(keyId, req.auth.accountId);

    await recordAudit.run(
      req.auth.accountId,
      'API_KEY_REVOKED',
      'api_key',
      keyId,
      getClientIp(req),
      req.headers['user-agent'],
      new Date().toISOString()
    );

    res.status(200).json({
      ok: true,
      message: 'API key revoked successfully',
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'Failed to revoke API key',
      code: 'KEY_ERROR',
    });
  }
});

// ─────────────────────────────────────────────────────────────
// DATA GENERATION ENDPOINTS
// ─────────────────────────────────────────────────────────────

// Generate preview (public)
app.post('/api/v1/generate/preview', attachAccountId, async (req, res) => {
  const validation = validateRequest(generatePreviewSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      code: 'VALIDATION_FAILED',
      errors: validation.errors,
    });
  }

  try {
    const { province, conditionCategory } = validation.data;
    const record = generateRecord({ province, conditionCategory });

    await insertPreviewEvent.run(province, conditionCategory, 'json', new Date().toISOString());

    res.status(200).json({
      ok: true,
      record,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'Failed to generate record',
      code: 'GENERATION_FAILED',
    });
  }
});

// Generate batch (requires API key)
app.post('/api/v1/generate/batch', apiLimiter, requireApiKey, async (req, res) => {
  const validation = validateRequest(generateBatchSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      code: 'VALIDATION_FAILED',
      errors: validation.errors,
    });
  }

  try {
    const { province, conditionCategory, count, format } = validation.data;
    const records = [];

    for (let i = 0; i < count; i++) {
      records.push(generateRecord({ province, conditionCategory }));
    }

    // Log usage
    await recordUsage.run(req.auth.accountId, req.auth.apiKeyId, '/api/v1/generate/batch', count, new Date().toISOString());

    // Record audit
    await recordAudit.run(
      req.auth.accountId,
      'DATA_GENERATED',
      'batch',
      null,
      getClientIp(req),
      req.headers['user-agent'],
      new Date().toISOString()
    );

    if (format === 'csv') {
      // CSV format
      const headers = Object.keys(records[0]);
      const csvLines = [headers.map(h => escapeCSVValue(h)).join(',')];
      for (const record of records) {
        csvLines.push(headers.map(h => escapeCSVValue(record[h])).join(','));
      }
      const csv = csvLines.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="synthmed-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } else {
      // JSON format
      res.status(200).json({
        ok: true,
        records,
        metadata: {
          count,
          generator_version: 'v1',
          generated_at: new Date().toISOString(),
        },
      });
    }
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'Failed to generate records',
      code: 'GENERATION_FAILED',
    });
  }
});

// ─────────────────────────────────────────────────────────────
// LEAD CAPTURE
// ─────────────────────────────────────────────────────────────

app.post('/api/v1/leads', attachAccountId, async (req, res) => {
  const validation = validateRequest(leadSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      code: 'VALIDATION_FAILED',
      errors: validation.errors,
    });
  }

  try {
    const { name, email, organization, role, message } = validation.data;
    const result = await insertLead.run(
      name,
      email,
      organization,
      role || '',
      message || '',
      new Date().toISOString()
    );

    const lead = {
      id: result.lastID,
      name,
      email,
      organization,
      role: role || '',
      message: message || '',
      status: 'new',
      created_at: new Date().toISOString(),
    };

    // Send email notification
    sendLeadNotification(lead).catch(err =>
      console.error('[mailer] Failed to send notification:', err.message)
    );

    // Log audit
    if (req.auth) {
      await recordAudit.run(
        req.auth.accountId,
        'LEAD_SUBMITTED',
        'lead',
        lead.id,
        getClientIp(req),
        req.headers['user-agent'],
        new Date().toISOString()
      );
    }

    res.status(201).json({
      ok: true,
      message: 'Lead captured successfully',
      lead,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'Failed to capture lead',
      code: 'LEAD_ERROR',
    });
  }
});

// ─────────────────────────────────────────────────────────────
// USAGE & STATS ENDPOINTS
// ─────────────────────────────────────────────────────────────

// Get usage stats for authenticated user
app.get('/api/v1/usage', requireAuth, async (req, res) => {
  try {
    // Get last 30 days usage
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { query } = db;
    const usageResult = await query(`
      SELECT
        COUNT(*) as total_requests,
        SUM(records_generated) as total_records,
        endpoint as endpoint_name
      FROM usage_events
      WHERE account_id = $1 AND timestamp >= $2
      GROUP BY endpoint
      ORDER BY total_requests DESC
    `, [req.auth.accountId, thirtyDaysAgo.toISOString()]);

    const totalStatsResult = await query(`
      SELECT
        COUNT(*) as total_requests,
        COALESCE(SUM(records_generated), 0) as total_records
      FROM usage_events
      WHERE account_id = $1 AND timestamp >= $2
    `, [req.auth.accountId, thirtyDaysAgo.toISOString()]);

    const account = await getAccountById.get(req.auth.accountId);
    const usage = usageResult.rows || [];
    const totalStats = totalStatsResult.rows[0] || { total_requests: 0, total_records: 0 };

    res.status(200).json({
      ok: true,
      usage: {
        last_30_days: {
          total_requests: totalStats.total_requests || 0,
          total_records: totalStats.total_records || 0,
          by_endpoint: usage,
        },
        current_tier: account.tier,
        tier_limits: {
          free: '1,000 records (free sample)',
          starter: '10,000 records ($500 one-time)',
          pro: '100,000 records ($2,000 one-time)',
          enterprise: 'Custom (1M+ records)',
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve usage stats',
      code: 'STATS_ERROR',
    });
  }
});

// ─────────────────────────────────────────────────────────────
// BILLING & PAYMENT ENDPOINTS
// ─────────────────────────────────────────────────────────────

// Get pricing information (public)
app.get('/api/v1/pricing', (req, res) => {
  res.status(200).json({
    ok: true,
    pricing: getPricingInfo(),
  });
});

// Create Stripe checkout session
app.post('/api/v1/billing/checkout', requireAuth, async (req, res) => {
  const { tier, successUrl, cancelUrl } = req.body;

  if (!tier || !['starter', 'pro', 'enterprise'].includes(tier)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid tier',
      code: 'INVALID_TIER',
    });
  }

  if (!successUrl || !cancelUrl) {
    return res.status(400).json({
      ok: false,
      error: 'Success and cancel URLs required',
      code: 'MISSING_URLS',
    });
  }

  try {
    const session = await createCheckoutSession(
      req.auth.accountId,
      req.auth.email,
      tier,
      successUrl,
      cancelUrl
    );

    await recordAudit.run(
      req.auth.accountId,
      'CHECKOUT_SESSION_CREATED',
      'subscription',
      null,
      getClientIp(req),
      req.headers['user-agent'],
      new Date().toISOString()
    );

    res.status(200).json({
      ok: true,
      checkout: session,
    });
  } catch (err) {
    if (err.code === 'STRIPE_NOT_CONFIGURED') {
      return res.status(503).json({
        ok: false,
        error: 'Payment processing not configured',
        code: 'SERVICE_UNAVAILABLE',
      });
    }
    res.status(500).json({
      ok: false,
      error: 'Failed to create checkout session',
      code: 'CHECKOUT_ERROR',
    });
  }
});

// Get checkout session status
app.get('/api/v1/billing/checkout/:sessionId', requireAuth, async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({
      ok: false,
      error: 'Session ID required',
      code: 'MISSING_SESSION_ID',
    });
  }

  try {
    const session = await getCheckoutSession(sessionId);

    res.status(200).json({
      ok: true,
      session: {
        id: session.id,
        status: session.payment_status,
        customer_email: session.customer_email,
        subscription: session.subscription?.id || null,
      },
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve session',
      code: 'SESSION_ERROR',
    });
  }
});

// Get customer portal URL
app.post('/api/v1/billing/portal', requireAuth, async (req, res) => {
  const { returnUrl } = req.body;

  if (!returnUrl) {
    return res.status(400).json({
      ok: false,
      error: 'Return URL required',
      code: 'MISSING_RETURN_URL',
    });
  }

  try {
    const account = getAccountById.get(req.auth.accountId);
    if (!account?.stripe_customer_id) {
      return res.status(400).json({
        ok: false,
        error: 'No billing account found. Please complete a purchase first.',
        code: 'NO_STRIPE_CUSTOMER',
      });
    }

    const portal = await createPortalSession(account.stripe_customer_id, returnUrl);

    res.status(200).json({
      ok: true,
      portal,
    });
  } catch (err) {
    if (err.code === 'STRIPE_NOT_CONFIGURED') {
      return res.status(503).json({
        ok: false,
        error: 'Payment processing not configured',
        code: 'SERVICE_UNAVAILABLE',
      });
    }
    res.status(500).json({
      ok: false,
      error: 'Failed to create portal session',
      code: 'PORTAL_ERROR',
    });
  }
});


// ─────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────

// List leads
app.get('/api/v1/admin/leads', requireAdmin, async (req, res) => {
  const validation = validateRequest(paginationSchema, req.query);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      code: 'VALIDATION_FAILED',
      errors: validation.errors,
    });
  }

  const { limit, offset } = validation.data;
  const leads = await getLeadsWithPagination.all(limit, offset);
  const countResult = await countAllLeads.get();
  const count = countResult.count || 0;

  res.status(200).json({
    ok: true,
    leads,
    pagination: {
      limit,
      offset,
      total: count,
      page: Math.floor(offset / limit) + 1,
      pages: Math.ceil(count / limit),
    },
  });
});

// Get single lead
app.get('/api/v1/admin/leads/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid lead ID',
      code: 'INVALID_ID',
    });
  }

  const lead = await getLeadById.get(id);
  if (!lead) {
    return res.status(404).json({
      ok: false,
      error: 'Lead not found',
      code: 'NOT_FOUND',
    });
  }

  res.status(200).json({
    ok: true,
    lead,
  });
});

// Update lead status
app.put('/api/v1/admin/leads/:id/status', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid lead ID',
      code: 'INVALID_ID',
    });
  }

  const { status } = req.body;
  const validStatuses = ['new', 'contacted', 'converted', 'lost'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid status',
      code: 'INVALID_STATUS',
    });
  }

  const lead = await getLeadById.get(id);
  if (!lead) {
    return res.status(404).json({
      ok: false,
      error: 'Lead not found',
      code: 'NOT_FOUND',
    });
  }

  await updateLeadStatus.run(status, id);

  res.status(200).json({
    ok: true,
    message: 'Lead status updated',
    lead: { ...lead, status },
  });
});

// ─────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({
    ok: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    code: 'INTERNAL_ERROR',
  });
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
  });
});

// ─────────────────────────────────────────────────────────────
// SERVER STARTUP
// ─────────────────────────────────────────────────────────────

// Validate critical env vars before accepting traffic
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
  console.log(`\n  SynthMed API  →  http://localhost:${PORT}`);
  console.log(`  Health check  →  http://localhost:${PORT}/api/health`);
  console.log(`  API v1        →  http://localhost:${PORT}/api/v1/\n`);
  console.log('  Endpoints:');
  console.log('    POST   /api/v1/auth/register');
  console.log('    POST   /api/v1/auth/login');
  console.log('    POST   /api/v1/auth/refresh');
  console.log('    GET    /api/v1/account (requires JWT)');
  console.log('    DELETE /api/v1/account (requires JWT)');
  console.log('    POST   /api/v1/generate/preview (public)');
  console.log('    POST   /api/v1/generate/batch (requires API key)');
  console.log('    POST   /api/v1/leads (lead capture)');
  console.log('    GET    /api/v1/admin/leads (requires admin key)');
  console.log('    GET    /api/v1/admin/leads/:id (requires admin key)');
  console.log('    PUT    /api/v1/admin/leads/:id/status (requires admin key)\n');
});

export default app;
