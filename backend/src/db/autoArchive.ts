
import db from './database';

export function autoArchiveOldConversations(days: number) {
  if (!days || days <= 0) return { affected: 0 };
  const res = db.prepare(`
    UPDATE conversations
    SET is_archived = 1, updated_at = datetime('now')
    WHERE is_archived = 0
      AND datetime(created_at) <= datetime('now', '-' || ? || ' days')
  `).run(days.toString());
  return { affected: res.changes || 0 };
}
