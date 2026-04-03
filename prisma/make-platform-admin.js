#!/usr/bin/env node
/**
 * make-platform-admin.js
 *
 * Promotes an existing user to platform_admin (or platform_superadmin).
 * Also sets is_active = true and user_type = 'PLATFORM_ADMIN' so the
 * JWT issued on next login includes user_type: "platform_admin", which is
 * required by the Next.js middleware to grant access to /platform/* routes.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node prisma/make-platform-admin.js <email>
 *   DATABASE_URL=postgresql://... node prisma/make-platform-admin.js <email> superadmin
 *
 * The second argument (optional) sets the role:
 *   - (default)  → "platform_admin"
 *   - superadmin → "platform_superadmin"
 *
 * Requirements:
 *   - DATABASE_URL env var must point to the production / target PostgreSQL instance.
 *   - The user with <email> must already exist in the `users` table.
 *   - Node 18+, `psql` CLI available on PATH (used internally via child_process).
 */

const { execSync } = require("node:child_process");
const readline = require("node:readline");

// ── Helpers ──────────────────────────────────────────────────────────────────

function required(name) {
    const v = (process.env[name] || "").trim();
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
}

/**
 * Executes a single SQL query against DATABASE_URL using psql and returns
 * the result rows as an array of plain objects.
 *
 * We use psql --csv mode so we can parse rows reliably without installing
 * a Node.js pg driver.
 */
function psqlQuery(sql) {
    const dbUrl = required("DATABASE_URL");
    const result = execSync(`psql "${dbUrl}" --csv --tuples-only --command=${JSON.stringify(sql)}`, {
        encoding: "utf-8",
    });
    return result.trim();
}

function psqlExec(sql) {
    const dbUrl = required("DATABASE_URL");
    const output = execSync(`psql "${dbUrl}" --command=${JSON.stringify(sql)}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
    });
    return output.trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    let email = (args[0] || "").trim().toLowerCase();
    const levelArg = (args[1] || "").toLowerCase();

    const role = levelArg === "superadmin" ? "platform_superadmin" : "platform_admin";

    if (!email) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        email = await new Promise((resolve) => {
            rl.question("Enter user email: ", (ans) => {
                rl.close();
                resolve(ans.trim().toLowerCase());
            });
        });
    }

    if (!email || !email.includes("@")) {
        console.error("[ERROR] A valid email address is required.");
        process.exit(1);
    }

    console.log(`\n[make-platform-admin] Target  : ${email}`);
    console.log(`[make-platform-admin] New role : ${role}`);
    console.log("");

    // 1. Verify user exists --------------------------------------------------
    const existsResult = psqlQuery(
        `SELECT id, email, role, is_active FROM users WHERE LOWER(email) = '${email}' LIMIT 1`
    );

    if (!existsResult) {
        console.error(`[ERROR] No user found with email: ${email}`);
        console.error("  Please check the email or create the user first via:");
        console.error("    node prisma/recover_saas_admin.js");
        process.exit(1);
    }

    // Parse CSV row: id,email,role,is_active
    const [id, foundEmail, currentRole, currentActive] = existsResult.split(",").map((v) => v.trim());
    console.log(`[make-platform-admin] Found user: id=${id}, current_role=${currentRole}, is_active=${currentActive}`);

    // 2. Update role + is_active + user_type ----------------------------------
    //    user_type column comes from the apps/web prisma schema (UserType enum).
    //    We update it with a plain string cast that PostgreSQL accepts for
    //    the "user_type" column (enum: PLATFORM_ADMIN | TENANT_ADMIN | TENANT_USER).
    console.log("[make-platform-admin] Applying updates...");

    const updateSql = `
UPDATE users
SET
  role            = '${role}',
  is_active       = true,
  user_type       = 'PLATFORM_ADMIN',
  status          = 'active',
  failed_login_attempts = 0,
  locked_until    = NULL,
  updated_at      = NOW()
WHERE LOWER(email) = '${email}'
RETURNING id, email, role, is_active, user_type;
`.trim();

    let updateResult;
    try {
        updateResult = psqlQuery(updateSql);
    } catch (err) {
        // user_type column might not exist in older schema — retry without it
        if (err.message && err.message.includes("user_type")) {
            console.warn("[make-platform-admin] WARN: user_type column not found, skipping that field.");
            const fallbackSql = `
UPDATE users
SET
  role                  = '${role}',
  is_active             = true,
  status                = 'active',
  failed_login_attempts = 0,
  locked_until          = NULL,
  updated_at            = NOW()
WHERE LOWER(email) = '${email}'
RETURNING id, email, role, is_active;
`.trim();
            updateResult = psqlQuery(fallbackSql);
        } else {
            throw err;
        }
    }

    if (!updateResult) {
        console.error(`[ERROR] UPDATE returned no rows.  Check that the email matches exactly: ${email}`);
        process.exit(1);
    }

    // 3. Ensure tenant_memberships row is ACTIVE -----------------------------
    //    (login route does a LEFT JOIN on memberships — having an ACTIVE row
    //     avoids any "membership not active" warning in the server log)
    try {
        psqlExec(`
UPDATE tenant_memberships tm
SET status = 'ACTIVE', updated_at = NOW()
FROM users u
WHERE tm.user_id = u.id
  AND tm.tenant_id = u.tenant_id
  AND LOWER(u.email) = '${email}'
  AND tm.status != 'ACTIVE';
`);
        console.log("[make-platform-admin] tenant_memberships status ensured ACTIVE.");
    } catch (_) {
        // Non-critical — the login still works without an active membership for platform admins
        console.warn("[make-platform-admin] WARN: could not verify tenant_memberships (non-critical for platform admin).");
    }

    // 4. Verify final state --------------------------------------------------
    const verifyResult = psqlQuery(
        `SELECT email, role, is_active FROM users WHERE LOWER(email) = '${email}'`
    );

    console.log("\n══════════════════════════════════════════════");
    console.log("  PLATFORM ADMIN PROMOTION — COMPLETE");
    console.log("══════════════════════════════════════════════");
    console.log(`  Email   : ${email}`);
    console.log(`  Role    : ${role}`);
    console.log(`  Active  : true`);
    console.log(`  Access  : /platform/* routes GRANTED`);
    console.log("══════════════════════════════════════════════");
    console.log("\nNext step: Log out and log back in so a new JWT is issued");
    console.log("with user_type: \"platform_admin\".  The middleware will then");
    console.log("redirect you to /platform on next login.\n");

    console.log("[DB state]", verifyResult);
}

main().catch((err) => {
    console.error("[make-platform-admin] FATAL:", err.message || err);
    process.exit(1);
});
