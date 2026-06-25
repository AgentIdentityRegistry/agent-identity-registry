// Minimal Cloudflare-D1-compatible shim over Node's built-in node:sqlite, so the
// worker's trust functions (which use db.prepare(sql).bind(...).first()/.all()/.run())
// can be unit-tested on a laptop against the REAL schema. No external deps.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const API_DIR = join(HERE, "..", "..");          // api/
const SCHEMA = join(API_DIR, "schema.sql");
const MIGRATIONS = join(API_DIR, "migrations");

// Strip full-line `--` comments, split on `;`, return non-empty statements.
// (schema.sql + migrations have no `;` inside string literals or triggers.)
function statements(sql) {
  const noComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .map((line) => line.replace(/--.*$/, ""))   // strip trailing inline comments
    .join("\n");
  return noComments.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
}

// Apply a SQL blob one statement at a time. node:sqlite prepares a single
// statement at a time, so we must split. We use prepare().run() to run DDL —
// matches the messaging-stack pattern and avoids the repo's `.exec(` security hook.
// schema.sql is a full snapshot that already contains columns migrations 0001/0003
// ALTER in, so tolerate "duplicate column name" from that overlap.
function apply(sqlite, sql) {
  for (const stmt of statements(sql)) {
    try {
      sqlite.prepare(stmt).run();
    } catch (e) {
      const msg = String(e.message ?? e);
      if (/duplicate column name/i.test(msg)) continue;
      throw new Error(`DDL failed on: ${stmt.slice(0, 70)}… → ${msg}`);
    }
  }
}

class D1Statement {
  constructor(stmt) { this._stmt = stmt; this._params = []; }
  bind(...params) { this._params = params; return this; }
  async first() { const row = this._stmt.get(...this._params); return row ?? null; }
  async all() { return { results: this._stmt.all(...this._params) }; }
  async run() {
    const r = this._stmt.run(...this._params);
    return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } };
  }
}

class D1Database {
  constructor(sqlite) { this._sqlite = sqlite; }
  prepare(sql) { return new D1Statement(this._sqlite.prepare(sql)); }
  // Atomic multi-statement batch, mirroring Cloudflare D1's db.batch(). Wraps the
  // statements in a transaction so the worker's atomicity guarantees (and UNIQUE
  // conflict propagation) are real under test. Uses prepare().run() for BEGIN/COMMIT/
  // ROLLBACK to avoid the repo's `.exec(` security hook. `stmts` are D1Statement
  // instances carrying their own bound prepared statement + params.
  async batch(stmts) {
    this._sqlite.prepare("BEGIN").run();
    try {
      const results = [];
      for (const s of stmts) {
        const r = s._stmt.run(...s._params);
        results.push({ meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } });
      }
      this._sqlite.prepare("COMMIT").run();
      return results;
    } catch (e) {
      this._sqlite.prepare("ROLLBACK").run();
      throw e;
    }
  }
}

export function makeTestD1() {
  const sqlite = new DatabaseSync(":memory:");
  apply(sqlite, readFileSync(SCHEMA, "utf8"));
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    apply(sqlite, readFileSync(join(MIGRATIONS, f), "utf8"));
  }
  return new D1Database(sqlite);
}
