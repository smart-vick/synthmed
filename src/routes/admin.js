import { Router } from 'express';
import { getLeadsWithPagination, countAllLeads, getLeadById, updateLeadStatus, getVisitorStats } from '../../db.js';
import { requireAdmin } from '../auth-middleware.js';
import { validateRequest, paginationSchema } from '../schemas.js';

const router = Router();

router.get('/leads', requireAdmin, (req, res) => {
  const validation = validateRequest(paginationSchema, req.query);
  if (!validation.valid) {
    return res.status(400).json({ ok: false, error: 'Validation failed', code: 'VALIDATION_FAILED', errors: validation.errors });
  }

  const { limit, offset } = validation.data;
  const leads = getLeadsWithPagination.all(limit, offset);
  const { count } = countAllLeads.get();

  res.status(200).json({
    ok: true,
    leads,
    pagination: { limit, offset, total: count, page: Math.floor(offset / limit) + 1, pages: Math.ceil(count / limit) },
  });
});

router.get('/leads/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid lead ID', code: 'INVALID_ID' });
  }

  const lead = getLeadById.get(id);
  if (!lead) {
    return res.status(404).json({ ok: false, error: 'Lead not found', code: 'NOT_FOUND' });
  }

  res.status(200).json({ ok: true, lead });
});

router.put('/leads/:id/status', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid lead ID', code: 'INVALID_ID' });
  }

  const { status } = req.body;
  const validStatuses = ['new', 'contacted', 'converted', 'lost'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ ok: false, error: 'Invalid status', code: 'INVALID_STATUS' });
  }

  const lead = getLeadById.get(id);
  if (!lead) {
    return res.status(404).json({ ok: false, error: 'Lead not found', code: 'NOT_FOUND' });
  }

  updateLeadStatus.run(status, id);
  res.status(200).json({ ok: true, message: 'Lead status updated', lead: { ...lead, status } });
});

router.get('/visitors', (req, res) => {
  const key = req.query.key || req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  try {
    const stats = getVisitorStats();
    res.json({ ok: true, ...stats });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
