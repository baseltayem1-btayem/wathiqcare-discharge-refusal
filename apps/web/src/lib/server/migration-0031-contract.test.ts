import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

// ---------------------------------------------------------------------------
// Migration 0031 (conditional witness auth) static/structural contract test.
//
// Purely static: reads the migration SQL, prisma schema and the runtime
// bootstrap DDL mirror as text. Never opens a database connection.
// ---------------------------------------------------------------------------

const MIGRATION_FILE = "0031_conditional_witness_auth.sql";
const PRECEDENT_MIGRATION_FILE = "0030_package1_idempotency_outbox.sql";

const WITNESS_TABLES = ["consent_witness_requirements", "consent_witness_signatures"] as const;

function readMigration(): string {
  return fs.readFileSync(path.resolve("prisma/migrations", MIGRATION_FILE), "utf8");
}

function readSchema(): string {
  return fs.readFileSync(path.resolve("prisma/schema.prisma"), "utf8");
}

function readDocumentsRoute(): string {
  return fs.readFileSync(
    path.resolve("src/app/api/modules/informed-consents/documents/route.ts"),
    "utf8",
  );
}

/** Extract a CREATE TABLE statement body (normalized) for a given table. */
function extractCreateTable(sql: string, table: string): string | null {
  const match = sql.match(
    new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\(([\\s\\S]*?)\\n\\s*\\)\\s*;?`, "i"),
  );
  return match ? normalizeSql(match[0]) : null;
}

/** Extract a CREATE INDEX statement (normalized) for a given index name. */
function extractCreateIndex(sql: string, indexName: string): string | null {
  const match = sql.match(
    new RegExp(`CREATE INDEX IF NOT EXISTS ${indexName}[\\s\\S]*?\\)\\s*;?`, "i"),
  );
  return match ? normalizeSql(match[0]) : null;
}

function normalizeSql(sql: string): string {
  return sql
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)\s*/g, ") ")
    .replace(/\s*,\s*/g, ", ")
    .trim()
    .replace(/;\s*$/, "")
    .trim();
}

/** Extract the witness-related slice of the bootstrap statements array. */
function extractWitnessBootstrap(routeSource: string): string {
  const arrayStart = routeSource.indexOf("CONSENT_SCHEMA_BOOTSTRAP_STATEMENTS");
  assert.notEqual(arrayStart, -1, "bootstrap statements array must exist in documents route");
  const witnessStart = routeSource.indexOf("consent_witness_requirements", arrayStart);
  assert.notEqual(witnessStart, -1, "bootstrap must contain consent_witness_requirements DDL");
  const arrayEnd = routeSource.indexOf("];", witnessStart);
  assert.notEqual(arrayEnd, -1, "bootstrap statements array must be terminated");
  // Include a bit of leading context so the CREATE TABLE keyword is captured.
  return routeSource.slice(routeSource.lastIndexOf("`", witnessStart), arrayEnd);
}

