#!/usr/bin/env python3
"""
Generate 20 canonical A2A conformance test vectors.

This script is the authoritative source of truth for the vectors file.
Run it to regenerate test-vectors.json whenever input envelopes or signing
rules change. The output is committed and consumed by the Rust and Python
conformance harnesses.

Usage:
    python3 generate_vectors.py
    # or to write to a specific path:
    python3 generate_vectors.py --out /path/to/test-vectors.json

Dependencies:
    pip install jcs>=0.2.0 cryptography>=42 base58>=2.1
"""

import argparse
import hashlib
import json
import os
import sys
import unicodedata

import jcs  # RFC 8785 canonical JSON
import base58
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


# ---------------------------------------------------------------------------
# Multibase / multicodec helpers
# ---------------------------------------------------------------------------

# Ed25519 public key multicodec prefix: 0xed01 as unsigned varint
_ED25519_MULTICODEC = bytes([0xed, 0x01])


def seed_to_keys(seed_hex: str):
    """Derive Ed25519 keypair from 32-byte hex seed."""
    seed_bytes = bytes.fromhex(seed_hex)
    private_key = Ed25519PrivateKey.from_private_bytes(seed_bytes)
    public_key = private_key.public_key()
    return private_key, public_key


def public_key_multibase(public_key) -> str:
    """Encode Ed25519 public key as multicodec 0xed01 + base58btc + 'z' prefix."""
    raw_bytes = public_key.public_bytes(Encoding.Raw, PublicFormat.Raw)
    prefixed = _ED25519_MULTICODEC + raw_bytes
    return "z" + base58.b58encode(prefixed).decode("ascii")


def signature_multibase(sig_bytes: bytes) -> str:
    """Encode 64-byte Ed25519 signature as multibase z + base58btc."""
    # Signatures do NOT get the multicodec prefix — just raw 64 bytes, base58btc + z
    return "z" + base58.b58encode(sig_bytes).decode("ascii")


# ---------------------------------------------------------------------------
# Canonicalization
# ---------------------------------------------------------------------------

