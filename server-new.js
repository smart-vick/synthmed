import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

// CRITICAL: Validate required environment variables
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'ADMIN_KEY'];
const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`\n❌ FATAL: Missing required environment variables: ${missing.join(', ')}\n`);
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('\n❌ FATAL: JWT_SECRET must be at least 32 characters\n');
  process.exit(1);
}

if (process.env.ADMIN_KEY.length < 32) {
  console.error('\n❌ FATAL: ADMIN_KEY must be at least 32 characters\n');
  process.exit(1);
}
import {
  insertLead,
  getAllLeads,
  getLeadById,
  updateLeadStatus,
  insertPreviewEvent,
  getPreviewCount,
  deleteAccount,
  revokeApiKey,
  getApiKeysByAccount,
} from './db.js';
import { sendLeadNotification } from './mailer.js';
import { validateRequest, loginSchema, registerSchema, createApiKeySchema, generatePreviewSchema, generateBatchSchema, leadSchema } from './src/schemas.js';
import { register, login, getAccount, createAccountApiKey } from './src/auth-service.js';
import { requireAuth, requireApiKey, requireAuthEither, attachAccountId } from './src/auth-middleware.js';
import { recordAudit, getClientIp, AUDIT_EVENTS } from './src/audit-service.js';
import { validationError, unauthorizedError, notFoundError, ERROR_CODES } from './src/error-handler.js';
import { authLimiter, publicLimiter, leadsLimiter, apiLimiter } from './src/rate-limiter.js';
import { trackUsage, getUsageStats as getUserStats } from './src/usage-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ── SECURITY ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

// CRITICAL FIX: Proper CORS validation with trimming
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost'];

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

// ── PARSING ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── STATIC FILES ────────────────────────────────────────────
app.use(express.static(__dirname));

// ── PROVINCES & CONDITIONS ──────────────────────────────────
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
};

const ALL_CONDITIONS = Object.values(CONDITIONS).flat();
const randomFrom = arr => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const randomFloat = (a, b, d = 1) => Number((Math.random() * (b - a) + a).toFixed(d));
const makeId = () => `SYN-CA-${String(randomInt(1000, 9999)).padStart(4, '0')}`;

