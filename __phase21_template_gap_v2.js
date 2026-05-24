// Phase 2.1 — v2 (tighter detection)
// Uses canonical section_key mapping derived from the 25-section template scaffold:
//   04_description           => PATIENT EDUCATION
//   06_expected_benefits     => BENEFITS
//   07_material_risks (+08,09)=> RISKS
//   10_alternatives          => ALTERNATIVES
//   12_questions_confirmation=> UNDERSTANDING QUESTIONS (only if it contains actual questions, not just an ack statement)
//   (no canonical FAQ section in current schema)

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '.env.vercel.prod.readonly'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) env[m[1]] = m[2];
}
const url = env.DATABASE_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL;

// Canonical keys per section. Covers BOTH section schemas:
//   Schema B "numbered" (01..25_*) used by 19 of 23 templates
//   Schema A "fixed_/dynamic_" used by 3 legacy templates
const CANON = {
  patient_education: { keys: [/^04_description/i, /procedure_description/i, /^description_of/i, /patient_education/i, /patient_info_education/i, /^dynamic_proposed_procedure/i, /^dynamic_medical_condition/i] },
  risks:             { keys: [/^07_material_risks/i, /^08_possible_complications/i, /^09_serious_complications/i, /^risks?_/i, /side_effects/i, /^dynamic_common_risks/i, /^dynamic_uncommon_risks/i, /^dynamic_serious_risks/i, /^dynamic_complications/i] },
  benefits:          { keys: [/^06_expected_benefits/i, /^benefits?_/i, /expected_outcomes/i, /^dynamic_expected_benefits/i] },
  alternatives:      { keys: [/^10_alternatives/i, /^alternatives?_/i, /^dynamic_treatment_alternatives/i] },
  faq:               { keys: [/^faq/i, /frequently_asked/i, /q_and_a/i, /qna/i] },
  understanding_questions: { keys: [/understanding_questions/i, /comprehension_check/i, /quiz/i, /^14_understanding/i] },
};

// Heuristic: 12_questions_confirmation is the patient's chance to confirm
// they had their questions answered. Counts as Understanding Questions ONLY
// if its content contains an actual question mark sequence (>1 '?') or
// the phrase "have you understood" / "هل فهمت".
function isLegitUnderstanding(section) {
  if (!section) return false;
  const ar = section.content_ar || '';
  const en = (section.content_en || '').toLowerCase();
  const qCount = (en.match(/\?/g) || []).length + (ar.match(/؟/g) || []).length;
  if (qCount >= 2) return true;
  if (/have you understood|do you understand|please confirm.*understood|check your understanding/.test(en)) return true;
  if (/هل فهمت|تأكد من فهمك|اختبار الفهم/.test(ar)) return true;
  return false;
}

