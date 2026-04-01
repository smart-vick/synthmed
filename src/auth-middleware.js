import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getAccountById } from '../db.js';
import { validateApiKey } from './api-key-service.js';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to require JWT authentication
 * Attaches auth object to request with accountId, email, tier
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      error: 'Missing or invalid authorization header',
      code: 'MISSING_AUTH',
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'access') {
      return res.status(401).json({
        ok: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN',
      });
    }

    // Verify account still exists
    const account = getAccountById.get(decoded.accountId);
    if (!account) {
      return res.status(401).json({
        ok: false,
        error: 'Account not found',
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    req.auth = {
      accountId: decoded.accountId,
      email: decoded.email,
      tier: decoded.tier,
      type: 'jwt',
    };

    next();
  } catch (err) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
  }
}

/**
 * Middleware to require API key authentication
 * Attaches auth object to request with accountId and tier
 */
export function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      ok: false,
      error: 'Missing API key. Use x-api-key header',
      code: 'MISSING_API_KEY',
    });
  }

  const keyRecord = validateApiKey(apiKey);

  if (!keyRecord) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid API key',
      code: 'INVALID_API_KEY',
    });
  }

  // Check if key is expired
  if (new Date(keyRecord.expires_at) < new Date()) {
    return res.status(401).json({
      ok: false,
      error: 'API key has expired',
      code: 'EXPIRED_API_KEY',
    });
  }

  // Get account info
  const account = getAccountById.get(keyRecord.account_id);
  if (!account) {
    return res.status(401).json({
      ok: false,
      error: 'Account not found',
      code: 'ACCOUNT_NOT_FOUND',
    });
  }

  req.auth = {
    accountId: keyRecord.account_id,
    apiKeyId: keyRecord.id,
    email: account.email,
    tier: account.tier,
    type: 'api_key',
  };

  next();
}

/**
 * Middleware to accept either JWT or API key
 */
export function requireAuthEither(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return requireAuth(req, res, next);
  } else if (apiKey) {
    return requireApiKey(req, res, next);
  } else {
    return res.status(401).json({
      ok: false,
      error: 'Missing authentication (JWT or API key)',
      code: 'MISSING_AUTH',
    });
  }
}

/**
 * Middleware to optionally attach account info if authenticated
 * Does not fail if no auth provided
 */
export function attachAccountId(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const account = getAccountById.get(decoded.accountId);
      if (account) {
        req.auth = {
          accountId: decoded.accountId,
          email: decoded.email,
          tier: decoded.tier,
          type: 'jwt',
        };
      }
    } catch (err) {
      // Silent fail - authentication is optional
    }
  } else if (apiKey) {
    const keyRecord = validateApiKey(apiKey);
    if (keyRecord && new Date(keyRecord.expires_at) >= new Date()) {
      const account = getAccountById.get(keyRecord.account_id);
      if (account) {
        req.auth = {
          accountId: keyRecord.account_id,
          apiKeyId: keyRecord.id,
          email: account.email,
          tier: account.tier,
          type: 'api_key',
        };
      }
    }
  }

  next();
}

/**
 * Middleware to verify admin key
 */
export function requireAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_KEY;

  if (!adminKey || !expectedKey) {
    return res.status(401).json({
      ok: false,
      error: 'Admin authentication required',
      code: 'MISSING_ADMIN_KEY',
    });
  }

  // Constant-time comparison using crypto.timingSafeEqual to prevent timing attacks
  const a = Buffer.from(adminKey);
  const b = Buffer.from(expectedKey);
  const len = Math.max(a.length, b.length);
  const aPadded = Buffer.alloc(len);
  const bPadded = Buffer.alloc(len);
  a.copy(aPadded);
  b.copy(bPadded);
  const match = a.length === b.length && crypto.timingSafeEqual(aPadded, bPadded);

  if (!match) {
    return res.status(403).json({
      ok: false,
      error: 'Unauthorized',
      code: 'INVALID_ADMIN_KEY',
    });
  }

  next();
}