function generateRecord({ province, conditionCategory }) {
  const pvCode = (province && province !== 'random')
    ? province
    : randomFrom(Object.keys(PROVINCES));
  const pool = (conditionCategory && conditionCategory !== 'random')
    ? (CONDITIONS[conditionCategory] || ALL_CONDITIONS)
    : ALL_CONDITIONS;
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

// ══════════════════════════════════════════════════════════════
// ─── PUBLIC ENDPOINTS ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

// Health check - CRITICAL FIX: Actually verify database is working
app.get('/api/health', (req, res) => {
  try {
    const count = getPreviewCount().count;
    res.json({
      ok: true,
      service: 'synthmed-api',
      version: 'v1',
      uptime_seconds: Math.floor(process.uptime()),
      previews_generated: count,
      database: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[health-check] Database error:', err.message);
    res.status(503).json({
      ok: false,
      error: 'Database connection failed',
      service: 'synthmed-api',
      database: 'unhealthy',
    });
  }
});

// ══════════════════════════════════════════════════════════════
// ─── AUTH ENDPOINTS ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

// Register
app.post('/api/v1/auth/register', authLimiter, async (req, res) => {
  const validation = validateRequest(registerSchema, req.body);
  const ip = getClientIp(req);

  if (!validation.valid) {
    return res.status(400).json(validationError(validation.errors));
  }

  try {
    const account = await register(validation.data.email, validation.data.organization, validation.data.password);

    // Log account creation
    recordAudit(account.id, AUDIT_EVENTS.ACCOUNT_CREATED, 'accounts', account.id, ip);

    res.status(201).json({
      ok: true,
      message: 'Account created successfully',
      account,
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err.message,
    });
  }
});

// Login
app.post('/api/v1/auth/login', authLimiter, async (req, res) => {
  const validation = validateRequest(loginSchema, req.body);
  const ip = getClientIp(req);

  if (!validation.valid) {
    return res.status(400).json(validationError(validation.errors));
  }

  try {
    const result = await login(validation.data.email, validation.data.password);

    // Log successful login
    recordAudit(result.account.id, AUDIT_EVENTS.LOGIN_SUCCESS, 'auth', 'login', ip);

    res.json({
      ok: true,
      token: result.token,
      account: result.account,
    });
  } catch (err) {
    // Log failed login attempt (don't log specific account ID since we don't know it yet)
    // Instead log with email for audit trail
    console.log(`[audit] Login failed for ${validation.data.email} from ${ip}`);

    res.status(401).json(unauthorizedError('Invalid email or password'));
  }
});

// ══════════════════════════════════════════════════════════════
// ─── AUTHENTICATED ENDPOINTS ───────────────────────────────────
// ══════════════════════════════════════════════════════════════

// Get current account
app.get('/api/v1/account', requireAuth, (req, res) => {
  const account = getAccount(req.auth.accountId);
  if (!account) {
    return res.status(404).json(notFoundError('Account'));
  }

  res.json({
    ok: true,
    account: {
      id: account.id,
      email: account.email,
      organization: account.organization,
      tier: account.tier,
      status: account.status,
      createdAt: account.created_at,
    },
  });
});

// Create API key
app.post('/api/v1/api-keys', requireAuth, (req, res) => {
  const validation = validateRequest(createApiKeySchema, req.body);
  const ip = getClientIp(req);

  if (!validation.valid) {
    return res.status(400).json(validationError(validation.errors));
  }

  try {
    const apiKey = createAccountApiKey(req.auth.accountId, validation.data.name);

    // Log API key creation
    recordAudit(req.auth.accountId, AUDIT_EVENTS.API_KEY_CREATED, 'api_keys', apiKey.id, ip);

    res.status(201).json({
      ok: true,
      apiKey,
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err.message,
    });
  }
});

// List API keys for account
app.get('/api/v1/api-keys', requireAuth, (req, res) => {
  try {
    const keys = getApiKeysByAccount.all(req.auth.accountId);
    const keysList = keys.map(key => ({
      id: key.id,
      name: key.name,
      key: key.key.substring(0, 10) + '****' + key.key.substring(key.key.length - 4), // Masked
      createdAt: key.created_at,
      expiresAt: key.expires_at,
      lastUsedAt: key.last_used_at,
      isExpired: key.expires_at ? new Date(key.expires_at) < new Date() : false,
    }));

    res.json({
      ok: true,
      keys: keysList,
    });
  } catch (err) {
    console.error('[list-api-keys]', err);
    res.status(500).json(validationError({ general: 'Failed to list API keys' }));
  }
});

// Revoke API key
app.delete('/api/v1/api-keys/:id', requireAuth, (req, res) => {
  try {
    const keyId = parseInt(req.params.id, 10);
    if (!Number.isInteger(keyId) || keyId <= 0) {
      return res.status(400).json(validationError({ id: 'Invalid key ID' }));
    }

    const ip = getClientIp(req);
    revokeApiKey.run(keyId, req.auth.accountId);

    // Log API key deletion
    recordAudit(req.auth.accountId, AUDIT_EVENTS.API_KEY_DELETED, 'api_keys', keyId, ip);

    res.json({
      ok: true,
      message: 'API key revoked successfully',
    });
  } catch (err) {
    console.error('[revoke-api-key]', err);
    res.status(500).json(validationError({ general: 'Failed to revoke API key' }));
  }
});

// Get usage stats
app.get('/api/v1/usage', requireAuth, (req, res) => {
  const stats = getUserStats(req.auth.accountId);
  res.json({
    ok: true,
    usage: stats,
  });
});

// Delete account (GDPR)
app.delete('/api/v1/account', requireAuth, (req, res) => {
  try {
    const accountId = req.auth.accountId;
    const ip = getClientIp(req);

    // Log account deletion before it's deleted
    recordAudit(accountId, AUDIT_EVENTS.ACCOUNT_DELETED, 'accounts', accountId, ip);

    deleteAccount(accountId);

    res.json({
      ok: true,
      message: 'Account deleted successfully. All associated data has been removed.',
    });
  } catch (err) {
    console.error('[delete-account]', err);
    res.status(500).json({
      ok: false,
      error: 'Failed to delete account',
    });
  }
});

// ══════════════════════════════════════════════════════════════
// ─── DATA GENERATION API (PUBLIC + AUTHENTICATED) ──────────────
// ══════════════════════════════════════════════════════════════

// Generate single preview (public)
app.post('/api/v1/generate/preview', publicLimiter, (req, res) => {
  const validation = validateRequest(generatePreviewSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  const record = generateRecord({
    province: validation.data.province,
    conditionCategory: validation.data.conditionCategory,
  });

  insertPreviewEvent.run({
    province: validation.data.province,
    condition_category: validation.data.conditionCategory,
    format: 'json',
    generated_at: new Date().toISOString(),
  });

  // Track usage if authenticated - CRITICAL FIX: Pass tier for accurate billing
  if (req.auth) {
    trackUsage(req.auth.accountId, req.auth.apiKeyId, '/api/v1/generate/preview', 1, req.auth.tier);
  }

  res.json({
    ok: true,
    record,
    metadata: {
      generator_version: 'v1',
      validated: true,
      generated_at: new Date().toISOString(),
    },
  });
});

// Generate batch (authenticated with tier limiting)
app.post('/api/v1/generate/batch', apiLimiter, requireApiKey, (req, res) => {
  const validation = validateRequest(generateBatchSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  const { province, conditionCategory, count, format } = validation.data;
  const records = Array.from({ length: count }, () =>
    generateRecord({ province, conditionCategory })
  );

  // Track usage - CRITICAL FIX: Pass tier for accurate billing
  trackUsage(req.auth.accountId, req.auth.apiKeyId, '/api/v1/generate/batch', count, req.auth.tier);

  if (format === 'json') {
    return res.json({
      ok: true,
      records,
      metadata: {
        count: records.length,
        generator_version: 'v1',
        generated_at: new Date().toISOString(),
      },
    });
  }

  // CSV format - CRITICAL FIX: Proper CSV escaping to prevent injection
  function escapeCSVValue(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);

    // Prevent formula injection (=, +, @, -)
    if (/^[=+@-]/.test(str)) {
      return "'" + str;
    }

    // If contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
  }

  const headers = Object.keys(records[0]).map(escapeCSVValue).join(',');
  const rows = records
    .map(r => Object.values(r).map(escapeCSVValue).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="synthmed_batch_${count}_records.csv"`);
  res.send(`${headers}\n${rows}`);
});

// ══════════════════════════════════════════════════════════════
// ─── LEAD CAPTURE ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

// Submit lead
app.post('/api/v1/leads', leadsLimiter, async (req, res) => {
  const validation = validateRequest(leadSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  const lead = {
    ...validation.data,
    created_at: new Date().toISOString(),
  };

  try {
    const result = insertLead.run(lead);
    lead.id = result.lastInsertRowid;

    console.log(`[lead] #${lead.id} — ${lead.name} <${lead.email}> @ ${lead.organization}`);

    sendLeadNotification(lead).catch(err =>
      console.error('[mailer] Failed:', err.message)
    );

    res.status(201).json({
      ok: true,
      message: 'Sample request received. We will be in touch within 24 hours.',
      lead_id: lead.id,
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: 'Failed to create lead',
    });
  }
});

// ══════════════════════════════════════════════════════════════
// ─── ADMIN ENDPOINTS ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

// CRITICAL FIX: No default fallback for admin key - use already-validated ADMIN_KEY
const adminOnly = (req, res, next) => {
  const providedKey = req.headers['x-admin-key'];
  if (!providedKey || providedKey !== ADMIN_KEY) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }
  next();
};

// Get all leads
app.get('/api/v1/admin/leads', adminOnly, (req, res) => {
  const leads = getAllLeads.all();
  res.json({ ok: true, count: leads.length, leads });
});

// Get lead by ID - CRITICAL FIX: Validate ID is a positive integer
app.get('/api/v1/admin/leads/:id', adminOnly, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid lead ID' });
  }
  const lead = getLeadById.get(id);
  if (!lead) {
    return res.status(404).json({ ok: false, error: 'Lead not found' });
  }
  res.json({ ok: true, lead });
});

// Update lead status - CRITICAL FIX: Validate ID is a positive integer
app.patch('/api/v1/admin/leads/:id/status', adminOnly, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid lead ID' });
  }

  const { status } = req.body ?? {};
  const allowed = ['new', 'contacted', 'closed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ ok: false, error: 'Invalid status' });
  }
  updateLeadStatus.run(status, id);
  res.json({ ok: true, message: `Lead updated to ${status}` });
});

// ══════════════════════════════════════════════════════════════
// ─── ERROR HANDLING ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({
    ok: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ══════════════════════════════════════════════════════════════
// ─── START SERVER ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`\n  SynthMed API  →  http://localhost:${PORT}`);
  console.log(`  Health check  →  http://localhost:${PORT}/api/health`);
  console.log(`  API Docs      →  http://localhost:${PORT}/docs`);
  console.log(`  API v1        →  http://localhost:${PORT}/api/v1/\n`);
  console.log('  Endpoints:');
  console.log('    POST   /api/v1/auth/register');
  console.log('    POST   /api/v1/auth/login');
  console.log('    POST   /api/v1/generate/preview');
  console.log('    POST   /api/v1/generate/batch');
  console.log('    POST   /api/v1/leads');
  console.log('    GET    /api/v1/account (requires JWT)');
  console.log('    DELETE /api/v1/account (requires JWT - GDPR)');
  console.log('    POST   /api/v1/api-keys (requires JWT)');
  console.log('    GET    /api/v1/api-keys (requires JWT - list with expiry)');
  console.log('    DELETE /api/v1/api-keys/:id (requires JWT - revoke)');
  console.log('    GET    /api/v1/usage (requires JWT)\n');
});
