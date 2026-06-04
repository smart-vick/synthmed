import { Router } from 'express';
import { getAccountById } from '../../db.js';
import { register, login, refreshAccessToken } from '../auth-service.js';
import { requireAuth } from '../auth-middleware.js';
import { validateRequest, registerSchema, loginSchema, refreshTokenSchema } from '../schemas.js';
import { authLimiter } from '../rate-limiter.js';
import { recordAudit } from '../../db.js';
import db from '../../db.js';
import { getClientIp } from '../utils.js';

const router = Router();

router.post('/register', authLimiter, async (req, res) => {
  const validation = validateRequest(registerSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({ ok: false, error: 'Validation failed', code: 'VALIDATION_FAILED', errors: validation.errors });
  }

  try {
    const { email, organization, password } = validation.data;
    const account = await register(email, organization, password);

    recordAudit.run(account.id, 'ACCOUNT_CREATED', 'account', account.id, getClientIp(req), req.headers['user-agent'], new Date().toISOString());

    res.status(201).json({ ok: true, message: 'Account created successfully', account });
  } catch (err) {
    if (err.code === 'ACCOUNT_EXISTS') {
      return res.status(409).json({ ok: false, error: 'Account already exists', code: 'ACCOUNT_EXISTS' });
    }
    res.status(500).json({ ok: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const validation = validateRequest(loginSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({ ok: false, error: 'Validation failed', code: 'VALIDATION_FAILED', errors: validation.errors });
  }

  try {
    const { email, password } = validation.data;
    const result = await login(email, password);

    recordAudit.run(result.account.id, 'LOGIN_SUCCESS', 'account', result.account.id, getClientIp(req), req.headers['user-agent'], new Date().toISOString());

    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    if (err.code === 'INVALID_CREDENTIALS') {
      recordAudit.run(null, 'LOGIN_FAILED', 'account', null, getClientIp(req), req.headers['user-agent'], new Date().toISOString());
      return res.status(401).json({ ok: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    }
    res.status(500).json({ ok: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

router.post('/refresh', (req, res) => {
  const validation = validateRequest(refreshTokenSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({ ok: false, error: 'Validation failed', code: 'VALIDATION_FAILED', errors: validation.errors });
  }

  try {
    const result = refreshAccessToken(validation.data.refreshToken);
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    res.status(401).json({ ok: false, error: 'Invalid refresh token', code: 'INVALID_TOKEN' });
  }
});

router.get('/account', requireAuth, (req, res) => {
  const account = getAccountById.get(req.auth.accountId);
  if (!account) {
    return res.status(404).json({ ok: false, error: 'Account not found', code: 'NOT_FOUND' });
  }

  res.status(200).json({
    ok: true,
    account: { id: account.id, email: account.email, organization: account.organization, tier: account.tier, status: account.status, created_at: account.created_at },
  });
});

router.delete('/account', requireAuth, (req, res) => {
  const now = new Date().toISOString();
  db.prepare("UPDATE accounts SET status = 'deleted', updated_at = ? WHERE id = ?").run(now, req.auth.accountId);

  recordAudit.run(req.auth.accountId, 'ACCOUNT_DELETED', 'account', req.auth.accountId, getClientIp(req), req.headers['user-agent'], now);

  res.status(200).json({ ok: true, message: 'Account deleted successfully' });
});

export default router;
