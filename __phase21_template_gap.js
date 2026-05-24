// Phase 2.1 — Patient Education Gap Analysis (READ ONLY)
// Connects to prod DB, enumerates ACTIVE/PUBLISHED templates,
// detects 6 patient-facing sections per template, and ranks by risk priority.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load DATABASE_URL from .env.vercel.prod.readonly
const envPath = path.join(__dirname, '.env.vercel.prod.readonly');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) env[m[1]] = m[2];
}
const url = env.DATABASE_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

// Section detectors. Keys are matched case-insensitively against sectionKey OR titleAr/titleEn OR contentAr/contentEn substrings.
const DETECTORS = {
  patient_education: {
    keys: ['patient_education', 'education', 'patient-education', 'patient_info', 'overview', 'about_procedure', 'about-procedure', 'introduction', 'description'],
    ar:   ['تثقيف', 'تعريف', 'شرح', 'وصف الإجراء', 'معلومات للمريض', 'نظرة عامة'],
    en:   ['patient education', 'overview', 'about the procedure', 'about procedure', 'introduction', 'description of', 'what is']
  },
  risks: {
    keys: ['risk', 'risks', 'side_effect', 'side-effects', 'complication'],
    ar:   ['المخاطر', 'مخاطر', 'الأعراض الجانبية', 'مضاعفات'],
    en:   ['risks', 'side effects', 'complications', 'adverse']
  },
  benefits: {
    keys: ['benefit', 'benefits', 'expected_outcome', 'outcome', 'goal', 'purpose'],
    ar:   ['الفوائد', 'فوائد', 'النتائج المتوقعة', 'الهدف', 'الغرض'],
    en:   ['benefits', 'expected outcome', 'expected outcomes', 'purpose', 'goal of', 'why this']
  },
  alternatives: {
    keys: ['alternative', 'alternatives', 'other_option', 'alternatives_to'],
    ar:   ['البدائل', 'بدائل', 'خيارات أخرى'],
    en:   ['alternatives', 'other options', 'alternative treatment']
  },
  faq: {
    keys: ['faq', 'frequently_asked', 'questions_answers', 'q_and_a', 'qna'],
    ar:   ['الأسئلة الشائعة', 'أسئلة متكررة', 'أسئلة وأجوبة'],
    en:   ['faq', 'frequently asked', 'questions and answers', 'q&a']
  },
  understanding_questions: {
    keys: ['understanding', 'comprehension', 'understanding_questions', 'understanding_check', 'comprehension_check', 'quiz'],
    ar:   ['أسئلة الفهم', 'تأكد من فهمك', 'اختبار الفهم'],
    en:   ['understanding questions', 'comprehension check', 'check your understanding', 'do you understand']
  },
};

function detect(sections, version, detector) {
  const haystack = (s) => (s || '').toLowerCase();
  for (const s of sections) {
    const k = haystack(s.section_key);
    const ta = haystack(s.title_ar);
    const te = haystack(s.title_en);
    const ca = haystack(s.content_ar);
    const ce = haystack(s.content_en);
    if (detector.keys.some(x => k.includes(x.toLowerCase()))) return { found: true, via: `section_key=${s.section_key}` };
    if (detector.en.some(x => te.includes(x.toLowerCase()) || ce.includes(x.toLowerCase()))) return { found: true, via: `en_match in section ${s.section_key}` };
    if (detector.ar.some(x => ta.includes(x) || ca.includes(x))) return { found: true, via: `ar_match in section ${s.section_key}` };
  }
  // Fall back to version-level legal text / metadata.json
  const legal = haystack(version.legal_text_en) + ' ' + haystack(version.legal_text_ar);
  if (detector.en.some(x => legal.includes(x.toLowerCase()))) return { found: true, via: 'legal_text' };
  if (detector.ar.some(x => legal.includes(x))) return { found: true, via: 'legal_text' };
  return { found: false, via: null };
}

