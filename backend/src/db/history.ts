
import db from './database';
import { v4 as uuidv4 } from 'uuid';

export type Message = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  text: string;
  analysis_id?: string | null;
  created_at: string;
  seq?: number;
};

export type Conversation = {
  id: string;
  title: string;
  is_archived: number;
  created_at: string;
  updated_at: string;
};

export function initHistory() {
  db.prepare(`CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user','assistant')),
    text TEXT NOT NULL,
    analysis_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    seq INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  )`).run();

  // add missing columns (idempotent)
  try { db.prepare(`ALTER TABLE conversations ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0`).run(); } catch {}
  try { db.prepare(`ALTER TABLE conversations ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))`).run(); } catch {}
  try { db.prepare(`ALTER TABLE messages ADD COLUMN seq INTEGER NOT NULL DEFAULT 0`).run(); } catch {}
}

export function createConversation(title: string): Conversation {
  const id = uuidv4();
  db.prepare(`INSERT INTO conversations (id, title) VALUES (?,?)`).run(id, title);
  return getConversation(id)!;
}

export function getConversation(id: string): Conversation | undefined {
  const row = db.prepare(`SELECT id,title,is_archived,created_at,updated_at FROM conversations WHERE id=?`).get(id);
  return row as Conversation | undefined;
}

// استبدل دالة listConversations بالكامل بهذا الشكل
export function listConversations(
  { includeArchived = false, limit = 50, offset = 0 } = {} as any
): Conversation[] {
  const rows = db.prepare(`
    SELECT id, title, is_archived, created_at, updated_at
    FROM conversations
    WHERE (? = 1 OR is_archived = 0)
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
  `).all(includeArchived ? 1 : 0, limit, offset);
  return rows as Conversation[];
}



export function archiveConversation(id: string, archived = true) {
  db.prepare(`UPDATE conversations SET is_archived=?, updated_at=datetime('now') WHERE id=?`).run(archived ? 1 : 0, id);
}

export function deleteConversation(id: string) {
  db.prepare(`DELETE FROM conversations WHERE id=?`).run(id);
}

export function addMessage(conversation_id: string, role: 'user'|'assistant', text: string, analysis_id?: string|null) {
  // compute next seq
  const maxSeq = db.prepare(`SELECT IFNULL(MAX(seq),0) as m FROM messages WHERE conversation_id=?`).get(conversation_id)?.m || 0;
  const id = uuidv4();
  db.prepare(`INSERT INTO messages (id, conversation_id, role, text, analysis_id, seq) VALUES (?,?,?,?,?,?)`)
    .run(id, conversation_id, role, text, analysis_id || null, maxSeq + 1);
  db.prepare(`UPDATE conversations SET updated_at=datetime('now') WHERE id=?`).run(conversation_id);
  return getMessage(id);
}

export function getMessage(id: string): Message | undefined {
  return db.prepare(`SELECT * FROM messages WHERE id=?`).get(id) as Message | undefined;
}

export function getMessages(conversation_id: string, page=1, pageSize=50) {
  const offset = (Math.max(1,page)-1) * Math.max(1,pageSize);
  const rows = db.prepare(`
    SELECT * FROM messages
    WHERE conversation_id=?
    ORDER BY seq ASC
    LIMIT ? OFFSET ?
  `).all(conversation_id, pageSize, offset) as Message[];

  const total = db.prepare(`SELECT COUNT(*) as c FROM messages WHERE conversation_id=?`).get(conversation_id)?.c || 0;
  return { rows, total, page, pageSize, pages: Math.ceil(total/Math.max(1,pageSize)) };
}
