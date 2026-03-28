import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'synthmed.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    organization TEXT NOT NULL,
    role TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    organization TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    tier TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    account_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    last_used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS usage_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    api_key_id INTEGER,
    endpoint TEXT NOT NULL,
    records_generated INTEGER DEFAULT 1,
    cost_cents INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    action TEXT NOT NULL,
    resource TEXT,
    resource_id TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS preview_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province TEXT,
    condition_category TEXT,
    format TEXT,
    generated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_api_keys_account ON api_keys(account_id);
  CREATE INDEX IF NOT EXISTS idx_usage_account ON usage_events(account_id);
  CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_account ON audit_logs(account_id);
  CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
`);

// Leads
export const insertLead = db.prepare('INSERT INTO leads (name, email, organization, role, message, created_at) VALUES (@name, @email, @organization, @role, @message, @created_at)');
export const getAllLeads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC');
export const getLeadById = db.prepare('SELECT * FROM leads WHERE id = ?');
export const updateLeadStatus = db.prepare('UPDATE leads SET status = ? WHERE id = ?');

// Accounts
export const createAccount = db.prepare('INSERT INTO accounts (email, organization, password_hash, created_at) VALUES (@email, @organization, @password_hash, @created_at)');
export const getAccountByEmail = db.prepare('SELECT * FROM accounts WHERE email = ?');
export const getAccountById = db.prepare('SELECT * FROM accounts WHERE id = ?');
export const updateAccountTier = db.prepare('UPDATE accounts SET tier = ? WHERE id = ?');

// API Keys
export const createApiKey = db.prepare('INSERT INTO api_keys (key, account_id, name, created_at) VALUES (@key, @account_id, @name, @created_at)');
export const getApiKeyByKey = db.prepare('SELECT ak.*, a.id as account_id, a.tier FROM api_keys ak JOIN accounts a ON ak.account_id = a.id WHERE ak.key = ?');
export const getApiKeysByAccount = db.prepare('SELECT * FROM api_keys WHERE account_id = ? ORDER BY created_at DESC');
export const updateApiKeyLastUsed = db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?');

// Usage Tracking
export const recordUsage = db.prepare('INSERT INTO usage_events (account_id, api_key_id, endpoint, records_generated, cost_cents, created_at) VALUES (@account_id, @api_key_id, @endpoint, @records_generated, @cost_cents, @created_at)');
export const getUsageByAccount = db.prepare('SELECT * FROM usage_events WHERE account_id = ? AND created_at >= ? ORDER BY created_at DESC');
export const getUsageStats = db.prepare('SELECT COUNT(*) as total_requests, SUM(records_generated) as total_records, SUM(cost_cents) as total_cost FROM usage_events WHERE account_id = ? AND created_at >= ?');

// Audit Logs
export const logAudit = db.prepare('INSERT INTO audit_logs (account_id, action, resource, resource_id, ip_address, created_at) VALUES (@account_id, @action, @resource, @resource_id, @ip_address, @created_at)');

// Preview Events
export const insertPreviewEvent = db.prepare('INSERT INTO preview_events (province, condition_category, format, generated_at) VALUES (@province, @condition_category, @format, @generated_at)');
export function getPreviewCount() { return db.prepare('SELECT COUNT(*) as count FROM preview_events').get(); }

export default db;