/** Extract a Prisma model block from schema.prisma. */
function extractModelBlock(schema: string, modelName: string): string {
  const match = schema.match(new RegExp(`model ${modelName} \\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match, `schema.prisma must contain model ${modelName}`);
  return match[1];
}

/** Column name for a Prisma field line: explicit @map() or the field name itself. */
function mappedColumnName(fieldLine: string): string | null {
  const fieldMatch = fieldLine.match(/^\s*(\w+)\s+/);
  if (!fieldMatch) return null;
  const fieldName = fieldMatch[1];
  if (["model", "enum", "@@", "//"].some((p) => fieldName.startsWith(p))) return null;
  const mapMatch = fieldLine.match(/@map\("([^"]+)"\)/);
  return mapMatch ? mapMatch[1] : fieldName;
}

// ---------------------------------------------------------------------------
// Check 7: migration order
// ---------------------------------------------------------------------------

test("migration 0031 exists and follows 0030 in the migrations directory", () => {
  const dir = path.resolve("prisma/migrations");
  const entries = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  assert.ok(entries.includes(MIGRATION_FILE), "0031 migration file must exist");
  assert.ok(entries.includes(PRECEDENT_MIGRATION_FILE), "0030 migration file must exist");
  assert.ok(
    entries.indexOf(MIGRATION_FILE) > entries.indexOf(PRECEDENT_MIGRATION_FILE),
    "0031 must be ordered after 0030",
  );
  assert.equal(
    entries.filter((f) => f.startsWith("0031_")).length,
    1,
    "there must be exactly one 0031 migration",
  );
});

// ---------------------------------------------------------------------------
// Check 1: additive only, no destructive statements
// ---------------------------------------------------------------------------

test("migration 0031 is additive only (no DROP/TRUNCATE/destructive ALTER/data rewrite)", () => {
  const sql = readMigration();

  const destructivePatterns: Array<[RegExp, string]> = [
    [/\bDROP\s+(TABLE|COLUMN|INDEX|CONSTRAINT|TYPE|SCHEMA)\b/i, "DROP statement"],
    [/\bTRUNCATE\b/i, "TRUNCATE statement"],
    [/\bUPDATE\s+\w/i, "UPDATE data rewrite"],
    [/\bDELETE\s+FROM\b/i, "DELETE data rewrite"],
    [/\bALTER\s+COLUMN\b/i, "ALTER COLUMN"],
    [/\bSET\s+NOT\s+NULL\b/i, "SET NOT NULL"],
    [/\bDROP\s+NOT\s+NULL\b/i, "DROP NOT NULL"],
    [/\bTYPE\s+\w+/i, "column TYPE change"],
    [/\bRENAME\b/i, "RENAME"],
  ];

  for (const [pattern, label] of destructivePatterns) {
    assert.ok(!pattern.test(sql), `migration must not contain ${label}: ${pattern}`);
  }

  // Only CREATE statements are expected in this migration.
  const statements = sql
    .split(";")
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter(Boolean);
  assert.ok(statements.length >= 4, "migration must contain at least 2 tables + 2 indexes");
  for (const statement of statements) {
    assert.match(
      statement,
      /^CREATE\s+(TABLE|INDEX)\b/i,
      `only CREATE TABLE/CREATE INDEX statements are allowed, got: ${statement.slice(0, 80)}`,
    );
  }
});

test("witness bootstrap statements are additive only", () => {
  const bootstrap = extractWitnessBootstrap(readDocumentsRoute());

  assert.ok(!/\bDROP\b/i.test(bootstrap), "bootstrap witness DDL must not contain DROP");
  assert.ok(!/\bTRUNCATE\b/i.test(bootstrap), "bootstrap witness DDL must not contain TRUNCATE");
  assert.ok(!/\bUPDATE\s+\w/i.test(bootstrap), "bootstrap witness DDL must not contain UPDATE");
  assert.ok(!/\bDELETE\s+FROM\b/i.test(bootstrap), "bootstrap witness DDL must not contain DELETE");
  assert.ok(!/\bALTER\s+(TABLE|COLUMN)\b/i.test(bootstrap), "bootstrap witness DDL must not ALTER anything");
});

// ---------------------------------------------------------------------------
// Check 3: idempotency guards (IF NOT EXISTS everywhere)
// ---------------------------------------------------------------------------

test("every CREATE statement in migration 0031 is guarded with IF NOT EXISTS", () => {
  const sql = readMigration();
  const createStatements = sql.match(/CREATE\s+(TABLE|INDEX)[^;]*/gi) ?? [];
  assert.ok(createStatements.length >= 4, "expected at least 4 CREATE statements");
  for (const statement of createStatements) {
    assert.ok(
      /CREATE\s+(TABLE|INDEX)\s+IF\s+NOT\s+EXISTS/i.test(statement),
      `CREATE statement must use IF NOT EXISTS: ${statement.slice(0, 80)}`,
    );
  }
  assert.match(sql, /Safe to run multiple times/i, "migration must document re-runnability");
});

test("every witness bootstrap statement is guarded with IF NOT EXISTS", () => {
  const bootstrap = extractWitnessBootstrap(readDocumentsRoute());
  const createStatements = bootstrap.match(/CREATE\s+(TABLE|INDEX)[^`]*/gi) ?? [];
  assert.equal(createStatements.length, 4, "bootstrap must have 2 CREATE TABLE + 2 CREATE INDEX for witness tables");
  for (const statement of createStatements) {
    assert.ok(
      /CREATE\s+(TABLE|INDEX)\s+IF\s+NOT\s+EXISTS/i.test(statement),
      `bootstrap CREATE statement must use IF NOT EXISTS: ${statement.slice(0, 80)}`,
    );
  }
});

