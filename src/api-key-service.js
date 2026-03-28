import crypto from 'crypto';
import { createApiKey, revokeApiKey, getApiKeysByAccount, getApiKeyByKey } from '../db.js';

/**
 * Generate a secure API key
 * Format: sk_{32_random_chars}
 * @returns {string} API key
 */
export function generateApiKey() {
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `sk_${randomPart}`;
}

/**
 * Create a new API key for an account
 * @param {number} accountId - Account ID
 * @param {string} name - Key name
 * @returns {Object} API key details (with full key visible only once)
 */
export function createAccountApiKey(accountId, name) {
  const key = generateApiKey();
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 365 days

  try {
    const result = createApiKey.run(
      accountId,
      key,
      name,
      expiresAt.toISOString(),
      new Date().toISOString()
    );

    return {
      id: result.lastInsertRowid,
      key, // Only returned once, at creation time
      name,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  } catch (err) {
    const error = new Error('Failed to create API key');
    error.status = 500;
    throw error;
  }
}

/**
 * Revoke an API key
 * @param {number} keyId - Key ID
 * @param {number} accountId - Account ID (for verification)
 * @returns {boolean} Success
 */
export function revokeAccountApiKey(keyId, accountId) {
  try {
    revokeApiKey.run(new Date().toISOString(), keyId, accountId);
    return true;
  } catch (err) {
    const error = new Error('Failed to revoke API key');
    error.status = 500;
    throw error;
  }
}

/**
 * List all active API keys for an account
 * @param {number} accountId - Account ID
 * @returns {Array} Array of API key objects (key is masked)
 */
export function listAccountApiKeys(accountId) {
  try {
    return getApiKeysByAccount.all(accountId) || [];
  } catch (err) {
    const error = new Error('Failed to retrieve API keys');
    error.status = 500;
    throw error;
  }
}

/**
 * Validate an API key
 * @param {string} key - API key
 * @returns {Object} Key record if valid, null otherwise
 */
export function validateApiKey(key) {
  return getApiKeyByKey.get(key);
}
