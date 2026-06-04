import { Router } from 'express';
import db, { getAccountById, insertPreviewEvent, recordAudit } from '../../db.js';
import { requireAuth, requireApiKey, attachAccountId } from '../auth-middleware.js';
import { validateRequest, generateBatchSchema, generatePreviewSchema } from '../schemas.js';
import { apiLimiter } from '../rate-limiter.js';
import { generateRecord } from '../data-generator.js';
import { getClientIp, escapeCSVValue } from '../utils.js';

const router = Router();

router.post('/preview', attachAccountId, (req, res) => {
  const validation = validateRequest(generatePreviewSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({ ok: false, error: 'Validation failed', code: 'VALIDATION_FAILED', errors: validation.errors });
  }

  try {
    const { province, conditionCategory } = validation.data || {};
    const record = generateRecord({ province, conditionCategory });

    insertPreviewEvent.run(province || 'random', conditionCategory || 'random', 'json', new Date().toISOString());

    res.status(200).json({ ok: true, record });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to generate record', code: 'GENERATION_FAILED' });
  }
});

router.post('/batch', apiLimiter, requireApiKey, (req, res) => {
  const validation = validateRequest(generateBatchSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({ ok: false, error: 'Validation failed', code: 'VALIDATION_FAILED', errors: validation.errors });
  }

  try {
    const { province, conditionCategory, count, format } = validation.data;
    const records = [];

    for (let i = 0; i < count; i++) {
      records.push(generateRecord({ province, conditionCategory }));
    }

    db.prepare(`INSERT INTO usage_events (account_id, api_key_id, endpoint, records_generated, timestamp) VALUES (?, ?, ?, ?, ?)`)
      .run(req.auth.accountId, req.auth.apiKeyId, '/api/v1/generate/batch', count, new Date().toISOString());

    recordAudit.run(req.auth.accountId, 'DATA_GENERATED', 'batch', null, getClientIp(req), req.headers['user-agent'], new Date().toISOString());

    if (format === 'csv') {
      const headers = Object.keys(records[0]);
      const csvLines = [headers.map(h => escapeCSVValue(h)).join(',')];
      for (const record of records) {
        csvLines.push(headers.map(h => escapeCSVValue(String(record[h] ?? ''))).join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="synthmed-${Date.now()}.csv"`);
      return res.status(200).send(csvLines.join('\n'));
    }

    res.status(200).json({
      ok: true,
      records,
      metadata: { count, generator_version: 'v2', generated_at: new Date().toISOString() },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to generate records', code: 'GENERATION_FAILED' });
  }
});

router.get('/download', requireAuth, (req, res) => {
  const account = getAccountById.get(req.auth.accountId);
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

  db.prepare(`INSERT INTO usage_events (account_id, api_key_id, endpoint, records_generated, timestamp) VALUES (?, ?, ?, ?, ?)`)
    .run(req.auth.accountId, null, '/api/v1/generate/download', count, new Date().toISOString());

  if (format === 'csv') {
    const headers = Object.keys(records[0]);
    const lines = [headers.join(',')];
    for (const r of records) lines.push(headers.map(h => escapeCSVValue(String(r[h] ?? ''))).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="synthmed-${account.tier}-${Date.now()}.csv"`);
    return res.status(200).send(lines.join('\n'));
  }

  res.setHeader('Content-Disposition', `attachment; filename="synthmed-${account.tier}-${Date.now()}.json"`);
  return res.status(200).json({ ok: true, records, count, tier: account.tier, generated_at: new Date().toISOString() });
});

export default router;