// ---------------------------------------------------------------------------
// Check 2: names and columns match the Prisma models
// ---------------------------------------------------------------------------

test("migration table/column names match the Prisma models (honoring @map/@@map)", () => {
  const sql = readMigration();
  const schema = readSchema();

  const modelToTable: Record<string, string> = {
    ConsentWitnessRequirement: "consent_witness_requirements",
    ConsentWitnessSignature: "consent_witness_signatures",
  };

  for (const [model, table] of Object.entries(modelToTable)) {
    const block = extractModelBlock(schema, model);
    assert.ok(
      block.includes(`@@map("${table}")`),
      `model ${model} must map to table ${table}`,
    );
    assert.ok(
      new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, "i").test(sql),
      `migration must create table ${table}`,
    );

    const columnLines = block
      .split("\n")
      .filter((line) => {
        const match = line.match(/^\s*(\w+)\s+(\w+)/);
        if (!match) return false;
        if (line.trimStart().startsWith("//")) return false;
        if (line.includes("@relation")) return false;
        // Scalar field types start lowercase (String, Int, DateTime are Prisma
        // scalars but relation target models here are also PascalCase — the
        // @relation exclusion above handles those; keep known scalar types).
        return ["String", "Int", "Boolean", "DateTime", "Json", "Float", "BigInt"].includes(match[2]);
      });
    const columns = columnLines
      .map(mappedColumnName)
      .filter((c): c is string => c !== null);
    assert.ok(columns.length >= 10, `model ${model} must expose its columns`);

    const tableSql = extractCreateTable(sql, table) ?? "";
    for (const column of columns) {
      assert.ok(
        new RegExp(`\\b${column}\\b`).test(tableSql),
        `migration table ${table} must contain column ${column} (from model ${model})`,
      );
    }
  }
});

test("migration constraint and index names match the Prisma @@unique/@@index map names", () => {
  const sql = readMigration();
  const schema = readSchema();

  const expectedNames = [
    "uq_consent_witness_requirements_doc_index",
    "idx_consent_witness_requirements_doc",
    "uq_consent_witness_signatures_tenant_idempotency",
    "uq_consent_witness_signatures_requirement",
    "idx_consent_witness_signatures_doc",
  ];

  for (const name of expectedNames) {
    assert.ok(sql.includes(name), `migration must contain ${name}`);
    assert.ok(schema.includes(`"${name}"`), `schema.prisma must map ${name}`);
  }
});

// ---------------------------------------------------------------------------
// Check 4: tenant scoping in indexes/constraints
// ---------------------------------------------------------------------------

test("all witness unique constraints and indexes lead with tenant_id", () => {
  const sql = readMigration();

  const scopedConstraints: Array<[string, RegExp]> = [
    ["uq_consent_witness_requirements_doc_index", /UNIQUE\s*\(\s*tenant_id\s*,\s*consent_document_id\s*,\s*witness_index\s*\)/i],
    ["uq_consent_witness_signatures_tenant_idempotency", /UNIQUE\s*\(\s*tenant_id\s*,\s*idempotency_key\s*\)/i],
    ["idx_consent_witness_requirements_doc", /ON\s+consent_witness_requirements\s*\(\s*tenant_id\s*,\s*consent_document_id\s*,\s*status\s*\)/i],
    ["idx_consent_witness_signatures_doc", /ON\s+consent_witness_signatures\s*\(\s*tenant_id\s*,\s*consent_document_id\s*\)/i],
  ];

  for (const [name, pattern] of scopedConstraints) {
    const nameIndex = sql.indexOf(name);
    assert.notEqual(nameIndex, -1, `${name} must exist`);
    const window = sql.slice(nameIndex, nameIndex + 300);
    assert.ok(pattern.test(window), `${name} must be tenant-scoped per ${pattern}`);
  }

  // Both tables must carry a tenant_id column with an FK to tenants.
  for (const table of WITNESS_TABLES) {
    const tableSql = extractCreateTable(sql, table) ?? "";
    assert.ok(
      /tenant_id text not null references tenants\s*\(\s*id\s*\)/.test(tableSql),
      `${table} must have tenant_id FK to tenants(id)`,
    );
  }
});

