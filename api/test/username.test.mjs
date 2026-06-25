import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateUsername, normalizeUsername, isHandleInCooldown, USERNAME_COOLDOWN_MS, lookupHandle, isUsernameConflict } from '../src/validation.mjs';
import { makeTestD1 } from './helpers/d1.mjs';

test('accepts a simple lowercase handle', () => {
  const r = validateUsername('alice');
  assert.equal(r.valid, true);
  assert.equal(r.normalized, 'alice');
});

test('case-folds mixed case so Alice and alice are the same handle', () => {
  assert.equal(normalizeUsername('Alice'), 'alice');
  const r = validateUsername('Alice');
  assert.equal(r.valid, true);
  assert.equal(r.normalized, 'alice');
});

test('NFKC-folds fullwidth characters to ASCII', () => {
  // U+FF41 = fullwidth small 'a'
  assert.equal(normalizeUsername('ａlice'), 'alice');
  assert.equal(validateUsername('ａlice').valid, true);
});

test('rejects too short and accepts the length bounds', () => {
  assert.equal(validateUsername('ab').valid, false);          // 2 chars
  assert.equal(validateUsername('abc').valid, true);          // 3 chars (min)
  assert.equal(validateUsername('a'.repeat(30)).valid, true); // 30 chars (max)
  assert.equal(validateUsername('a'.repeat(31)).valid, false);// 31 chars
});

test('rejects disallowed characters (hyphen, punctuation, spaces)', () => {
  assert.equal(validateUsername('alice-bob').valid, false);
  assert.equal(validateUsername('alice!').valid, false);
  assert.equal(validateUsername('al ice').valid, false);
});

test('rejects non-ASCII confusables (Cyrillic look-alike survives NFKC, fails charset)', () => {
  assert.equal(validateUsername('alіce').valid, false); // U+0456 Cyrillic i
});

test('rejects reserved words', () => {
  for (const w of ['air', 'admin', 'support', 'anthropic', 'claude', 'official']) {
    assert.equal(validateUsername(w).valid, false, `${w} should be reserved`);
  }
});

test('rejects handles that mimic an AIR id shape (air + 12 alnum)', () => {
  assert.equal(validateUsername('airabcdefgh1234').valid, false);
});

test('rejects non-string input', () => {
  assert.equal(validateUsername(undefined).valid, false);
  assert.equal(validateUsername(123).valid, false);
});

test('allows underscores and digits', () => {
  assert.equal(validateUsername('alice_99').valid, true);
});

// --- cooldown / tombstone policy (changeable + 30-day cooldown) ---
const NOW = Date.parse('2026-06-25T00:00:00Z');
const isoAt = (ms) => new Date(ms).toISOString();

test('no tombstone → claim not blocked', () => {
  assert.equal(isHandleInCooldown(null, 'AIR-AAAA-AAAA-AAAA', NOW), false);
});

test('unexpired tombstone released by a DIFFERENT agent → blocked', () => {
  const tomb = { released_by_air_id: 'AIR-BBBB-BBBB-BBBB', released_at: isoAt(NOW - 1000) };
  assert.equal(isHandleInCooldown(tomb, 'AIR-AAAA-AAAA-AAAA', NOW), true);
});

test('unexpired tombstone released by the SAME agent → not blocked (re-claim own / typo forgiveness)', () => {
  const tomb = { released_by_air_id: 'AIR-AAAA-AAAA-AAAA', released_at: isoAt(NOW - 1000) };
  assert.equal(isHandleInCooldown(tomb, 'AIR-AAAA-AAAA-AAAA', NOW), false);
});

test('expired tombstone → not blocked even for a different agent', () => {
  const tomb = { released_by_air_id: 'AIR-BBBB-BBBB-BBBB', released_at: isoAt(NOW - USERNAME_COOLDOWN_MS - 1000) };
  assert.equal(isHandleInCooldown(tomb, 'AIR-AAAA-AAAA-AAAA', NOW), false);
});

test('exactly at the cooldown boundary counts as expired', () => {
  const tomb = { released_by_air_id: 'AIR-BBBB-BBBB-BBBB', released_at: isoAt(NOW - USERNAME_COOLDOWN_MS) };
  assert.equal(isHandleInCooldown(tomb, 'AIR-AAAA-AAAA-AAAA', NOW), false);
});

test('malformed released_at does not permanently lock a handle', () => {
  const tomb = { released_by_air_id: 'AIR-BBBB-BBBB-BBBB', released_at: 'not-a-date' };
  assert.equal(isHandleInCooldown(tomb, 'AIR-AAAA-AAAA-AAAA', NOW), false);
});

