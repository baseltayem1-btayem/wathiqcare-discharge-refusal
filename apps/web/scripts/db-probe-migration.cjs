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

async function main() {
  loadEnv();
  const migrationUrl = process.env.DATABASE_URL_UNPOOLED || null;
  if (!migrationUrl) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: "DATABASE_URL_UNPOOLED is required for migration probe",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: migrationUrl } } });
  const started = Date.now();

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1 AS ok`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("migration DB probe timed out")), 5000)),
    ]);

    console.log(
      JSON.stringify(
        {
          ok: true,
          selected: { source: "DATABASE_URL_UNPOOLED", hasValue: true },
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
          selected: { source: "DATABASE_URL_UNPOOLED", hasValue: true },
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