// ---------------------------------------------------------------------------
// Check 5: unique constraints support idempotency / prevent duplicate evidence
// ---------------------------------------------------------------------------

test("requirements enforce one record per document + witness index (tenant-scoped)", () => {
  const sql = readMigration();
  assert.match(
    sql,
    /CONSTRAINT\s+uq_consent_witness_requirements_doc_index\s+UNIQUE\s*\(\s*tenant_id\s*,\s*consent_document_id\s*,\s*witness_index\s*\)/i,
    "requirements must be unique per (tenant_id, consent_document_id, witness_index)",
  );
});

test("signatures enforce idempotency key uniqueness and one signature per requirement", () => {
  const sql = readMigration();

  assert.match(
    sql,
    /CONSTRAINT\s+uq_consent_witness_signatures_tenant_idempotency\s+UNIQUE\s*\(\s*tenant_id\s*,\s*idempotency_key\s*\)/i,
    "signatures must be unique per (tenant_id, idempotency_key)",
  );
  assert.match(
    sql,
    /idempotency_key\s+TEXT\s+NOT\s+NULL/i,
    "signature idempotency_key must be NOT NULL so the unique constraint always applies",
  );
  assert.match(
    sql,
    /CONSTRAINT\s+uq_consent_witness_signatures_requirement\s+UNIQUE\s*\(\s*witness_requirement_id\s*\)/i,
    "signatures must be unique per witness_requirement_id (one signature per requirement)",
  );
});

test("CHECK constraints pin witness roles and requirement status to the known value sets", () => {
  const sql = readMigration();

  const roleCheck = /CHECK\s*\(\s*\w+\s+IN\s*\(\s*'NURSING_REPRESENTATIVE'\s*,\s*'PATIENT_EXPERIENCE_REPRESENTATIVE'\s*\)\s*\)/gi;
  const roleMatches = sql.match(roleCheck) ?? [];
  assert.equal(
    roleMatches.length,
    2,
    "required_role and witness_role must both be CHECK-constrained to the witness role set",
  );

  assert.match(
    sql,
    /status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'PENDING'\s+CHECK\s*\(\s*status\s+IN\s*\(\s*'PENDING'\s*,\s*'ASSIGNED'\s*,\s*'SIGNED'\s*,\s*'REVOKED'\s*\)\s*\)/i,
    "requirement status must default to PENDING with the full status CHECK set",
  );
});

// ---------------------------------------------------------------------------
// Check 6: FK onDelete behavior matches Prisma relation attributes
// ---------------------------------------------------------------------------

