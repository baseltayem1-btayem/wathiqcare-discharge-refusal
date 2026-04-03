#!/usr/bin/env node
/**
 * apply-migrations.mjs
 * Runs all custom SQL migration files in apps/web/prisma/migrations/ in
 * alphabetical order. Every migration uses IF NOT EXISTS / ADD COLUMN IF NOT
 * EXISTS patterns so it is safe to re-run on every deployment.
 *
 * Usage:  node scripts/apply-migrations.mjs
 * Env:    DATABASE_URL must be set (required by prisma db execute).
 */

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../prisma/migrations");
const schemaPath = join(__dirname, "../prisma/schema.prisma");

if (!process.env.DATABASE_URL) {
    console.warn("[migrations] DATABASE_URL not set — skipping custom migrations.");
    process.exit(0);
}

function executeSQL(sql, label) {
    execSync(`npx prisma db execute --schema "${schemaPath}" --stdin`, {
        input: sql,
        env: process.env,
        stdio: ["pipe", "inherit", "inherit"],
    });
}

async function main() {
    const files = (await readdir(migrationsDir))
        .filter((f) => f.endsWith(".sql"))
        .sort();

    console.log(`[migrations] Applying ${files.length} migration file(s)...`);

    for (const file of files) {
        const sql = await readFile(join(migrationsDir, file), "utf-8");
        console.log(`[migrations] Running: ${file}`);
        executeSQL(sql, file);
        console.log(`[migrations] OK: ${file}`);
    }

    console.log("[migrations] All custom migrations applied.");
}

main().catch((err) => {
    console.error("[migrations] Fatal:", err.message);
    process.exit(1);
});
