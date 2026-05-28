// AIR A2A relay — SCAFFOLD ONLY
//
// This file exists to make the worker deployable so the infrastructure slot
// (DNS, custom domain, D1, KV) is live + verifiable before BossClaw writes
// the real implementation.
//
// BossClaw owns the real implementation per:
//   ~/SuperClaw/.omc/plans/bossclaw-v1-phase-3-a2a-cross-internet.md  (Stage 3b)
//
// When BossClaw ships, replace this file with the real router. Endpoints
// to implement:
//   POST /inbox/{recipient_did}        accept + queue a signed envelope
//   GET  /pull/{recipient_did}?since=  recipient polls for queued messages
//   POST /ack/{recipient_did}          recipient acks one or more message ids
//   GET  /health                       liveness (already implemented below)
//
// Per A2A spec Principle 3, the relay is a pure byte pipe. It MUST NOT
// verify envelope signatures — clients do that on receipt. The relay's job
// is queue + deliver + replay-protect via REPLAY_NONCE KV.

const SCAFFOLD_VERSION = "0.0.0-scaffold";

const json = (body, init = {}) => new Response(JSON.stringify(body, null, 2), {
  ...init,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    ...(init.headers ?? {}),
  },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health probe — implemented here so BossClaw can verify the slot is live
    // before swapping in the real implementation.
    if (url.pathname === "/health" || url.pathname === "/") {
      return json({
        status: "ok",
        service: "air-relay",
        version: SCAFFOLD_VERSION,
        bindings: {
          d1_relay_db: env.RELAY_DB ? "bound" : "missing",
          kv_replay_nonce: env.REPLAY_NONCE ? "bound" : "missing",
        },
        next: "BossClaw is implementing POST /inbox/{did}, GET /pull/{did}, POST /ack/{did}. See ~/SuperClaw/.omc/plans/bossclaw-v1-phase-3-a2a-cross-internet.md",
      });
    }

    // Everything else returns 501 with a clear hint until BossClaw lands the
    // real router.
    return json({
      error: "Not implemented",
      service: "air-relay",
      version: SCAFFOLD_VERSION,
      requested_path: url.pathname,
      hint: "This relay is scaffolded but not yet implemented. BossClaw owns the implementation. See ~/SuperClaw/.omc/plans/bossclaw-v1-phase-3-a2a-cross-internet.md (Stage 3b).",
    }, { status: 501 });
  },
};
