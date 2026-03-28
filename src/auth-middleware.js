import { verifyToken, verifyApiKey } from './auth-service.js';

// Middleware: JWT authentication
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      error: 'Missing or invalid authorization header',
      code: 'UNAUTHORIZED',
    });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
  }

  req.auth = payload;
  next();
}

// Middleware: API key authentication
export function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      ok: false,
      error: 'Missing API key',
      code: 'MISSING_API_KEY',
    });
  }

  const keyData = verifyApiKey(apiKey);

  if (!keyData) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid API key',
      code: 'INVALID_API_KEY',
    });
  }

  req.auth = {
    accountId: keyData.accountId,
    tier: keyData.tier,
    apiKeyId: keyData.id,
  };
  next();
}

// Middleware: Either JWT or API key
export function requireAuthEither(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    if (payload) {
      req.auth = payload;
      return next();
    }
  }

  if (apiKey) {
    const keyData = verifyApiKey(apiKey);

    if (keyData) {
      req.auth = {
        accountId: keyData.accountId,
        tier: keyData.tier,
        apiKeyId: keyData.id,
      };
      return next();
    }
  }

  return res.status(401).json({
    ok: false,
    error: 'Missing or invalid authentication',
    code: 'UNAUTHORIZED',
  });
}

// Middleware: Capture account ID from request
export function attachAccountId(req, res, next) {
  if (req.auth) {
    req.accountId = req.auth.accountId;
  }
  next();
}
