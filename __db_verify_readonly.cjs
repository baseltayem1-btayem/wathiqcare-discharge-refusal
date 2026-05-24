const fs = require('fs');
const { Client } = require('pg');
const envText = fs.readFileSync('.env.vercel.prod.readonly','utf8');
function getVar(name) {
  const re = new RegExp('^' + name + '=(.*)$','m');
  const m = envText.match(re);
  if (!m) return null;
  let v = m[1].trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1,-1);
  return v;
}
const url = getVar('DATABASE_URL_UNPOOLED') || getVar('DATABASE_URL');
(async () => {
  const c = new Client({ connectionString: url });
  await c.connect();
  const out = {};
  out.db_info = (await c.query("SELECT current_database() AS db, version() AS version")).rows[0];
  out.recent_migrations = (await c.query("SELECT migration_name, started_at, finished_at, applied_steps_count, rolled_back_at FROM _prisma_migrations ORDER BY COALESCE(finished_at, started_at) DESC NULLS LAST LIMIT 10")).rows;
  out.total_applied_migrations = (await c.query("SELECT COUNT(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")).rows[0].n;
  out.failed_or_pending_migrations = (await c.query("SELECT migration_name, started_at, finished_at, rolled_back_at FROM _prisma_migrations WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL")).rows;
  async function count(sql) { try { return (await c.query(sql)).rows[0].n; } catch(e) { return { error: e.message }; } }
  out.counts = {
    users_total: await count("SELECT COUNT(*)::int AS n FROM users"),
    consent_templates_total: await count("SELECT COUNT(*)::int AS n FROM consent_templates"),
    audit_logs_total: await count("SELECT COUNT(*)::int AS n FROM audit_logs"),
    audit_chain_events_total: await count("SELECT COUNT(*)::int AS n FROM audit_chain_events"),
    cases_total: await count("SELECT COUNT(*)::int AS n FROM cases"),
    patients_distinct_mrn: await count("SELECT COUNT(DISTINCT mrn)::int AS n FROM cases WHERE mrn IS NOT NULL AND mrn <> ''")
  };
  try { out.users_timestamps = (await c.query("SELECT MIN(created_at) AS first_user, MAX(created_at) AS last_user FROM users")).rows[0]; } catch(e) { out.users_timestamps_error = e.message; }
  try {
    const cols = (await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='audit_logs'")).rows.map(r=>r.column_name);
    const ts = ['created_at','createdAt','occurred_at','timestamp'].find(x => cols.includes(x));
    out.audit_logs_columns = cols;
    if (ts) out.last_audit_log = (await c.query('SELECT MAX("'+ts+'") AS last FROM audit_logs')).rows[0].last;
  } catch(e) { out.last_audit_log_error = e.message; }
  out.seed_related_tables = (await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%seed%' OR table_name ILIKE '%bootstrap%')")).rows;
  console.log(JSON.stringify(out, null, 2));
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