test('cooldown is 30 days', () => {
  assert.equal(USERNAME_COOLDOWN_MS, 30 * 24 * 60 * 60 * 1000);
});

// --- DB layer: migration 0007 (username column + case-folded unique index + tombstones) ---
async function insertAgentRow(db, airId, { username = null } = {}) {
  await db.prepare(
    `INSERT INTO agents (air_id, name, creator_did, status, created_at, updated_at, username)
     VALUES (?, ?, ?, 'active', ?, ?, ?)`
  ).bind(airId, airId, `did:web:example.com:${airId}`, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', username).run();
}

test('DB: case-folded UNIQUE index rejects a handle differing only in case', async () => {
  const db = makeTestD1();
  await insertAgentRow(db, 'AIR-TEST-0001-AAAA', { username: 'alice' });
  await assert.rejects(
    insertAgentRow(db, 'AIR-TEST-0002-BBBB', { username: 'ALICE' }),
    /unique|constraint/i,
  );
});

test('DB: legacy rows with NULL username do not collide (partial index)', async () => {
  const db = makeTestD1();
  await insertAgentRow(db, 'AIR-TEST-0003-CCCC');
  await insertAgentRow(db, 'AIR-TEST-0004-DDDD');
  const row = await db.prepare("SELECT COUNT(*) AS n FROM agents WHERE username IS NULL").bind().first();
  assert.equal(row.n, 2);
});

test('DB: username_tombstones table exists and round-trips', async () => {
  const db = makeTestD1();
  await db.prepare(
    "INSERT INTO username_tombstones (username_normalized, released_by_air_id, released_at) VALUES (?, ?, ?)"
  ).bind('bob', 'AIR-TEST-0005-EEEE', '2026-06-25T00:00:00.000Z').run();
  const row = await db.prepare(
    "SELECT released_by_air_id FROM username_tombstones WHERE username_normalized = ?"
  ).bind('bob').first();
  assert.equal(row.released_by_air_id, 'AIR-TEST-0005-EEEE');
});

// --- lookupHandle: resolver-side normalization (no reserved/denylist) ---
test('lookupHandle normalizes a valid handle and applies NO reserved denylist', () => {
  // 'admin' is reserved at claim time but must still RESOLVE if already claimed.
  assert.equal(lookupHandle('admin'), 'admin');
  assert.equal(lookupHandle('Alice'), 'alice');
  assert.equal(lookupHandle('ａlice'), 'alice'); // NFKC fullwidth fold
});

test('lookupHandle returns null for charset-invalid input (no throw)', () => {
  assert.equal(lookupHandle('ab'), null);            // too short
  assert.equal(lookupHandle('a'.repeat(31)), null);  // too long
  assert.equal(lookupHandle('alice-bob'), null);     // hyphen
  assert.equal(lookupHandle('alіce'), null);         // Cyrillic confusable
  assert.equal(lookupHandle(undefined), null);       // non-string
  assert.equal(lookupHandle(123), null);
});

test('lookupHandle allows an AIR-id-mimic shape (not a claim-time concern)', () => {
  // air+12 alnum is reserved at claim time, but if somehow held it must resolve.
  assert.equal(lookupHandle('airabcdefgh1234'), 'airabcdefgh1234');
});

// --- isUsernameConflict: classify the partial-index UNIQUE violation ---
test('isUsernameConflict is true for the username UNIQUE index error', () => {
  assert.equal(
    isUsernameConflict("UNIQUE constraint failed: index 'uq_agents_username'"),
    true,
  );
});

test('isUsernameConflict is false for an unrelated audit-chain UNIQUE error', () => {
  assert.equal(
    isUsernameConflict('UNIQUE constraint failed: agent_audit_log.prev_hash'),
    false,
  );
});

// --- DB batch atomicity: a failing 2nd statement rolls back the 1st ---
test('DB: db.batch rolls back the first statement when a later one violates UNIQUE', async () => {
  const db = makeTestD1();
  await insertAgentRow(db, 'AIR-BTCH-0001-AAAA', { username: 'taken' });
  await insertAgentRow(db, 'AIR-BTCH-0002-BBBB'); // no username yet

  const stmtSetDescription = db.prepare(
    "UPDATE agents SET description = ? WHERE air_id = ?"
  ).bind('should-roll-back', 'AIR-BTCH-0002-BBBB');
  // 2nd statement collides with the existing 'taken' handle → UNIQUE violation.
  const stmtClaimTaken = db.prepare(
    "UPDATE agents SET username = ? WHERE air_id = ?"
  ).bind('taken', 'AIR-BTCH-0002-BBBB');

  await assert.rejects(db.batch([stmtSetDescription, stmtClaimTaken]), /unique|constraint/i);

  // The FIRST statement's effect must be absent (whole batch rolled back).
  const row = await db.prepare(
    "SELECT description, username FROM agents WHERE air_id = ?"
  ).bind('AIR-BTCH-0002-BBBB').first();
  assert.equal(row.description, null);
  assert.equal(row.username, null);
});

// --- DB claim/release sequencing (replicates updateAgent's batch at the DB layer,
//     since the index.js handlers aren't importable under node --test) ---

const claimTombSql =
  "INSERT OR REPLACE INTO username_tombstones (username_normalized, released_by_air_id, released_at, username_display) VALUES (?, ?, ?, ?)";

test('DB: claiming a handle then DELETEing its tombstone leaves no tombstone', async () => {
  const db = makeTestD1();
  await insertAgentRow(db, 'AIR-SEQ-0001-AAAA');
  // Simulate a prior release sitting in the tombstone table, then a fresh claim
  // by the SAME agent (updateAgent DELETEs the tombstone for the claimed handle).
  await db.prepare(claimTombSql).bind('carol', 'AIR-SEQ-0001-AAAA', '2026-01-01T00:00:00.000Z', 'carol').run();
  await db.batch([
    db.prepare("UPDATE agents SET username = ? WHERE air_id = ?").bind('carol', 'AIR-SEQ-0001-AAAA'),
    db.prepare("DELETE FROM username_tombstones WHERE username_normalized = ?").bind('carol'),
  ]);
  const tomb = await db.prepare(
    "SELECT COUNT(*) AS n FROM username_tombstones WHERE username_normalized = ?"
  ).bind('carol').first();
  assert.equal(tomb.n, 0);
});

test('DB: changing a handle tombstones the old and leaves the new untombstoned', async () => {
  const db = makeTestD1();
  await insertAgentRow(db, 'AIR-SEQ-0002-BBBB', { username: 'oldname' });
  // updateAgent's change-handle batch: set new username, tombstone old, clear new's tombstone.
  await db.batch([
    db.prepare("UPDATE agents SET username = ? WHERE air_id = ?").bind('newname', 'AIR-SEQ-0002-BBBB'),
    db.prepare(claimTombSql).bind('oldname', 'AIR-SEQ-0002-BBBB', '2026-06-25T00:00:00.000Z', 'oldname'),
    db.prepare("DELETE FROM username_tombstones WHERE username_normalized = ?").bind('newname'),
  ]);
  const oldTomb = await db.prepare(
    "SELECT COUNT(*) AS n FROM username_tombstones WHERE username_normalized = ?"
  ).bind('oldname').first();
  const newTomb = await db.prepare(
    "SELECT COUNT(*) AS n FROM username_tombstones WHERE username_normalized = ?"
  ).bind('newname').first();
  assert.equal(oldTomb.n, 1, 'old handle should be tombstoned');
  assert.equal(newTomb.n, 0, 'new handle should NOT be tombstoned');
});

test('DB: soft-delete-release frees the index so another agent can claim the handle (Fix 1)', async () => {
  const db = makeTestD1();
  await insertAgentRow(db, 'AIR-SEQ-0003-CCCC', { username: 'dave' });
  // The Fix-1 soft-delete pattern: status=deleted AND username=NULL, plus a tombstone.
  await db.batch([
    db.prepare("UPDATE agents SET status = 'deleted', username = NULL WHERE air_id = ?").bind('AIR-SEQ-0003-CCCC'),
    db.prepare(claimTombSql).bind('dave', 'AIR-SEQ-0003-CCCC', '2026-06-25T00:00:00.000Z', 'dave'),
  ]);
  // A DIFFERENT, active agent can now hold 'dave' — the partial UNIQUE index no
  // longer blocks because the deleted row dropped out of it (username IS NULL).
  await insertAgentRow(db, 'AIR-SEQ-0004-DDDD', { username: 'dave' });
  const holder = await db.prepare(
    "SELECT air_id FROM agents WHERE username = ? AND status = 'active'"
  ).bind('dave').first();
  assert.equal(holder.air_id, 'AIR-SEQ-0004-DDDD');
});
