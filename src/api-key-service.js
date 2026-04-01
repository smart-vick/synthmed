import crypto from 'crypto';
import { createApiKey, revokeApiKey, getApiKeysByAccount, getApiKeyByKey } from '../db.js';

/**
 * Hash an API key with SHA-256 for safe DB storage.
 * Raw key shown to user once at creation — only the hash is persisted.
 * @param {string} key - Raw API key
 * @returns {string} SHA-256 hex digest
 */
export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

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
export async function createAccountApiKey(accountId, name) {
  const key = generateApiKey();
  const keyHash = hashApiKey(key); // store only the hash
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 365 days

  try {
    const result = await createApiKey.run(
      accountId,
      keyHash,
      name,
      expiresAt.toISOString()
    );

    return {
      id: result.lastID,
      key, // Only returned once, at creation time — never stored in plain text
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
export async function revokeAccountApiKey(keyId, accountId) {
  try {
    await revokeApiKey.run(new Date().toISOString(), keyId, accountId);
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
export async function listAccountApiKeys(accountId) {
  try {
    return await getApiKeysByAccount.all(accountId) || [];
  } catch (err) {
    const error = new Error('Failed to retrieve API keys');
    error.status = 500;
    throw error;
  }
}

/**
 * Validate an API key by hashing it and looking up the stored hash.
 * @param {string} key - Raw API key from request header
 * @returns {Object} Key record if valid, null otherwise
 */
export async function validateApiKey(key) {
  return await getApiKeyByKey.get(hashApiKey(key));
}