const RISK_PRIORITY = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, MINIMAL: 1 };

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Distinct templates (collapse duplicates across the two tenants by template_code)
  const tplRes = await c.query(`
    SELECT t.id, t.tenant_id, t.template_code, t.consent_type, t.specialty, t.department,
           t.risk_level, t.requires_witness, t.requires_guardian, t.status::text AS status,
           t.current_version_id, t.title_en, t.title_ar
    FROM consent_templates t
    ORDER BY t.template_code, t.tenant_id
  `);

  const all = [];
  for (const t of tplRes.rows) {
    let v;
    if (t.current_version_id) {
      v = (await c.query(`SELECT * FROM consent_template_versions WHERE id=$1`, [t.current_version_id])).rows[0];
    }
    if (!v) {
      v = (await c.query(`SELECT * FROM consent_template_versions WHERE template_id=$1 ORDER BY version_number DESC LIMIT 1`, [t.id])).rows[0];
    }
    if (!v) { all.push({ t, v: null, sections: [] }); continue; }
    const s = (await c.query(
      `SELECT section_key, title_ar, title_en, content_ar, content_en
       FROM consent_template_sections WHERE template_version_id=$1 ORDER BY sort_order ASC`, [v.id])).rows;
    all.push({ t, v, sections: s });
  }

  // Collapse duplicates by template_code (keep first; record tenant count)
  const byCode = new Map();
  for (const r of all) {
    const code = r.t.template_code;
    if (!byCode.has(code)) byCode.set(code, { ...r, tenantCount: 1, tenantIds: [r.t.tenant_id] });
    else { const e = byCode.get(code); e.tenantCount++; e.tenantIds.push(r.t.tenant_id); }
  }

  const results = [];
  for (const r of byCode.values()) {
    const detection = {};
    for (const [name, def] of Object.entries(CANON)) {
      let hit = null;
      for (const s of r.sections) {
        if (def.keys.some(rx => rx.test(s.section_key))) { hit = s; break; }
      }
      if (name === 'understanding_questions') {
        // also try 12_questions_confirmation, but ONLY if content looks like questions
        const candidate = r.sections.find(s => /^12_questions_confirmation/i.test(s.section_key));
        if (!hit && candidate && isLegitUnderstanding(candidate)) hit = candidate;
      }
      detection[name] = hit ? { found: true, via: hit.section_key } : { found: false, via: null };
    }
    const hits = Object.values(detection).filter(d => d.found).length;
    const completeness = Math.round((hits / 6) * 100);
    const missing = Object.entries(detection).filter(([, d]) => !d.found).map(([n]) => n);
    const w = RISK_PRIORITY[(r.t.risk_level || 'MEDIUM').toUpperCase()] || 3;
    const witnessBoost = (r.t.requires_witness || r.t.requires_guardian) ? 1.5 : 1.0;
    const priority = Math.round(w * 100 * (1 - completeness / 100) * witnessBoost);
    results.push({ tpl: r.t, version: r.v, sections: r.sections, tenantCount: r.tenantCount, detection, completeness, missing, priority });
  }

  results.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const ra = RISK_PRIORITY[(a.tpl.risk_level || 'MEDIUM').toUpperCase()] || 3;
    const rb = RISK_PRIORITY[(b.tpl.risk_level || 'MEDIUM').toUpperCase()] || 3;
    if (rb !== ra) return rb - ra;
    return a.completeness - b.completeness;
  });

  console.log(`Distinct templates (collapsed across ${all.length - results.length + results.length} tenant copies): ${results.length}`);
  console.log('\n=== PHASE 2.1 v2: GAP RANKING (highest risk first) ===\n');
  console.log('Rank|Pri|Risk    |Wit|Type                          |Template code                          |Cmpl%|Missing');
  console.log('----+---+--------+---+------------------------------+---------------------------------------+-----+--------------------------------');
  results.forEach((r, i) => {
    const wit = (r.tpl.requires_witness ? 'W' : '-') + (r.tpl.requires_guardian ? 'G' : '-');
    console.log(
      `${String(i+1).padStart(4)}|${String(r.priority).padStart(3)}|${(r.tpl.risk_level||'?').padEnd(8)}|${wit}|${(r.tpl.consent_type||'?').substring(0,30).padEnd(30)}|${(r.tpl.template_code||'?').substring(0,39).padEnd(39)}|${String(r.completeness).padStart(5)}|${r.missing.join(', ')||'(none)'}`
    );
  });

  // Per consent type aggregation (over distinct templates)
  const byType = new Map();
  for (const r of results) {
    const t = r.tpl.consent_type;
    if (!byType.has(t)) byType.set(t, { n: 0, sum: 0, miss: { patient_education:0,risks:0,benefits:0,alternatives:0,faq:0,understanding_questions:0 } });
    const e = byType.get(t);
    e.n++; e.sum += r.completeness;
    for (const m of r.missing) e.miss[m]++;
  }
  console.log('\n=== AGGREGATE BY CONSENT TYPE (distinct templates) ===\n');
  console.log('Consent type                          | N | Avg% | miss(PE|Risk|Ben|Alt|FAQ|UQ)');
  console.log('--------------------------------------+---+------+------------------------------');
  [...byType.entries()].sort((a,b) => (a[1].sum/a[1].n)-(b[1].sum/b[1].n)).forEach(([t,e]) => {
    console.log(`${t.padEnd(38)}|${String(e.n).padStart(3)}|${String(Math.round(e.sum/e.n)).padStart(5)} | ${e.miss.patient_education} | ${e.miss.risks} | ${e.miss.benefits} | ${e.miss.alternatives} | ${e.miss.faq} | ${e.miss.understanding_questions}`);
  });

  // Spot-check: dump section_keys + understanding-questions content sample
  console.log('\n=== SPOT CHECK: 12_questions_confirmation content (first template) ===');
  const sample = results[0]?.sections.find(s => /^12_questions_confirmation/i.test(s.section_key));
  if (sample) {
    console.log(`title_en: ${sample.title_en}`);
    console.log(`content_en (first 300 chars): ${(sample.content_en||'').substring(0,300)}`);
    console.log(`content_ar (first 300 chars): ${(sample.content_ar||'').substring(0,300)}`);
  } else { console.log('(not present)'); }

  fs.writeFileSync(path.join(__dirname, '__phase21_report_v2.json'), JSON.stringify(results.map(r => ({
    templateCode: r.tpl.template_code, consentType: r.tpl.consent_type, riskLevel: r.tpl.risk_level,
    requiresWitness: r.tpl.requires_witness, requiresGuardian: r.tpl.requires_guardian,
    tenantsWithCopy: r.tenantCount, completeness: r.completeness, priority: r.priority,
    missing: r.missing, detection: r.detection, sectionKeys: r.sections.map(s => s.section_key),
  })), null, 2));
  console.log('\nv2 report written to __phase21_report_v2.json');

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
