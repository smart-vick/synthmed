import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { createAccount, getAccountByEmail, getAccountById, createApiKey, getApiKeyByKey, updateApiKeyLastUsed } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const API_KEY_PREFIX = 'sk_';

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
    const result = createAccount.run({
      email,
      organization,
      password_hash: passwordHash,
      created_at: now,
    });

    return {
      id: result.lastInsertRowid,
      email,
      organization,
      tier: 'free',
      status: 'active',
    };
  } catch (err) {
    throw new Error('Failed to create account');
  }
}

// Login
export async function login(email, password) {
  const account = getAccountByEmail.get(email);
  if (!account) {
    throw new Error('Invalid email or password');
  }

  const passwordValid = await verifyPassword(password, account.password_hash);
  if (!passwordValid) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    { accountId: account.id, email: account.email, tier: account.tier },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
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

// Generate API key
export function generateApiKey() {
  return API_KEY_PREFIX + crypto.randomBytes(32).toString('hex');
}

// Create API key for account
export function createAccountApiKey(accountId, name) {
  const key = generateApiKey();
  const now = new Date().toISOString();

  try {
    const result = createApiKey.run({
      key,
      account_id: accountId,
      name,
      created_at: now,
    });

    return {
      id: result.lastInsertRowid,
      key,
      name,
      createdAt: now,
    };
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
