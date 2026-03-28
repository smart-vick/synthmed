/**
 * Standardized error response format
 * All API errors use this consistent structure
 */

export const ERROR_CODES = {
  // Validation errors (400)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_API_KEY: 'INVALID_API_KEY',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  RESOURCE_EXISTS: 'RESOURCE_EXISTS',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',

  // Rate limit errors (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors (500+)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};

/**
 * Create a standardized error response
 */
export function createErrorResponse(code, message, statusCode = 400, details = {}) {
  return {
    ok: false,
    error: message,
    code,
    ...(Object.keys(details).length > 0 && { details }),
  };
}

/**
 * Express error handler middleware
 * Use at the end of app setup: app.use(errorHandler)
 */
export function errorHandler(err, req, res, next) {
  console.error('[error-handler]', err);

  // Default to 500 Internal Server Error
  let statusCode = err.statusCode || 500;
  let code = err.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = err.message || 'An unexpected error occurred';

  // Don't expose internal error messages in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  res.status(statusCode).json(createErrorResponse(code, message, statusCode));
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(message, statusCode = 400, code = ERROR_CODES.INVALID_INPUT) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Validation error helper
 */
export function validationError(errors) {
  return {
    ok: false,
    error: 'Validation failed',
    code: ERROR_CODES.VALIDATION_FAILED,
    errors,
  };
}

/**
 * Not found error
 */
export function notFoundError(resource = 'Resource') {
  return {
    ok: false,
    error: `${resource} not found`,
    code: ERROR_CODES.NOT_FOUND,
    statusCode: 404,
  };
}

/**
 * Unauthorized error
 */
export function unauthorizedError(message = 'Unauthorized') {
  return {
    ok: false,
    error: message,
    code: ERROR_CODES.UNAUTHORIZED,
    statusCode: 401,
  };
}

/**
 * Rate limit error
 */
export function rateLimitError(message = 'Too many requests') {
  return {
    ok: false,
    error: message,
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    statusCode: 429,
  };
}
