import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'synthmed.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create all tables
db.exec(`
  -- Accounts table
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    organization TEXT NOT NULL,
    tier TEXT DEFAULT 'free' CHECK(tier IN ('free', 'starter', 'pro', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'deleted')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- API Keys table
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );

  -- Usage events table (for tracking API usage)
  CREATE TABLE IF NOT EXISTS usage_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    api_key_id INTEGER,
    endpoint TEXT NOT NULL,
    records_generated INTEGER DEFAULT 0,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
  );

  -- Audit logs table
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    action TEXT NOT NULL,
    resource TEXT,
    resource_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
  );

  -- Leads table (for lead capture)
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    organization TEXT NOT NULL,
    role TEXT,
    message TEXT,
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'converted', 'lost')),
    created_at TEXT NOT NULL
  );

  -- Preview events table
  CREATE TABLE IF NOT EXISTS preview_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province TEXT,
    condition_category TEXT,
    format TEXT,
    generated_at TEXT NOT NULL
  );

  -- Create indexes for faster queries
  CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
  CREATE INDEX IF NOT EXISTS idx_api_keys_account ON api_keys(account_id);
  CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
  CREATE INDEX IF NOT EXISTS idx_usage_events_account ON usage_events(account_id);
  CREATE INDEX IF NOT EXISTS idx_usage_events_timestamp ON usage_events(timestamp);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_account ON audit_logs(account_id);
  CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
`);

// Account operations
export const createAccount = db.prepare(`
  INSERT INTO accounts (email, password_hash, organization, tier, status, created_at, updated_at)
  VALUES (?, ?, ?, 'free', 'active', ?, ?)
`);
export const getAccountByEmail = db.prepare("SELECT * FROM accounts WHERE email = ? AND status != 'deleted'");
export const getAccountById = db.prepare("SELECT * FROM accounts WHERE id = ? AND status != 'deleted'");
export const updateAccountTier = db.prepare('UPDATE accounts SET tier = ?, updated_at = ? WHERE id = ?');
export const deleteAccount = db.prepare("UPDATE accounts SET status = 'deleted', updated_at = ? WHERE id = ?");

// API Key operations
export const createApiKey = db.prepare(`
  INSERT INTO api_keys (account_id, key, name, expires_at, created_at)
  VALUES (?, ?, ?, ?, ?)
`);
export const getApiKeyByKey = db.prepare('SELECT * FROM api_keys WHERE key = ? AND revoked_at IS NULL');
export const getApiKeysByAccount = db.prepare("SELECT id, name, SUBSTR(key, 1, 7) || '...' as key_preview, expires_at, created_at FROM api_keys WHERE account_id = ? AND revoked_at IS NULL ORDER BY created_at DESC");
export const revokeApiKey = db.prepare('UPDATE api_keys SET revoked_at = ? WHERE id = ? AND account_id = ?');

// Usage tracking
export const recordUsage = db.prepare(`
  INSERT INTO usage_events (account_id, api_key_id, endpoint, records_generated, timestamp)
  VALUES (?, ?, ?, ?, ?)
`);
export const getUserMonthlyUsage = db.prepare(`
  SELECT
    COUNT(*) as total_requests,
    SUM(records_generated) as total_records,
    strftime('%Y-%m', timestamp) as month
  FROM usage_events
  WHERE account_id = ? AND timestamp >= datetime('now', '-30 days')
  GROUP BY month
`);

// Audit logging
export const recordAudit = db.prepare(`
  INSERT INTO audit_logs (account_id, action, resource, resource_id, ip_address, user_agent, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Lead operations
export const insertLead = db.prepare('INSERT INTO leads (name, email, organization, role, message, created_at) VALUES (?, ?, ?, ?, ?, ?)');
export const getAllLeads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC');
export const getLeadById = db.prepare('SELECT * FROM leads WHERE id = ?');
export const updateLeadStatus = db.prepare('UPDATE leads SET status = ? WHERE id = ?');
export const getLeadsWithPagination = db.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT ? OFFSET ?');
export const countAllLeads = db.prepare('SELECT COUNT(*) as count FROM leads');

// Preview events
export const insertPreviewEvent = db.prepare('INSERT INTO preview_events (province, condition_category, format, generated_at) VALUES (?, ?, ?, ?)');
export function getPreviewCount() { return db.prepare('SELECT COUNT(*) as count FROM preview_events').get(); }

export default db;