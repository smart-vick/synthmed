import { Router } from 'express';
import { recordAudit } from '../../db.js';
import { requireAuth } from '../auth-middleware.js';
import { validateRequest, createApiKeySchema } from '../schemas.js';
import { createAccountApiKey, revokeAccountApiKey, listAccountApiKeys } from '../api-key-service.js';
import { getClientIp } from '../utils.js';

const router = Router();

router.post('/', requireAuth, (req, res) => {
  const validation = validateRequest(createApiKeySchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({ ok: false, error: 'Validation failed', code: 'VALIDATION_FAILED', errors: validation.errors });
  }

  try {
    const { name } = validation.data;
    const apiKey = createAccountApiKey(req.auth.accountId, name);

    recordAudit.run(req.auth.accountId, 'API_KEY_CREATED', 'api_key', apiKey.id, getClientIp(req), req.headers['user-agent'], new Date().toISOString());

    res.status(201).json({ ok: true, message: 'API key created successfully', apiKey });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to create API key', code: 'KEY_ERROR' });
  }
});

router.get('/', requireAuth, (req, res) => {
  try {
    const keys = listAccountApiKeys(req.auth.accountId);
    res.status(200).json({ ok: true, keys });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to retrieve API keys', code: 'KEY_ERROR' });
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  const keyId = parseInt(req.params.id, 10);
  if (!Number.isInteger(keyId) || keyId <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid key ID', code: 'INVALID_ID' });
  }

  try {
    revokeAccountApiKey(keyId, req.auth.accountId);

    recordAudit.run(req.auth.accountId, 'API_KEY_REVOKED', 'api_key', keyId, getClientIp(req), req.headers['user-agent'], new Date().toISOString());

    res.status(200).json({ ok: true, message: 'API key revoked successfully' });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to revoke API key', code: 'KEY_ERROR' });
  }
});

export default router;