def nfc_normalize_strings(obj):
    """
    Recursively NFC-normalize all string values in a JSON-compatible object.
    Must be applied BEFORE JCS canonicalization per spec §5.
    """
    if isinstance(obj, str):
        return unicodedata.normalize("NFC", obj)
    if isinstance(obj, dict):
        return {k: nfc_normalize_strings(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [nfc_normalize_strings(item) for item in obj]
    return obj


def _jcs_exact(obj) -> str:
    """
    RFC 8785 JCS with exact integer preservation.

    Per spec §5 'no floats': integers MUST NOT be coerced to IEEE 754 double.
    The `jcs` Python library coerces integers > 2^53 to float64 (known
    limitation). This implementation preserves exact integer values, matching
    the behaviour of serde_jcs 0.1.0 in Rust.

    String values must already be NFC-normalized before calling this function.
    """
    if isinstance(obj, dict):
        keys = sorted(obj.keys())
        parts = [json.dumps(k) + ":" + _jcs_exact(obj[k]) for k in keys]
        return "{" + ",".join(parts) + "}"
    if isinstance(obj, list):
        return "[" + ",".join(_jcs_exact(i) for i in obj) + "]"
    if isinstance(obj, bool):
        return "true" if obj else "false"
    if obj is None:
        return "null"
    if isinstance(obj, int):
        return str(obj)  # exact integer — never coerce to float
    if isinstance(obj, float):
        raise ValueError(f"Float not allowed in A2A envelopes per spec §5: {obj!r}")
    # strings and other JSON-serializable scalars
    return json.dumps(obj, ensure_ascii=False)


def canonicalize(envelope_dict: dict) -> bytes:
    """
    Produce canonical JSON bytes of the envelope for signing/verification.

    Steps per spec §5:
    1. Set signature field to absent (remove it if present).
    2. NFC-normalize all string values.
    3. Apply RFC 8785 JCS with exact integer preservation (see _jcs_exact).

    Note: the `jcs` Python package is NOT used here because it coerces
    integers > 2^53 to float64, violating the spec's no-floats rule.
    _jcs_exact produces byte-identical output to serde_jcs 0.1.0 (Rust).
    """
    obj = {k: v for k, v in envelope_dict.items() if k != "signature"}
    obj = nfc_normalize_strings(obj)
    return _jcs_exact(obj).encode("utf-8")


# ---------------------------------------------------------------------------
# Vector computation
# ---------------------------------------------------------------------------

def compute_vector(vector_id: str, description: str, envelope: dict, seed_hex: str) -> dict:
    """
    Given an input envelope (without signature) and a hex seed, compute:
    - canonical bytes SHA-256
    - public key multibase
    - signature multibase
    Returns a complete vector dict.
    """
    canon_bytes = canonicalize(envelope)
    sha256_hex = hashlib.sha256(canon_bytes).hexdigest()

    private_key, public_key = seed_to_keys(seed_hex)
    sig_bytes = private_key.sign(canon_bytes)
    assert len(sig_bytes) == 64, f"Expected 64-byte signature, got {len(sig_bytes)}"

    pub_mb = public_key_multibase(public_key)
    sig_mb = signature_multibase(sig_bytes)

    return {
        "id": vector_id,
        "description": description,
        "input_envelope": envelope,
        "expected_canonical_bytes_sha256_hex": sha256_hex,
        "signing_key_seed_hex": seed_hex,
        "signing_key_public_multibase": pub_mb,
        "expected_signature_multibase": sig_mb,
    }


# ---------------------------------------------------------------------------
# Input envelopes (20 distinct vectors)
# ---------------------------------------------------------------------------

# Seeds: deterministic 32-byte values used as Ed25519 key seeds.
# Different seeds produce different keypairs and therefore different signatures.
SEED_A = "a" * 64   # 32 bytes of 0xaa
SEED_B = "b" * 64   # 32 bytes of 0xbb
SEED_C = "c" * 64   # 32 bytes of 0xcc

# Base DID stubs (AIR format, non-resolving in tests)
DID_ALICE = "did:wba:agentidentityregistry.org:AIR-WBA1-ALICE0"
DID_BOB   = "did:wba:agentidentityregistry.org:AIR-WBA1-BOB000"

INPUTS = [
    # ------------------------------------------------------------------
    # 1–5  ASCII happy-path (Offer, Counter, Accept, Decline, Withdraw)
    # ------------------------------------------------------------------
    (
        "v01-ascii-offer",
        "Minimal ASCII Offer envelope, single integer cash amount (USD)",
        {
            "id": "00000000-0000-0000-0000-000000000001",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:01Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000001",
            "nonce": "nonce-0000000000000001",
            "body": {
                "type": "offer",
                "item_id": "item-ascii-001",
                "offered_value": {"type": "cash", "amount_cents": 1000, "currency": "USD"},
            },
        },
        SEED_A,
    ),
    (
        "v02-ascii-counter",
        "ASCII Counter envelope replying to an offer",
        {
            "id": "00000000-0000-0000-0000-000000000002",
            "from": DID_BOB,
            "to": DID_ALICE,
            "timestamp": "2026-05-28T00:00:02Z",
            "in_reply_to": "00000000-0000-0000-0000-000000000001",
            "thread_id": "thread-0000000000000001",
            "nonce": "nonce-0000000000000002",
            "body": {
                "type": "counter",
                "item_id": "item-ascii-001",
                "counter_value": {"type": "cash", "amount_cents": 900, "currency": "USD"},
            },
        },
        SEED_B,
    ),
    (
        "v03-ascii-accept",
        "ASCII Accept envelope",
        {
            "id": "00000000-0000-0000-0000-000000000003",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:03Z",
            "in_reply_to": "00000000-0000-0000-0000-000000000002",
            "thread_id": "thread-0000000000000001",
            "nonce": "nonce-0000000000000003",
            "body": {
                "type": "accept",
                "item_id": "item-ascii-001",
            },
        },
        SEED_A,
    ),
    (
        "v04-ascii-decline",
        "ASCII Decline envelope",
        {
            "id": "00000000-0000-0000-0000-000000000004",
            "from": DID_BOB,
            "to": DID_ALICE,
            "timestamp": "2026-05-28T00:00:04Z",
            "in_reply_to": "00000000-0000-0000-0000-000000000001",
            "thread_id": "thread-0000000000000002",
            "nonce": "nonce-0000000000000004",
            "body": {
                "type": "decline",
                "item_id": "item-ascii-002",
                "reason": "price too high",
            },
        },
        SEED_B,
    ),
    (
        "v05-ascii-withdraw",
        "ASCII Withdraw envelope",
        {
            "id": "00000000-0000-0000-0000-000000000005",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:05Z",
            "in_reply_to": "00000000-0000-0000-0000-000000000001",
            "thread_id": "thread-0000000000000002",
            "nonce": "nonce-0000000000000005",
            "body": {
                "type": "withdraw",
                "item_id": "item-ascii-002",
                "reason": "no longer available",
            },
        },
        SEED_A,
    ),

    # ------------------------------------------------------------------
    # 6–8  Non-ASCII note fields (Korean, Japanese, Arabic)
    # ------------------------------------------------------------------
    (
        "v06-nonascii-korean",
        "Offer with Korean note field: 협상 시작 (negotiation start)",
        {
            "id": "00000000-0000-0000-0000-000000000006",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:06Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000003",
            "nonce": "nonce-0000000000000006",
            "body": {
                "type": "offer",
                "item_id": "item-kr-001",
                "offered_value": {"type": "cash", "amount_cents": 50000, "currency": "KRW"},
                "note": "협상 시작",  # 협상 시작
            },
        },
        SEED_A,
    ),
    (
        "v07-nonascii-japanese",
        "Offer with Japanese note field: 交渉開始 (negotiation start)",
        {
            "id": "00000000-0000-0000-0000-000000000007",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:07Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000004",
            "nonce": "nonce-0000000000000007",
            "body": {
                "type": "offer",
                "item_id": "item-jp-001",
                "offered_value": {"type": "cash", "amount_cents": 100000, "currency": "JPY"},
                "note": "交渉開始",  # 交渉開始
            },
        },
        SEED_B,
    ),
    (
        "v08-nonascii-arabic",
        "Offer with Arabic note field: بدء التفاوض (start of negotiation)",
        {
            "id": "00000000-0000-0000-0000-000000000008",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:08Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000005",
            "nonce": "nonce-0000000000000008",
            "body": {
                "type": "offer",
                "item_id": "item-ar-001",
                "offered_value": {"type": "cash", "amount_cents": 25000, "currency": "USD"},
                "note": "بدء التفاوض",  # بدء التفاوض
            },
        },
        SEED_C,
    ),

    # ------------------------------------------------------------------
    # 9–10  NFC normalization edge cases
    # NFD form input: 'café' (e + combining acute) → must normalize
    # to precomposed NFC 'café' before canonicalization.
    # Both vectors share the same envelope content; they are identical after
    # NFC normalization and must produce the same canonical bytes / SHA-256.
    # ------------------------------------------------------------------
    (
        "v09-nfc-precomposed",
        "Note field with precomposed NFC 'café' (U+00E9) — canonical form",
        {
            "id": "00000000-0000-0000-0000-000000000009",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:09Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000006",
            "nonce": "nonce-0000000000000009",
            "body": {
                "type": "offer",
                "item_id": "item-nfc-001",
                "offered_value": {"type": "cash", "amount_cents": 200, "currency": "USD"},
                # precomposed é (U+00E9)
                "note": "café",
            },
        },
        SEED_A,
    ),
    (
        "v10-nfc-decomposed",
        "Note field with NFD 'café' (e + U+0301 combining acute) — MUST normalize to same bytes as v09",
        {
            "id": "00000000-0000-0000-0000-000000000009",  # same id as v09 intentionally
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:09Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000006",
            "nonce": "nonce-0000000000000009",
            "body": {
                "type": "offer",
                "item_id": "item-nfc-001",
                "offered_value": {"type": "cash", "amount_cents": 200, "currency": "USD"},
                # NFD: plain e + combining acute accent (U+0301) — same logical text as v09
                "note": "café",
            },
        },
        SEED_A,
    ),

    # ------------------------------------------------------------------
    # 11–12  Integer boundary (amount_cents at and above 2^53)
    # Proves that neither JCS library coerces large integers to floats.
    # ------------------------------------------------------------------
    (
        "v11-int-boundary-2pow53-minus1",
        "amount_cents = 2^53 - 1 (9007199254740991) — max safe JavaScript integer, no float coercion",
        {
            "id": "00000000-0000-0000-0000-000000000011",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:11Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000007",
            "nonce": "nonce-0000000000000011",
            "body": {
                "type": "offer",
                "item_id": "item-big-001",
                "offered_value": {
                    "type": "cash",
                    "amount_cents": (2**53) - 1,  # 9007199254740991
                    "currency": "USD",
                },
            },
        },
        SEED_B,
    ),
    (
        "v12-int-boundary-2pow53-plus1",
        "amount_cents = 2^53 + 1 (9007199254740993) — above safe JS integer, MUST stay exact integer",
        {
            "id": "00000000-0000-0000-0000-000000000012",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:12Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000008",
            "nonce": "nonce-0000000000000012",
            "body": {
                "type": "offer",
                "item_id": "item-big-002",
                "offered_value": {
                    "type": "cash",
                    "amount_cents": (2**53) + 1,  # 9007199254740993
                    "currency": "USD",
                },
            },
        },
        SEED_B,
    ),

    # ------------------------------------------------------------------
    # 13–14  Empty Option fields — note/reason absent (must be omitted, not null)
    # ------------------------------------------------------------------
    (
        "v13-empty-options-offer",
        "Offer with note absent — canonical JSON must NOT include 'note' key",
        {
            "id": "00000000-0000-0000-0000-000000000013",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:13Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000009",
            "nonce": "nonce-0000000000000013",
            "body": {
                "type": "offer",
                "item_id": "item-no-note-001",
                "offered_value": {"type": "cash", "amount_cents": 500, "currency": "CAD"},
                # note intentionally absent (not included in dict — matches Rust Option::None → skip)
            },
        },
        SEED_C,
    ),
    (
        "v14-empty-options-decline",
        "Decline with reason absent — canonical JSON must NOT include 'reason' key",
        {
            "id": "00000000-0000-0000-0000-000000000014",
            "from": DID_BOB,
            "to": DID_ALICE,
            "timestamp": "2026-05-28T00:00:14Z",
            "in_reply_to": "00000000-0000-0000-0000-000000000013",
            "thread_id": "thread-0000000000000009",
            "nonce": "nonce-0000000000000014",
            "body": {
                "type": "decline",
                "item_id": "item-no-note-001",
                # reason intentionally absent
            },
        },
        SEED_C,
    ),

    # ------------------------------------------------------------------
    # 15–16  Multi-thread (in_reply_to present vs absent)
    # ------------------------------------------------------------------
    (
        "v15-thread-with-reply",
        "Offer with in_reply_to populated — thread continuation",
        {
            "id": "00000000-0000-0000-0000-000000000015",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:15Z",
            "in_reply_to": "00000000-0000-0000-0000-000000000099",
            "thread_id": "thread-0000000000000010",
            "nonce": "nonce-0000000000000015",
            "body": {
                "type": "counter",
                "item_id": "item-thread-001",
                "counter_value": {"type": "cash", "amount_cents": 750, "currency": "USD"},
            },
        },
        SEED_A,
    ),
    (
        "v16-thread-no-reply",
        "Offer with in_reply_to absent — thread initiation",
        {
            "id": "00000000-0000-0000-0000-000000000016",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:16Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000010",
            "nonce": "nonce-0000000000000016",
            "body": {
                "type": "offer",
                "item_id": "item-thread-001",
                "offered_value": {"type": "cash", "amount_cents": 800, "currency": "USD"},
            },
        },
        SEED_A,
    ),

    # ------------------------------------------------------------------
    # 17–18  Currency variants (USD, KRW)
    # ------------------------------------------------------------------
    (
        "v17-currency-usd",
        "Offer denominated in USD",
        {
            "id": "00000000-0000-0000-0000-000000000017",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:17Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000011",
            "nonce": "nonce-0000000000000017",
            "body": {
                "type": "offer",
                "item_id": "item-currency-001",
                "offered_value": {"type": "cash", "amount_cents": 12345, "currency": "USD"},
            },
        },
        SEED_B,
    ),
    (
        "v18-currency-krw",
        "Offer denominated in KRW (Korean Won, no decimal subdivision)",
        {
            "id": "00000000-0000-0000-0000-000000000018",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:18Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000012",
            "nonce": "nonce-0000000000000018",
            "body": {
                "type": "offer",
                "item_id": "item-currency-002",
                "offered_value": {"type": "cash", "amount_cents": 10000000, "currency": "KRW"},
            },
        },
        SEED_C,
    ),

    # ------------------------------------------------------------------
    # 19–20  Same input, two different keys → two different signatures
    # Proves deterministic signing per RFC 8032 and key independence.
    # ------------------------------------------------------------------
    (
        "v19-same-input-key-seed-a",
        "Same envelope as v20, signed with seed A — proves key independence",
        {
            "id": "00000000-0000-0000-0000-000000000019",
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:19Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000013",
            "nonce": "nonce-0000000000000019",
            "body": {
                "type": "offer",
                "item_id": "item-keydemo-001",
                "offered_value": {"type": "cash", "amount_cents": 100, "currency": "USD"},
            },
        },
        SEED_A,
    ),
    (
        "v20-same-input-key-seed-b",
        "Same envelope as v19, signed with seed B — different signature, same canonical bytes",
        {
            "id": "00000000-0000-0000-0000-000000000019",  # same envelope id as v19
            "from": DID_ALICE,
            "to": DID_BOB,
            "timestamp": "2026-05-28T00:00:19Z",
            "in_reply_to": None,
            "thread_id": "thread-0000000000000013",
            "nonce": "nonce-0000000000000019",
            "body": {
                "type": "offer",
                "item_id": "item-keydemo-001",
                "offered_value": {"type": "cash", "amount_cents": 100, "currency": "USD"},
            },
        },
        SEED_B,
    ),
]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate A2A conformance test vectors")
    parser.add_argument(
        "--out",
        default=os.path.join(os.path.dirname(__file__), "test-vectors.json"),
        help="Output path for test-vectors.json",
    )
    args = parser.parse_args()

    assert len(INPUTS) == 20, f"Expected 20 vectors, got {len(INPUTS)}"

    vectors = []
    for vector_id, description, envelope, seed_hex in INPUTS:
        v = compute_vector(vector_id, description, envelope, seed_hex)
        vectors.append(v)
        print(f"  {v['id']:40s}  sha256={v['expected_canonical_bytes_sha256_hex'][:16]}…")

    # Validate NFC invariant: v09 and v10 must have identical canonical bytes
    v09 = next(v for v in vectors if v["id"] == "v09-nfc-precomposed")
    v10 = next(v for v in vectors if v["id"] == "v10-nfc-decomposed")
    assert v09["expected_canonical_bytes_sha256_hex"] == v10["expected_canonical_bytes_sha256_hex"], (
        "NFC normalization invariant FAILED: v09 and v10 canonical bytes differ!"
    )
    print("\n  NFC invariant OK: v09 and v10 produce identical canonical bytes\n")

    # Validate key independence: v19 and v20 must have different signatures
    v19 = next(v for v in vectors if v["id"] == "v19-same-input-key-seed-a")
    v20 = next(v for v in vectors if v["id"] == "v20-same-input-key-seed-b")
    assert v19["expected_canonical_bytes_sha256_hex"] == v20["expected_canonical_bytes_sha256_hex"], (
        "Key independence invariant FAILED: v19 and v20 canonical bytes should match!"
    )
    assert v19["expected_signature_multibase"] != v20["expected_signature_multibase"], (
        "Key independence invariant FAILED: v19 and v20 signatures should differ!"
    )
    print("  Key independence OK: v19 and v20 same canonical bytes, different signatures\n")

    output = {
        "version": "draft-1",
        "jcs_spec": "RFC 8785",
        "signature_spec": "RFC 8032 EdDSA (Ed25519)",
        "encoding": "multicodec 0xed01 + base58btc + 'z' prefix (public keys); raw 64 bytes + base58btc + 'z' prefix (signatures)",
        "nfc_normalization": "All string values MUST be NFC-normalized before JCS canonicalization",
        "no_floats": "All numeric values in envelopes are integers; implementations MUST NOT use floats",
        "vectors": vectors,
    }

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Wrote {len(vectors)} vectors to {args.out}")


if __name__ == "__main__":
    main()
