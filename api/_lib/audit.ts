import { newId } from './crypto.js';
import { getClientIp, type ApiRequest } from './http.js';
import { logEvent } from './log.js';
import type { Store, UserRecord } from './store.js';

export type AuditType =
  | 'signup'
  | 'login'
  | 'login_failed'
  | 'login_blocked'
  | 'password_changed'
  | 'password_reset'
  | 'account_deleted'
  | 'rsvp_link_created'
  | 'admin_user_updated'
  | 'admin_sessions_revoked'
  | 'admin_user_deleted'
  | 'admin_backup_downloaded';

interface AuditOptions {
  actor?: Pick<UserRecord, 'id' | 'email'> | null;
  target?: Pick<UserRecord, 'id' | 'email'> | null;
  detail?: string;
}

/** Writes one audit-trail row. Never throws: losing an audit row must not break the user's request. */
export async function audit(store: Store, req: ApiRequest, type: AuditType, opts: AuditOptions = {}): Promise<void> {
  const entry = {
    id: newId('aud'),
    at: new Date().toISOString(),
    type,
    actorId: opts.actor?.id,
    actorEmail: opts.actor?.email,
    targetId: opts.target?.id,
    targetEmail: opts.target?.email,
    ip: getClientIp(req).slice(0, 64),
    detail: opts.detail?.slice(0, 300),
  };
  logEvent('info', `audit.${type}`, { actor: entry.actorEmail, target: entry.targetEmail, ip: entry.ip });
  try {
    await store.appendAudit(entry);
  } catch (err) {
    logEvent('warn', 'audit_write_failed', { type, error: String(err) });
  }
}