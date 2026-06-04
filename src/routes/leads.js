import { Router } from 'express';
import { insertLead, recordAudit } from '../../db.js';
import { attachAccountId } from '../auth-middleware.js';
import { validateRequest, leadSchema } from '../schemas.js';
import { sendLeadNotification } from '../../mailer.js';
import { getClientIp } from '../utils.js';

const router = Router();

router.post('/', attachAccountId, (req, res) => {
  const validation = validateRequest(leadSchema, req.body);
  if (!validation.valid) {
    return res.status(400).json({ ok: false, error: 'Validation failed', code: 'VALIDATION_FAILED', errors: validation.errors });
  }

  try {
    const { name, email, organization, role, message } = validation.data;
    const result = insertLead.run(name, email, organization, role || '', message || '', new Date().toISOString());

    const lead = { id: result.lastInsertRowid, name, email, organization, role: role || '', message: message || '', status: 'new', created_at: new Date().toISOString() };

    sendLeadNotification(lead).catch(err => console.error('[mailer] Failed to send notification:', err.message));

    if (req.auth) {
      recordAudit.run(req.auth.accountId, 'LEAD_SUBMITTED', 'lead', lead.id, getClientIp(req), req.headers['user-agent'], new Date().toISOString());
    }

    res.status(201).json({ ok: true, message: 'Lead captured successfully', lead });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to capture lead', code: 'LEAD_ERROR' });
  }
});

export default router;