test("FK onDelete behavior is explicit and matches the Prisma relations", () => {
  const sql = readMigration();
  const schema = readSchema();

  const expectedFks: Array<{
    table: string;
    column: string;
    references: string;
    onDelete: "Cascade" | "Restrict";
    model: string;
  }> = [
    { table: "consent_witness_requirements", column: "tenant_id", references: "tenants(id)", onDelete: "Cascade", model: "ConsentWitnessRequirement" },
    { table: "consent_witness_requirements", column: "consent_document_id", references: "consent_documents(id)", onDelete: "Cascade", model: "ConsentWitnessRequirement" },
    { table: "consent_witness_signatures", column: "tenant_id", references: "tenants(id)", onDelete: "Cascade", model: "ConsentWitnessSignature" },
    { table: "consent_witness_signatures", column: "consent_document_id", references: "consent_documents(id)", onDelete: "Cascade", model: "ConsentWitnessSignature" },
    { table: "consent_witness_signatures", column: "witness_requirement_id", references: "consent_witness_requirements(id)", onDelete: "Restrict", model: "ConsentWitnessSignature" },
  ];

  for (const fk of expectedFks) {
    const tableSql = extractCreateTable(sql, fk.table) ?? "";
    const refMatch = fk.references.match(/^(\w+)\((\w+)\)$/);
    assert.ok(refMatch, `invalid references spec ${fk.references}`);
    assert.ok(
      new RegExp(
        `${fk.column}\\s+text\\s+not\\s+null\\s+references\\s+${refMatch[1]}\\s*\\(\\s*${refMatch[2]}\\s*\\)\\s+on delete ${fk.onDelete.toLowerCase()}`,
      ).test(tableSql),
      `${fk.table}.${fk.column} must be an explicit FK to ${fk.references} ON DELETE ${fk.onDelete.toUpperCase()}`,
    );

    const block = extractModelBlock(schema, fk.model);
    assert.ok(
      block.includes(`onDelete: ${fk.onDelete}`),
      `Prisma model ${fk.model} must declare onDelete: ${fk.onDelete} to match the migration FK`,
    );
  }

  // Signature evidence must survive requirement deletion attempts: RESTRICT, not CASCADE.
  const signaturesSql = extractCreateTable(sql, "consent_witness_signatures") ?? "";
  assert.ok(
    /witness_requirement_id text not null references consent_witness_requirements\s*\(\s*id\s*\) on delete restrict/.test(
      signaturesSql,
    ),
    "witness signature evidence must be protected with ON DELETE RESTRICT",
  );
});

// ---------------------------------------------------------------------------
// Check 8: migration SQL and bootstrap DDL must not silently diverge
// ---------------------------------------------------------------------------

test("bootstrap DDL mirrors migration 0031 for both witness tables and indexes", () => {
  const migration = readMigration();
  const bootstrap = extractWitnessBootstrap(readDocumentsRoute());

  for (const table of WITNESS_TABLES) {
    const migrationDdl = extractCreateTable(migration, table);
    const bootstrapDdl = extractCreateTable(bootstrap, table);
    assert.ok(migrationDdl, `migration must contain CREATE TABLE for ${table}`);
    assert.ok(bootstrapDdl, `bootstrap must contain CREATE TABLE for ${table}`);
    assert.equal(
      bootstrapDdl,
      migrationDdl,
      `bootstrap DDL for ${table} must be equivalent to migration 0031 (normalized)`,
    );
  }

  for (const index of ["idx_consent_witness_requirements_doc", "idx_consent_witness_signatures_doc"]) {
    const migrationDdl = extractCreateIndex(migration, index);
    const bootstrapDdl = extractCreateIndex(bootstrap, index);
    assert.ok(migrationDdl, `migration must contain ${index}`);
    assert.ok(bootstrapDdl, `bootstrap must contain ${index}`);
    assert.equal(
      bootstrapDdl,
      migrationDdl,
      `bootstrap index ${index} must be equivalent to migration 0031 (normalized)`,
    );
  }
});

// ---------------------------------------------------------------------------
// Runtime usage alignment: Prisma client access matches model names
// ---------------------------------------------------------------------------

test("runtime witness service uses the Prisma models declared in schema.prisma", () => {
  const service = fs.readFileSync(
    path.resolve("src/lib/server/witness-requirement-service.ts"),
    "utf8",
  );
  const schema = readSchema();

  assert.ok(
    service.includes("consentWitnessRequirement"),
    "witness-requirement-service must use the consentWitnessRequirement Prisma model",
  );
  assert.ok(
    service.includes("consentWitnessSignature"),
    "witness-requirement-service must use the consentWitnessSignature Prisma model",
  );
  assert.ok(
    /model ConsentWitnessRequirement \{/.test(schema) && /model ConsentWitnessSignature \{/.test(schema),
    "schema.prisma must declare both witness models",
  );
  // Runtime must not hand-write SQL against these tables that could drift from
  // the migration contract.
  assert.ok(
    !/consent_witness_(requirements|signatures)/.test(service),
    "witness-requirement-service must not use raw SQL table names for witness tables",
  );
});
