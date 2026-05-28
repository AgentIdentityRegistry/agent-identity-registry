#!/usr/bin/env bash
# validate.sh — A2A draft-1 envelope schema validation
#
# Usage: run from the repo root (~/air-site):
#   bash specs/a2a/draft-1/validate.sh
#
# Requires: Node.js with ajv@8 installed (npm install in repo root).
# Exit code: 0 = all checks pass, 1 = any check fails.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SCHEMA="specs/a2a/draft-1/envelope.schema.json"
EXAMPLES_GLOB="specs/a2a/draft-1/examples/*.json"

cd "$REPO_ROOT"

echo "=== Check 1: Schema compiles (JSON Schema 2020-12) ==="
node - <<'JS'
const {Ajv2020} = require('ajv/dist/2020');
const schema = require('./specs/a2a/draft-1/envelope.schema.json');
const ajv = new Ajv2020({strict: true, allErrors: true});
ajv.compile(schema);
console.log('OK: schema compiled cleanly');
JS

echo ""
echo "=== Check 2: All 50 example envelopes validate ==="
node - <<'JS'
const {Ajv2020} = require('ajv/dist/2020');
const fs = require('fs');
const path = require('path');

const schema = require('./specs/a2a/draft-1/envelope.schema.json');
const ajv = new Ajv2020({strict: true, allErrors: true});
const validate = ajv.compile(schema);

const exDir = 'specs/a2a/draft-1/examples';
const files = fs.readdirSync(exDir).filter(f => f.endsWith('.json')).sort();

if (files.length !== 50) {
  console.error('FAIL: expected 50 example files, found ' + files.length);
  process.exit(1);
}

let pass = 0, fail = 0;
const failures = [];
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(exDir, f), 'utf8'));
  if (validate(data)) { pass++; }
  else { fail++; failures.push({ file: f, errors: validate.errors }); }
}

if (failures.length) {
  for (const {file, errors} of failures) {
    console.error('FAIL: ' + file);
    for (const e of errors) console.error('  ' + (e.instancePath || '(root)') + ': ' + e.message);
  }
  process.exit(1);
}

console.log('OK: ' + pass + '/' + files.length + ' examples validated');
JS

echo ""
echo "=== Check 3: Negative test — extra field must be rejected ==="
node - <<'JS'
const {Ajv2020} = require('ajv/dist/2020');
const fs = require('fs');

const schema = require('./specs/a2a/draft-1/envelope.schema.json');
const ajv = new Ajv2020({strict: true, allErrors: true});
const validate = ajv.compile(schema);

const bad = JSON.parse(fs.readFileSync('specs/a2a/draft-1/examples/offer-01.json', 'utf8'));
bad.extra_field = 1;

if (!validate(bad)) {
  console.log('OK: extra_field correctly rejected (additionalProperties=false enforced)');
} else {
  console.error('FAIL: extra_field was NOT rejected — additionalProperties=false is broken');
  process.exit(1);
}
JS

echo ""
echo "=== All checks passed ==="
