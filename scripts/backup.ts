/**
 * npm run backup                     -> backups/eventwise-<timestamp>.json
 * npm run restore -- <file.json>     -> loads a backup into the configured database (merges, never deletes)
 *
 * Uses the same environment variables as the server (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN or DATA_DIR),
 * so run it wherever those are set. Backups contain password hashes and personal data: keep them private.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getStore, type BackupSnapshot } from '../api/_lib/store.js';

const mode = process.argv[2];

async function main(): Promise<void> {
  const store = getStore();
  if (mode === 'backup') {
    const snap = await store.exportAll();
    const dir = process.env.BACKUP_DIR || 'backups';
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = path.join(dir, `eventwise-${snap.createdAt.replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(file, JSON.stringify(snap), { mode: 0o600 });
    console.log(`Backed up ${snap.users.length} users, ${snap.events.length} event documents, ${snap.rsvpLinks.length} RSVP links (${store.kind}) -> ${file}`);
  } else if (mode === 'restore') {
    const file = process.argv[3];
    if (!file) throw new Error('Usage: npm run restore -- <backup.json>');
    const snap = JSON.parse(fs.readFileSync(file, 'utf8')) as BackupSnapshot;
    if (snap.version !== 1 || !Array.isArray(snap.users)) throw new Error('This does not look like an EventWise backup file.');
    await store.importAll(snap);
    console.log(`Restored ${snap.users.length} users and ${snap.events.length} event documents into ${store.kind} storage.`);
  } else {
    throw new Error('Usage: backup.ts backup | restore <file>');
  }
}

main().catch((err) => {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
});