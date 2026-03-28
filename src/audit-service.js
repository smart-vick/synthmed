import { logAudit } from '../db.js';

/**
 * Extract client IP address from request
 * Handles proxies and load balancers (x-forwarded-for, etc)
 */
export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Log an audit event
 * Used for compliance, security monitoring, and debugging
 */
export function recordAudit(accountId, action, resource, resourceId, ipAddress) {
  try {
    logAudit.run({
      account_id: accountId,
      action,
      resource,
      resource_id: resourceId || null,
      ip_address: ipAddress,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[audit-service] Failed to log audit event:', err);
    // Don't throw - audit logging shouldn't break the request
  }
}

/**
 * Audit event types
 */
export const AUDIT_EVENTS = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  ACCOUNT_CREATED: 'account_created',
  ACCOUNT_DELETED: 'account_deleted',
  API_KEY_CREATED: 'api_key_created',
  API_KEY_USED: 'api_key_used',
  API_KEY_DELETED: 'api_key_deleted',
  DATA_GENERATED: 'data_generated',
  PASSWORD_CHANGED: 'password_changed',
};
