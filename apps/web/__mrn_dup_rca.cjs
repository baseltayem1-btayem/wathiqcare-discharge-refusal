const fs = require('fs');
const { Client } = require('pg');
const envText = fs.readFileSync('.env.vercel.prod.readonly','utf8');
function getVar(name){const m=envText.match(new RegExp('^'+name+'=(.*)$','m'));if(!m)return null;let v=m[1].trim();if(v.startsWith('"')&&v.endsWith('"'))v=v.slice(1,-1);return v;}
const url = getVar('DATABASE_URL_UNPOOLED') || getVar('DATABASE_URL');
const mrns = []; for (let i = 2000; i <= 2024; i++) mrns.push('IMC-2026-0' + i);

(async () => {
  const c = new Client({ connectionString: url });
  await c.connect();
  const out = { db: (await c.query('SELECT current_database() AS d')).rows[0].d };

  const casesRes = await c.query(
    'SELECT id::text, tenant_id::text, case_number, patient_name, patient_id_number, medical_record_no, status, workflow_type, room_number, created_by_user_id::text AS created_by, updated_by_user_id::text AS updated_by, closed_at, version, created_at, updated_at, metadata FROM cases WHERE medical_record_no = ANY($1) ORDER BY medical_record_no, created_at',
    [mrns]
  );
  out.total_case_rows = casesRes.rows.length;

  const groups = {};
  for (const row of casesRes.rows) {
    (groups[row.medical_record_no] = groups[row.medical_record_no] || []).push(row);
  }

  async function childCount(table, col, ids) {
    try {
      const r = await c.query('SELECT "' + col + '" AS cid, COUNT(*)::int AS n FROM "' + table + '" WHERE "' + col + '" = ANY($1::uuid[]) GROUP BY "' + col + '"', [ids]);
      const map = {};
      for (const x of r.rows) map[x.cid] = x.n;
      return map;
    } catch(e) {
      return { __error: e.message };
    }
  }

  const linkCols = (await c.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('case_id','discharge_refusal_case_id')")).rows;
  out.discovered_link_columns = linkCols;

  const allIds = casesRes.rows.map(r => r.id);

  const countsByTable = {};
  for (const lc of linkCols) {
    countsByTable[lc.table_name + ':' + lc.column_name] = await childCount(lc.table_name, lc.column_name, allIds);
  }

  out.duplicate_pairs = [];
  for (const mrn of mrns) {
    const rows = groups[mrn] || [];
    const pair = rows.map(r => {
      const childCounts = {};
      for (const [k, m] of Object.entries(countsByTable)) {
        if (m.__error) { childCounts[k] = { error: m.__error }; continue; }
        if (m[r.id]) childCounts[k] = m[r.id];
      }
      return {
        case_id: r.id,
        tenant_id: r.tenant_id,
        case_number: r.case_number,
        patient_name: r.patient_name,
        patient_id_number: r.patient_id_number,
        status: r.status,
        workflow_type: r.workflow_type,
        room_number: r.room_number,
        created_by: r.created_by,
        updated_by: r.updated_by,
        created_at: r.created_at,
        updated_at: r.updated_at,
        closed_at: r.closed_at,
        version: r.version,
        metadata: r.metadata,
        child_row_counts: childCounts,
        child_row_total: Object.values(childCounts).reduce((s,v)=> s + (typeof v === 'number' ? v : 0), 0)
      };
    });
    out.duplicate_pairs.push({ mrn, row_count: pair.length, rows: pair });
  }

  const tenantSet = {};
  for (const r of casesRes.rows) tenantSet[r.tenant_id] = (tenantSet[r.tenant_id] || 0) + 1;
  out.tenant_distribution = tenantSet;
  const tenantIds = Object.keys(tenantSet);
  if (tenantIds.length) {
    const tr = await c.query('SELECT id::text, name, created_at FROM tenants WHERE id::text = ANY($1)', [tenantIds]);
    out.tenants = tr.rows;
  }
  const clusters = [];
  for (const mrn of mrns) {
    const rs = groups[mrn] || [];
    if (rs.length === 2) {
      const a = new Date(rs[0].created_at).getTime();
      const b = new Date(rs[1].created_at).getTime();
      clusters.push({ mrn, delta_seconds: Math.round((b - a) / 1000), a: rs[0].created_at, b: rs[1].created_at, same_tenant: rs[0].tenant_id === rs[1].tenant_id, status_a: rs[0].status, status_b: rs[1].status });
    }
  }
  out.creation_time_deltas = clusters;

  console.log(JSON.stringify(out, null, 2));
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
