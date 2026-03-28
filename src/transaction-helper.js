/**
 * Transaction Helper for SQLite Operations
 * Ensures atomic operations - either all succeed or all fail
 */

import db from '../db.js';

/**
 * Execute a series of operations as a single atomic transaction
 * Either all operations succeed or all are rolled back
 *
 * @param {Function} operations - Function that performs database operations
 * @returns {any} - The result returned by the operations function
 * @throws {Error} - If any operation fails
 *
 * @example
 * const result = withTransaction(() => {
 *   const account = createAccount.run({...});
 *   const apiKey = createApiKey.run({...});
 *   return { account, apiKey };
 * });
 */
export function withTransaction(operations) {
  return db.transaction(operations)();
}

/**
 * Execute operations with automatic error logging
 * Useful for complex operations that might fail
 */
export function withTransactionAndLogging(operations, operationName = 'transaction') {
  try {
    return withTransaction(operations);
  } catch (err) {
    console.error(`[transaction] ${operationName} failed:`, err);
    throw err;
  }
}

/**
 * Wrapper for usage tracking with transaction
 * Ensures usage is recorded atomically even if multiple updates are needed
 */
export function recordUsageInTransaction(recordFn, auditFn) {
  return withTransaction(() => {
    const usageResult = recordFn();
    const auditResult = auditFn();
    return { usageResult, auditResult };
  });
}

/**
 * Get transaction state (for debugging)
 * Note: This is limited in SQLite - you can check if a transaction is active
 * but there's no direct way to check transaction state
 */
export function isTransactionActive() {
  try {
    // SQLite doesn't expose transaction state directly
    // You would need to track it externally if needed
    return false;
  } catch (err) {
    return false;
  }
}

export default { withTransaction, withTransactionAndLogging, recordUsageInTransaction };
