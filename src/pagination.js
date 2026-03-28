/**
 * Pagination Helper for List Endpoints
 * Provides consistent pagination handling across the API
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

/**
 * Parse and validate pagination parameters
 *
 * @param {object} query - Query parameters { limit, offset }
 * @returns {object} - { limit, offset } with validation
 */
export function parsePaginationParams(query) {
  let limit = parseInt(query.limit || DEFAULT_LIMIT, 10);
  let offset = parseInt(query.offset || 0, 10);

  // Validate limit
  if (isNaN(limit) || limit < MIN_LIMIT) {
    limit = DEFAULT_LIMIT;
  } else if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  // Validate offset
  if (isNaN(offset) || offset < 0) {
    offset = 0;
  }

  return { limit, offset };
}

/**
 * Format paginated response
 *
 * @param {Array} items - The list of items
 * @param {number} limit - Items per page
 * @param {number} offset - Starting position
 * @param {number} total - Total items in database
 * @returns {object} - Formatted pagination metadata
 */
export function formatPaginatedResponse(items, limit, offset, total) {
  const pageNumber = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = offset + limit < total;
  const hasPreviousPage = offset > 0;

  return {
    data: items,
    pagination: {
      limit,
      offset,
      total,
      pageNumber,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      nextOffset: hasNextPage ? offset + limit : null,
      previousOffset: hasPreviousPage ? Math.max(0, offset - limit) : null,
    },
  };
}

/**
 * Create pagination response
 * Combines items with pagination metadata
 */
export function createPaginatedResponse(items, limit, offset, total) {
  return {
    ok: true,
    ...formatPaginatedResponse(items, limit, offset, total),
  };
}

/**
 * Middleware to attach pagination to request
 * Usage: app.use(paginationMiddleware)
 */
export function paginationMiddleware(req, res, next) {
  req.pagination = parsePaginationParams(req.query);
  next();
}

/**
 * Apply limit and offset to a prepared statement
 *
 * @param {Function} statement - Prepared statement with all()
 * @param {number} limit - Items per page
 * @param {number} offset - Starting position
 * @returns {Array} - Paginated items
 */
export function applyPagination(statement, limit, offset) {
  // SQLite LIMIT syntax: LIMIT count OFFSET offset
  return statement.all(limit, offset);
}
