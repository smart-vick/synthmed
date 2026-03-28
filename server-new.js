import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  insertLead,
  getAllLeads,
  getLeadById,
  updateLeadStatus,
  insertPreviewEvent,
  getPreviewCount,
} from './db.js';
import { sendLeadNotification } from './mailer.js';
import { validateRequest, loginSchema, registerSchema, createApiKeySchema, generatePreviewSchema, generateBatchSchema, leadSchema } from './src/schemas.js';
import { register, login, getAccount, createAccountApiKey } from './src/auth-service.js';
import { requireAuth, requireApiKey, requireAuthEither, attachAccountId } from './src/auth-middleware.js';
import { authLimiter, publicLimiter, apiLimiter } from './src/rate-limiter.js';
import { trackUsage, getUsageStats as getUserStats } from './src/usage-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ── SECURITY ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost'],
  credentials: true,
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

// Health check
app.get('/api/health', (req, res) => {
  const count = getPreviewCount().count;
  res.json({
    ok: true,
    service: 'synthmed-api',
    version: 'v1',
    uptime_seconds: Math.floor(process.uptime()),
    previews_generated: count,
  });
});

// ══════════════════════════════════════════════════════════════
// ─── AUTH ENDPOINTS ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

// Register
app.post('/api/v1/auth/register', authLimiter, async (req, res) => {
  const validation = validateRequest(registerSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  try {
    const account = await register(validation.data.email, validation.data.organization, validation.data.password);
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
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  try {
    const result = await login(validation.data.email, validation.data.password);
    res.json({
      ok: true,
      token: result.token,
      account: result.account,
    });
  } catch (err) {
    res.status(401).json({
      ok: false,
      error: err.message,
    });
  }
});

// ══════════════════════════════════════════════════════════════
// ─── AUTHENTICATED ENDPOINTS ───────────────────────────────────
// ══════════════════════════════════════════════════════════════

// Get current account
app.get('/api/v1/account', requireAuth, (req, res) => {
  const account = getAccount(req.auth.accountId);
  if (!account) {
    return res.status(404).json({
      ok: false,
      error: 'Account not found',
    });
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
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  try {
    const apiKey = createAccountApiKey(req.auth.accountId, validation.data.name);
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

// Get usage stats
app.get('/api/v1/usage', requireAuth, (req, res) => {
  const stats = getUserStats(req.auth.accountId);
  res.json({
    ok: true,
    usage: stats,
  });
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

  // Track usage if authenticated
  if (req.auth) {
    trackUsage(req.auth.accountId, req.auth.apiKeyId, '/api/v1/generate/preview', 1);
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

  // Track usage
  trackUsage(req.auth.accountId, req.auth.apiKeyId, '/api/v1/generate/batch', count);

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

  // CSV format
  const headers = Object.keys(records[0]).join(',');
  const rows = records.map(r => Object.values(r).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="synthmed_batch_${count}records.csv"`);
  res.send(`${headers}\n${rows}`);
});

// ══════════════════════════════════════════════════════════════
// ─── LEAD CAPTURE ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

// Submit lead
app.post('/api/v1/leads', publicLimiter, async (req, res) => {
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

const adminOnly = (req, res, next) => {
  if (req.headers['x-admin-key'] !== (process.env.ADMIN_KEY || 'dev-only')) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }
  next();
};

// Get all leads
app.get('/api/v1/admin/leads', adminOnly, (req, res) => {
  const leads = getAllLeads.all();
  res.json({ ok: true, count: leads.length, leads });
});

// Get lead by ID
app.get('/api/v1/admin/leads/:id', adminOnly, (req, res) => {
  const lead = getLeadById.get(req.params.id);
  if (!lead) {
    return res.status(404).json({ ok: false, error: 'Lead not found' });
  }
  res.json({ ok: true, lead });
});

// Update lead status
app.patch('/api/v1/admin/leads/:id/status', adminOnly, (req, res) => {
  const { status } = req.body ?? {};
  const allowed = ['new', 'contacted', 'closed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ ok: false, error: 'Invalid status' });
  }
  updateLeadStatus.run(status, req.params.id);
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
  console.log('    POST   /api/v1/api-keys (requires JWT)');
  console.log('    GET    /api/v1/usage (requires JWT)\n');
});