const RISK_PRIORITY = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, MINIMAL: 1 };

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Active templates with their CURRENT version (or latest PUBLISHED if no currentVersionId)
  const tplRes = await c.query(`
    SELECT t.id, t.tenant_id, t.template_code, t.consent_type, t.specialty, t.department,
           t.risk_level, t.requires_witness, t.requires_guardian, t.status,
           t.current_version_id, t.title_en, t.title_ar
    FROM consent_templates t
    WHERE t.status = 'PUBLISHED' OR t.status = 'ACTIVE'
    ORDER BY t.consent_type, t.template_code
  `).catch(async (e) => {
    // status enum may differ
    return await c.query(`
      SELECT t.id, t.tenant_id, t.template_code, t.consent_type, t.specialty, t.department,
             t.risk_level, t.requires_witness, t.requires_guardian, t.status::text AS status,
             t.current_version_id, t.title_en, t.title_ar
      FROM consent_templates t
      ORDER BY t.consent_type, t.template_code
    `);
  });

  console.log(`Total templates pulled: ${tplRes.rows.length}`);

  const out = [];
  for (const t of tplRes.rows) {
    // Pick the current version, else the latest version (highest version_number)
    let vRes;
    if (t.current_version_id) {
      vRes = await c.query(`SELECT * FROM consent_template_versions WHERE id = $1`, [t.current_version_id]);
    }
    if (!vRes || vRes.rows.length === 0) {
      vRes = await c.query(
        `SELECT * FROM consent_template_versions WHERE template_id = $1 ORDER BY version_number DESC NULLS LAST LIMIT 1`,
        [t.id]
      );
    }
    const v = vRes.rows[0];
    if (!v) {
      out.push({ tpl: t, version: null, sections: [], detection: {}, completeness: 0, missing: ['(no version)'] });
      continue;
    }
    const sRes = await c.query(
      `SELECT id, section_key, section_kind::text AS section_kind, title_ar, title_en, content_ar, content_en, sort_order
       FROM consent_template_sections WHERE template_version_id = $1 ORDER BY sort_order ASC`,
      [v.id]
    );
    const detection = {};
    let hits = 0;
    for (const [name, det] of Object.entries(DETECTORS)) {
      const r = detect(sRes.rows, v, det);
      detection[name] = r;
      if (r.found) hits++;
    }
    const completeness = Math.round((hits / Object.keys(DETECTORS).length) * 100);
    const missing = Object.entries(detection).filter(([, r]) => !r.found).map(([n]) => n);
    out.push({ tpl: t, version: v, sections: sRes.rows, detection, completeness, missing });
  }

  // Priority score: risk_level weight * gap fraction * (1.5 if witness/guardian required)
  for (const r of out) {
    const gap = 1 - (r.completeness / 100);
    const w = RISK_PRIORITY[(r.tpl.risk_level || 'MEDIUM').toUpperCase()] || 3;
    const witnessBoost = (r.tpl.requires_witness || r.tpl.requires_guardian) ? 1.5 : 1.0;
    r.priority = Math.round(w * 100 * gap * witnessBoost);
  }

  // Sort: by priority DESC, then risk_level rank DESC, then completeness ASC
  out.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const ra = RISK_PRIORITY[(a.tpl.risk_level || 'MEDIUM').toUpperCase()] || 3;
    const rb = RISK_PRIORITY[(b.tpl.risk_level || 'MEDIUM').toUpperCase()] || 3;
    if (rb !== ra) return rb - ra;
    return a.completeness - b.completeness;
  });

  console.log('\n=== PHASE 2.1: PATIENT EDUCATION GAP ANALYSIS ===\n');
  console.log('Rank | Pri | Risk     | Wit | Type                          | Code                          | Specialty               | Cmpl% | Missing');
  console.log('-----+-----+----------+-----+-------------------------------+-------------------------------+-------------------------+-------+---------------------------------------');
  out.forEach((r, i) => {
    const rank = String(i + 1).padStart(4);
    const pri  = String(r.priority).padStart(3);
    const risk = (r.tpl.risk_level || '?').padEnd(8);
    const wit  = (r.tpl.requires_witness ? 'W' : ' ') + (r.tpl.requires_guardian ? 'G' : ' ');
    const typ  = (r.tpl.consent_type || '?').substring(0, 29).padEnd(29);
    const cod  = (r.tpl.template_code || '?').substring(0, 29).padEnd(29);
    const spc  = (r.tpl.specialty || '?').substring(0, 23).padEnd(23);
    const cmp  = String(r.completeness).padStart(5);
    const mis  = r.missing.join(', ') || '(none)';
    console.log(`${rank} | ${pri} | ${risk} |  ${wit} | ${typ} | ${cod} | ${spc} | ${cmp} | ${mis}`);
  });

  // Aggregate: completeness per consent type
  const byType = new Map();
  for (const r of out) {
    const t = r.tpl.consent_type || 'UNKNOWN';
    if (!byType.has(t)) byType.set(t, { total: 0, sum: 0, missing: { patient_education: 0, risks: 0, benefits: 0, alternatives: 0, faq: 0, understanding_questions: 0 }, worst: 100 });
    const e = byType.get(t);
    e.total++;
    e.sum += r.completeness;
    e.worst = Math.min(e.worst, r.completeness);
    for (const m of r.missing) if (e.missing[m] != null) e.missing[m]++;
  }
  console.log('\n=== AGGREGATE BY CONSENT TYPE ===\n');
  console.log('Consent type                   | #Tpls | Avg% | Worst% | PE  Risk Ben  Alt  FAQ  UQ  (templates missing section)');
  console.log('-------------------------------+-------+------+--------+----------------------------------------------------');
  const sortedTypes = [...byType.entries()].sort((a, b) => (a[1].sum / a[1].total) - (b[1].sum / b[1].total));
  for (const [t, e] of sortedTypes) {
    const avg = Math.round(e.sum / e.total);
    console.log(
      `${t.padEnd(30)} | ${String(e.total).padStart(5)} | ${String(avg).padStart(4)} | ${String(e.worst).padStart(6)} | ` +
      `${String(e.missing.patient_education).padStart(3)} ${String(e.missing.risks).padStart(4)} ${String(e.missing.benefits).padStart(4)} ${String(e.missing.alternatives).padStart(4)} ${String(e.missing.faq).padStart(4)} ${String(e.missing.understanding_questions).padStart(3)}`
    );
  }

  // Summary stats
  const totalTpls = out.length;
  const avgComp = Math.round(out.reduce((a, b) => a + b.completeness, 0) / totalTpls);
  const fullyComplete = out.filter(r => r.completeness === 100).length;
  const zero = out.filter(r => r.completeness === 0).length;
  console.log(`\nTotals: ${totalTpls} active templates, avg completeness ${avgComp}%, fully complete: ${fullyComplete}, zero-completeness: ${zero}`);

  // Dump JSON report
  const jsonPath = path.join(__dirname, '__phase21_report.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalTemplates: totalTpls,
    averageCompleteness: avgComp,
    perTemplate: out.map(r => ({
      tenantId: r.tpl.tenant_id,
      templateId: r.tpl.id,
      templateCode: r.tpl.template_code,
      consentType: r.tpl.consent_type,
      specialty: r.tpl.specialty,
      department: r.tpl.department,
      titleEn: r.tpl.title_en,
      titleAr: r.tpl.title_ar,
      riskLevel: r.tpl.risk_level,
      requiresWitness: r.tpl.requires_witness,
      requiresGuardian: r.tpl.requires_guardian,
      status: r.tpl.status,
      versionId: r.version?.id,
      versionLabel: r.version?.version_label,
      sectionCount: r.sections.length,
      sectionKeys: r.sections.map(s => s.section_key),
      detection: r.detection,
      completeness: r.completeness,
      missing: r.missing,
      priority: r.priority,
    }))
  }, null, 2));
  console.log(`\nReport written to ${jsonPath}`);

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
