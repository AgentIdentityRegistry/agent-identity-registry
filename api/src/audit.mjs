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
