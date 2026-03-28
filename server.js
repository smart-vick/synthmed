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
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

// CORS with validation
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

app.get('/api/health', (req, res) => {
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
    recordAudit.run(
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
    recordAudit.run(
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
      recordAudit.run(
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
app.post('/api/v1/auth/refresh', (req, res) => {
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
    const result = refreshAccessToken(validation.data.refreshToken);
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
app.get('/api/v1/account', requireAuth, (req, res) => {
  const account = getAccountById.get(req.auth.accountId);
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

// Delete account
app.delete('/api/v1/account', requireAuth, (req, res) => {
  const now = new Date().toISOString();
  db.prepare("UPDATE accounts SET status = 'deleted', updated_at = ? WHERE id = ?").run(now, req.auth.accountId);

  recordAudit.run(
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
app.post('/api/v1/api-keys', requireAuth, (req, res) => {
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
    const apiKey = createAccountApiKey(req.auth.accountId, name);

    recordAudit.run(
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
app.get('/api/v1/api-keys', requireAuth, (req, res) => {
  try {
    const keys = listAccountApiKeys(req.auth.accountId);

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
app.delete('/api/v1/api-keys/:id', requireAuth, (req, res) => {
  const keyId = parseInt(req.params.id, 10);
  if (!Number.isInteger(keyId) || keyId <= 0) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid key ID',
      code: 'INVALID_ID',
    });
  }

  try {
    revokeAccountApiKey(keyId, req.auth.accountId);

    recordAudit.run(
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
app.post('/api/v1/generate/preview', attachAccountId, (req, res) => {
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

    insertPreviewEvent.run(province, conditionCategory, 'json', new Date().toISOString());

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
app.post('/api/v1/generate/batch', apiLimiter, requireApiKey, (req, res) => {
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
    db.prepare(`
      INSERT INTO usage_events (account_id, api_key_id, endpoint, records_generated, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.auth.accountId, req.auth.apiKeyId, '/api/v1/generate/batch', count, new Date().toISOString());

    // Record audit
    recordAudit.run(
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

app.post('/api/v1/leads', attachAccountId, (req, res) => {
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
    const result = insertLead.run(
      name,
      email,
      organization,
      role || '',
      message || '',
      new Date().toISOString()
    );

    const lead = {
      id: result.lastInsertRowid,
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
      recordAudit.run(
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
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────

// List leads
app.get('/api/v1/admin/leads', requireAdmin, (req, res) => {
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
  const leads = getLeadsWithPagination.all(limit, offset);
  const { count } = countAllLeads.get();

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
app.get('/api/v1/admin/leads/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid lead ID',
      code: 'INVALID_ID',
    });
  }

  const lead = getLeadById.get(id);
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
app.put('/api/v1/admin/leads/:id/status', requireAdmin, (req, res) => {
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

  const lead = getLeadById.get(id);
  if (!lead) {
    return res.status(404).json({
      ok: false,
      error: 'Lead not found',
      code: 'NOT_FOUND',
    });
  }

  updateLeadStatus.run(status, id);

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
