// AIR Registry — agent-record audit chain (registry #5). Isolated + testable.
import { sha256Hex, jcsCanonicalize } from "./crypto-utils.mjs";

export const GENESIS = "GENESIS"; // sentinel prev_hash for the first entry (non-NULL so UNIQUE covers it)

// Deterministic, third-party-reproducible serialization of the changed-field set.
// Sort ascending FIRST (jcsCanonicalize sorts object keys but NOT array elements),
// then JCS-serialize. Empty / null → "".
export function canonicalizeChangedFields(fields) {
  if (!Array.isArray(fields) || fields.length === 0) return "";
  return jcsCanonicalize([...fields].sort());
}

// entry_hash = sha256Hex(canonicalContent + "\n" + prevHash). `id` deliberately excluded.
export async function auditEntryHash(content, prevHash) {
  const canonical = [
    content.air_id,
    content.event,
    canonicalizeChangedFields(content.changedFields),
    content.actor,
    content.created_at,
  ].join("\n");
  return sha256Hex(canonical + "\n" + prevHash);
}

export async function computeChainTip(db) {
  const row = await db.prepare("SELECT entry_hash FROM agent_audit_log ORDER BY id DESC LIMIT 1").first();
  const cnt = await db.prepare("SELECT COUNT(*) AS n FROM agent_audit_log").first();
  return { tip_hash: row?.entry_hash ?? GENESIS, count: cnt?.n ?? 0 };
}

// Reads the current tip, computes this entry's hash, RETURNS the bound INSERT
// statement (so the caller can run it inside the same db.batch() as the mutation).
export async function recordAuditEvent(db, { airId, event, changedFields, actor, now }) {
  const { tip_hash: prevHash } = await computeChainTip(db);
  const content = { air_id: airId, event, changedFields, actor, created_at: now };
  const entryHash = await auditEntryHash(content, prevHash);
  // Store the SAME canonical bytes the hash used (single source via
  // canonicalizeChangedFields) so verifyAuditChain re-derives identically.
  // Empty/none → NULL (column is nullable; register/delete pass null).
  const canonicalFields = canonicalizeChangedFields(changedFields);
  return db.prepare(
    `INSERT INTO agent_audit_log (air_id, event, changed_fields, actor, created_at, prev_hash, entry_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(airId, event, canonicalFields === "" ? null : canonicalFields, actor, now, prevHash, entryHash);
}

// ---- External anchor (Phase B) -------------------------------------------
// Build the anchor record committed weekly to the public audit-anchors repo so
// the chain's integrity is verifiable WITHOUT trusting AIR's own DB.
export async function buildAnchor(db, now) {
  const { tip_hash, count } = await computeChainTip(db);
  return { anchored_at: now, tip_hash, entry_count: count };
}

// Publish an anchor via an INJECTED putFile({ path, content, message }) sink
// (the real GitHub adapter is wired at the call site — this module stays
// network-free + unit-testable). Path is dated so anchors never overwrite.
export async function publishAnchor(anchor, { putFile } = {}) {
  if (typeof putFile !== "function") throw new Error("publishAnchor requires a putFile(args) function");
  const date = anchor.anchored_at.slice(0, 10); // YYYY-MM-DD
  return putFile({
    path: `anchors/${date}.json`,
    content: JSON.stringify(anchor),
    message: `anchor ${date}: tip ${anchor.tip_hash.slice(0, 12)} (${anchor.entry_count} entries)`,
  });
}

// Bounded walk: recompute each hash + check linkage. Returns the integrity verdict.
export async function verifyAuditChain(db, { fromId = 0, toId = null } = {}) {
  const rows = (await db.prepare(
    "SELECT * FROM agent_audit_log WHERE id > ? AND (? IS NULL OR id <= ?) ORDER BY id ASC"
  ).bind(fromId, toId, toId).all()).results ?? [];
  let prev = fromId === 0 ? GENESIS : (await db.prepare("SELECT entry_hash FROM agent_audit_log WHERE id = ?").bind(fromId).first())?.entry_hash;
  for (const r of rows) {
    const changedFields = r.changed_fields ? JSON.parse(r.changed_fields) : null;
    const expect = await auditEntryHash(
      { air_id: r.air_id, event: r.event, changedFields, actor: r.actor, created_at: r.created_at }, prev);
    if (r.prev_hash !== prev || r.entry_hash !== expect) {
      return { valid: false, first_broken_id: r.id, entries_checked: rows.indexOf(r), count: rows.length };
    }
    prev = r.entry_hash;
  }
  const tip = await computeChainTip(db);
  return { valid: true, first_broken_id: null, entries_checked: rows.length, count: tip.count, tip_hash: tip.tip_hash };
}
