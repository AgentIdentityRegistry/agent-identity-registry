#!/usr/bin/env bash
# air-trust-gate — fetch an agent's AIR record and pass/fail the workflow against
# the requested trust thresholds. Run by action.yml as a composite step.
#
# Inputs arrive as environment variables (set in action.yml `env:`):
#   AIR_ID            (required)
#   MIN_TRUST_SCORE   ("" = skip)   MIN_GRADE ("" = skip)
#   REQUIRE_VERIFIED  (true/false)  API_BASE_URL   FAIL_LEVEL (error|warn)
#
# Runs fine locally for testing: GITHUB_OUTPUT / GITHUB_STEP_SUMMARY default to
# /dev/null when unset, so `AIR_ID=... ./gate.sh` just prints to stdout.

set -euo pipefail

AIR_ID="${AIR_ID:?air-id is required}"
MIN_TRUST_SCORE="${MIN_TRUST_SCORE:-}"
MIN_GRADE="${MIN_GRADE:-}"
REQUIRE_VERIFIED="${REQUIRE_VERIFIED:-false}"
API_BASE_URL="${API_BASE_URL:-https://agentidentityregistry.org}"
FAIL_LEVEL="${FAIL_LEVEL:-error}"
GITHUB_OUTPUT="${GITHUB_OUTPUT:-/dev/null}"
GITHUB_STEP_SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/null}"

# Trust grades, highest to lowest. Used to compare a grade against `min-grade`.
grade_rank() {
  case "$1" in
    AAA) echo 7 ;; AA) echo 6 ;; A) echo 5 ;; BBB) echo 4 ;;
    BB) echo 3 ;; B) echo 2 ;; C) echo 1 ;; *) echo 0 ;;
  esac
}

emit() { echo "$1=$2" >>"$GITHUB_OUTPUT"; }

fail_out() {
  # Set passed=false, record the reason, annotate, and exit per FAIL_LEVEL.
  emit "passed" "false"
  local msg="$1"
  if [ "$FAIL_LEVEL" = "warn" ]; then
    echo "::warning title=AIR Trust Gate::${msg}"
    echo "⚠️ **AIR Trust Gate (warn):** ${msg}" >>"$GITHUB_STEP_SUMMARY"
    exit 0
  fi
  echo "::error title=AIR Trust Gate::${msg}"
  echo "❌ **AIR Trust Gate failed:** ${msg}" >>"$GITHUB_STEP_SUMMARY"
  exit 1
}

# ---- 1. Fetch the agent record -------------------------------------------
resp="$(mktemp)"
http_code="$(
  curl -sS -o "$resp" -w '%{http_code}' \
    --max-time 20 --retry 3 --retry-connrefused \
    -H 'Accept: application/json' \
    "${API_BASE_URL%/}/api/v1/agents/${AIR_ID}" || echo "000"
)"

if [ "$http_code" = "404" ]; then
  emit "trust-score" ""; emit "trust-grade" ""; emit "verified" "false"
  fail_out "agent ${AIR_ID} not found in the registry (404)."
fi
if [ "$http_code" != "200" ]; then
  emit "trust-score" ""; emit "trust-grade" ""; emit "verified" "false"
  fail_out "could not reach the AIR API for ${AIR_ID} (HTTP ${http_code})."
fi

# ---- 2. Parse the fields we gate on --------------------------------------
score="$(jq -r '.trust_score // empty' "$resp")"
grade="$(jq -r '.trust_grade // empty' "$resp")"
verified="$(jq -r '.verification_status.verified // .verified // false' "$resp")"

emit "trust-score" "$score"
emit "trust-grade" "$grade"
emit "verified" "$verified"

# ---- 3. The gate policy --------------------------------------------------
# This block is the heart of the action: a condition is checked only when its
# input is set, and ALL set conditions must pass. Tune the rules here.
failures=()

if [ -n "$MIN_TRUST_SCORE" ]; then
  if [ -z "$score" ] || [ "$score" -lt "$MIN_TRUST_SCORE" ]; then
    failures+=("trust score ${score:-none} < required ${MIN_TRUST_SCORE}")
  fi
fi

if [ -n "$MIN_GRADE" ]; then
  if [ "$(grade_rank "$grade")" -lt "$(grade_rank "$MIN_GRADE")" ]; then
    failures+=("grade ${grade:-none} is below required ${MIN_GRADE}")
  fi
fi

if [ "$REQUIRE_VERIFIED" = "true" ] && [ "$verified" != "true" ]; then
  failures+=("agent is not AIR Verified")
fi

# ---- 4. Report -----------------------------------------------------------
{
  echo "### 🛡️ AIR Trust Gate"
  echo ""
  echo "| Field | Value |"
  echo "|-------|-------|"
  echo "| Agent | \`${AIR_ID}\` |"
  echo "| Trust score | ${score:-unknown} |"
  echo "| Trust grade | ${grade:-unknown} |"
  echo "| Verified | ${verified} |"
} >>"$GITHUB_STEP_SUMMARY"

if [ "${#failures[@]}" -gt 0 ]; then
  reason="$(IFS='; '; echo "${failures[*]}")"
  fail_out "$reason"
fi

emit "passed" "true"
echo "✅ AIR Trust Gate passed for ${AIR_ID} (score ${score:-?}, grade ${grade:-?}, verified ${verified})."
echo "" >>"$GITHUB_STEP_SUMMARY"
echo "✅ **Passed** all requested conditions." >>"$GITHUB_STEP_SUMMARY"
