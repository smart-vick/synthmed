import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'synthmed.db'));

db.exec(`CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, organization TEXT NOT NULL, role TEXT, message TEXT, status TEXT DEFAULT 'new', created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS preview_events (id INTEGER PRIMARY KEY AUTOINCREMENT, province TEXT, condition_category TEXT, format TEXT, generated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS psychiatry_sessions (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, depth_reached INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS psychiatry_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL);`);

export const insertLead = db.prepare('INSERT INTO leads (name, email, organization, role, message, created_at) VALUES (@name, @email, @organization, @role, @message, @created_at)');
export const getAllLeads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC');
export const getLeadById = db.prepare('SELECT * FROM leads WHERE id = ?');
export const updateLeadStatus = db.prepare('UPDATE leads SET status = ? WHERE id = ?');
export const insertPreviewEvent = db.prepare('INSERT INTO preview_events (province, condition_category, format, generated_at) VALUES (@province, @condition_category, @format, @generated_at)');
export function getPreviewCount() { return db.prepare('SELECT COUNT(*) as count FROM preview_events').get(); }

export const insertPsychSession = db.prepare('INSERT OR IGNORE INTO psychiatry_sessions (id, created_at) VALUES (?, ?)');
export const insertPsychMessage = db.prepare('INSERT INTO psychiatry_messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)');
export const getPsychMessages   = db.prepare('SELECT * FROM psychiatry_messages WHERE session_id = ? ORDER BY id ASC');

export default db;