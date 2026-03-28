import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { createAccount, getAccountByEmail, getAccountById, createApiKey, getApiKeyByKey, updateApiKeyLastUsed, logAudit } from '../db.js';
import { withTransaction } from './transaction-helper.js';

// CRITICAL: JWT_SECRET must be set in environment - no fallback
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('\n❌ FATAL: JWT_SECRET environment variable not set or too short (min 32 chars)\n');
  process.exit(1);
}

const JWT_EXPIRES_IN = '1h';  // Short-lived access token
const JWT_REFRESH_EXPIRES_IN = '30d';  // Long-lived refresh token
const API_KEY_PREFIX = 'sk_';
const API_KEY_EXPIRES_IN_DAYS = 365;  // API keys expire after 1 year

// Hash password
export async function hashPassword(password) {
  return bcryptjs.hash(password, 10);
}

// Verify password
export async function verifyPassword(password, hash) {
  return bcryptjs.compare(password, hash);
}

// Register new account
export async function register(email, organization, password) {
  const existingAccount = getAccountByEmail.get(email);
  if (existingAccount) {
    throw new Error('Account already exists');
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  try {
    // Use transaction to ensure account creation is atomic
    const account = withTransaction(() => {
      const result = createAccount.run({
        email,
        organization,
        password_hash: passwordHash,
        created_at: now,
      });

      const accountId = result.lastInsertRowid;

      // Log account creation in transaction
      logAudit.run({
        account_id: accountId,
        action: 'account_created',
        resource: 'accounts',
        resource_id: accountId,
        ip_address: 'system',
        created_at: now,
      });

      return {
        id: accountId,
        email,
        organization,
        tier: 'free',
        status: 'active',
      };
    });

    return account;
  } catch (err) {
    throw new Error('Failed to create account');
  }
}

// Login - with timing attack prevention
export async function login(email, password) {
  const account = getAccountByEmail.get(email);

  // CRITICAL FIX: Always run bcrypt comparison, even if account doesn't exist
  // This prevents timing attacks that can enumerate valid emails
  const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KfK';
  const passwordValid = await verifyPassword(password, account?.password_hash || dummyHash);

  // After timing-constant comparison, check if account exists
  if (!account || !passwordValid) {
    throw new Error('Invalid email or password');
  }

  // Generate both access and refresh tokens
  const accessToken = jwt.sign(
    { accountId: account.id, email: account.email, tier: account.tier, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { accountId: account.id, email: account.email, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );

  return {
    accessToken,
    refreshToken,
    account: {
      id: account.id,
      email: account.email,
      organization: account.organization,
      tier: account.tier,
    },
  };
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Refresh access token using refresh token
export function refreshAccessToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    // Ensure it's actually a refresh token
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Generate new access token
    const account = getAccountById.get(decoded.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const accessToken = jwt.sign(
      { accountId: account.id, email: account.email, tier: account.tier, type: 'access' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      accessToken,
      account: {
        id: account.id,
        email: account.email,
        organization: account.organization,
        tier: account.tier,
      },
    };
  } catch (err) {
    throw new Error('Failed to refresh token');
  }
}

// Generate API key
export function generateApiKey() {
  return API_KEY_PREFIX + crypto.randomBytes(32).toString('hex');
}

// Create API key for account
export function createAccountApiKey(accountId, name) {
  const key = generateApiKey();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + API_KEY_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Use transaction to ensure API key creation is atomic
    const apiKey = withTransaction(() => {
      const result = createApiKey.run({
        key,
        account_id: accountId,
        name,
        expires_at: expiresAt,
        created_at: now.toISOString(),
      });

      const apiKeyId = result.lastInsertRowid;

      // Log API key creation in transaction
      logAudit.run({
        account_id: accountId,
        action: 'api_key_created',
        resource: 'api_keys',
        resource_id: apiKeyId,
        ip_address: 'system',
        created_at: now.toISOString(),
      });

      return {
        id: apiKeyId,
        key,
        name,
        createdAt: now.toISOString(),
        expiresAt,
      };
    });

    return apiKey;
  } catch (err) {
    throw new Error('Failed to create API key');
  }
}

// Verify API key
export function verifyApiKey(key) {
  try {
    const apiKey = getApiKeyByKey.get(key);
    if (!apiKey) {
      return null;
    }

    // Check if key is expired
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return null;  // Key is expired
    }

    // Update last used
    const now = new Date().toISOString();
    updateApiKeyLastUsed.run(now, apiKey.id);

    return {
      id: apiKey.id,
      accountId: apiKey.account_id,
      tier: apiKey.tier,
    };
  } catch (err) {
    return null;
  }
}

// Get account
export function getAccount(accountId) {
  return getAccountById.get(accountId);
}
