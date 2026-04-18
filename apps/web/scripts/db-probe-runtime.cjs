const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (typeof process.env[key] === "undefined") {
      process.env[key] = value;
    }
  }
}

function loadEnv() {
  const root = path.resolve(__dirname, "..", "..", "..");
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, "apps", "web", ".env.local"));
}

function chooseRuntimeDbUrl() {
  if (process.env.DATABASE_URL_POOLED) {
    return { source: "DATABASE_URL_POOLED", value: process.env.DATABASE_URL_POOLED };
  }
  if (process.env.DATABASE_URL) {
    return { source: "DATABASE_URL", value: process.env.DATABASE_URL };
  }
  return { source: "none", value: null };
}

async function main() {
  loadEnv();
  const selected = chooseRuntimeDbUrl();
  if (!selected.value) {
    console.log(JSON.stringify({ ok: false, error: "No runtime DB URL found", selected }, null, 2));
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: selected.value } } });
  const started = Date.now();

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1 AS ok`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("runtime DB probe timed out")), 5000)),
    ]);

    console.log(
      JSON.stringify(
        {
          ok: true,
          selected: { source: selected.source, hasValue: true },
          latencyMs: Date.now() - started,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          selected: { source: selected.source, hasValue: true },
          latencyMs: Date.now() - started,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    process.exit(2);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main();
