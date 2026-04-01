import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createAccount, getAccountByEmail, getAccountById } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_SECRET + '_refresh'; // Use same secret with suffix

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

/**
 * Register a new account
 * @param {string} email - User email
 * @param {string} organization - Organization name
 * @param {string} password - User password
 * @returns {Object} Created account without password
 */
export async function register(email, organization, password) {
  // Check if account already exists
  const existingAccount = await getAccountByEmail.get(email);
  if (existingAccount) {
    const error = new Error('Account already exists');
    error.code = 'ACCOUNT_EXISTS';
    error.status = 409;
    throw error;
  }

  // Hash password
  const passwordHash = await bcryptjs.hash(password, 12);
  const now = new Date().toISOString();

  try {
    const result = await createAccount.run(
      email,
      passwordHash,
      organization
    );

    return {
      id: result.lastID,
      email,
      organization,
      tier: 'free',
      status: 'active',
    };
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed') || err.message.includes('duplicate key')) {
      const error = new Error('Account already exists');
      error.code = 'ACCOUNT_EXISTS';
      error.status = 409;
      throw error;
    }
    throw err;
  }
}

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} Tokens and account info
 */
export async function login(email, password) {
  const account = await getAccountByEmail.get(email);

  // Always verify password to prevent timing attacks
  const testHash = '$2a$12$K.A6h8Ld9p4KkHK.YfYh.OuYGwFMrN8zKV.Y2wKpH3K2K2K2K2K2'; // dummy hash
  await bcryptjs.compare(password, account ? account.password_hash : testHash);

  if (!account) {
    const error = new Error('Invalid email or password');
    error.code = 'INVALID_CREDENTIALS';
    error.status = 401;
    throw error;
  }

  // Generate tokens
  const accessToken = jwt.sign(
    {
      accountId: account.id,
      email: account.email,
      tier: account.tier,
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    {
      accountId: account.id,
      email: account.email,
      type: 'refresh',
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
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

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} New access token
 */
export async function refreshAccessToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Fetch fresh account data so tier upgrades reflect immediately
    const account = await getAccountById.get(decoded.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const accessToken = jwt.sign(
      {
        accountId: account.id,
        email: account.email,
        tier: account.tier,  // always current, not stale from old token
        type: 'access',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return { accessToken };
  } catch (err) {
    const error = new Error('Invalid refresh token');
    error.code = 'INVALID_TOKEN';
    error.status = 401;
    throw error;
  }
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const error = new Error('Invalid token');
    error.code = 'INVALID_TOKEN';
    error.status = 401;
    throw error;
  }
}
