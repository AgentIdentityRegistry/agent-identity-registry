// Username / @handle validation for the AIR registry (Milestone G).
// Pure + importable on purpose: handlers in index.js are CommonJS + wrangler-bundled
// (not unit-testable under node --test), so the validation logic lives here where the
// node:sqlite-backed test suite can cover it.

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

// air + 12 alphanumerics = an AIR-XXXX-XXXX-XXXX id with its hyphens stripped. Hyphens
// are already disallowed by the charset, so the literal id shape can't be claimed; this
// blocks the de-hyphenated form that could still be passed off as a machine id.
// Exact `air`+12 is intentional: it's the only de-hyphenated AIR-id-shaped confusable;
// broader prefixes (e.g. all `air*`) would over-block legitimate handles.
const AIRID_MIMIC_RE = /^air[a-z0-9]{12}$/;

// Brand / role / system names that must not be claimable as personal handles.
const RESERVED_USERNAMES = new Set([
  'air', 'airid', 'admin', 'administrator', 'root', 'superuser', 'sysadmin',
  'support', 'help', 'helpdesk', 'official', 'system', 'moderator', 'mod', 'staff',
  'anthropic', 'claude', 'registry', 'agent', 'agents', 'api', 'www', 'mail',
  'about', 'security', 'abuse', 'legal', 'privacy', 'terms', 'foundation',
  'null', 'undefined', 'none', 'anonymous', 'me', 'you', 'everyone',
]);

// Canonical form used for storage AND uniqueness: NFKC (fold compatibility/fullwidth
// look-alikes) + lowercase (case-fold so Alice and alice are one handle). Any remaining
// non-ASCII confusable then fails the strict ASCII charset in validateUsername.
export function normalizeUsername(raw) {
  return String(raw).normalize('NFKC').trim().toLowerCase();
}

export function validateUsername(raw) {
  if (typeof raw !== 'string') {
    return { valid: false, error: 'username must be a string' };
  }
  const normalized = normalizeUsername(raw);
  if (!USERNAME_RE.test(normalized)) {
    return { valid: false, error: 'username must be 3-30 characters of a-z, 0-9, or underscore' };
  }
  if (RESERVED_USERNAMES.has(normalized) || AIRID_MIMIC_RE.test(normalized)) {
    return { valid: false, error: 'username is reserved' };
  }
  return { valid: true, normalized, display: normalized };
}

// Resolver-side normalization for LOOKING UP an existing handle. Reservation is a
// CLAIM-time policy, not a resolution one: a handle claimed before a word was
// reserved (or one that mimics an id shape) must still resolve. So this applies
// ONLY the charset/length check — no reserved/denylist. Returns the normalized
// string, or null if it can't be a valid handle at all.
export function lookupHandle(raw) {
  if (typeof raw !== 'string') return null;
  const normalized = normalizeUsername(raw);
  return USERNAME_RE.test(normalized) ? normalized : null;
}

// A released handle is tombstoned for this long before anyone else can claim it.
export const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Decide whether claiming a handle is blocked by an outstanding tombstone.
// Blocked ONLY when an unexpired tombstone was released by a DIFFERENT agent — the
// original releaser may re-claim within the window (forgives a typo'd rename), and an
// expired (or corrupt-timestamp) tombstone never blocks (a handle can't be locked forever).
export function isHandleInCooldown(tombstone, claimantAirId, nowMs, cooldownMs = USERNAME_COOLDOWN_MS) {
  if (!tombstone) return false;
  const releasedAtMs = Date.parse(tombstone.released_at);
  if (Number.isNaN(releasedAtMs)) return false;
  if (nowMs - releasedAtMs >= cooldownMs) return false;
  return tombstone.released_by_air_id !== claimantAirId;
}

// Detects a D1 UNIQUE violation on the partial username index — two agents racing
// to claim the same @handle. The cooldown read-gate is best-effort UX; this index
// is the race-proof backstop that guarantees first-come-first-served. Surfaced as
// a 409 "already taken" rather than a 500. Lives here (not index.js) so the test
// suite can cover the classification directly.
export function isUsernameConflict(err) {
  const msg = String((err && (err.message || err.cause?.message)) || err || "");
  return /UNIQUE constraint failed/i.test(msg) && /username|uq_agents_username/i.test(msg);
}
