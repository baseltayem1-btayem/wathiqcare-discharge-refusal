// Mint a fresh signing token on the preview environment.
const BASE = 'https://wathiqcare.online';
const EMAIL = 'dr.ahmed@wathiqcare.med.sa';
const PASS = 'WathiqCare@2026';
const TARGET_MRN = 'IMC-2026-02000';
const PATIENT_EMAIL = `pilot.patient.preview.${Date.now()}@imc.med.sa`;
const PATIENT_MOBILE = '966543587772';

function parseSetCookie(header, name) {
  if (!header) return null;
  const parts = header.split(/, (?=[^;]+?=)/g);
  for (const p of parts) {
    const kv = p.split(';')[0];
    if (kv.startsWith(name + '=')) return kv;
  }
  return null;
}
async function api(method, url, body, cookie) {
  const headers = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const t = await r.text();
  let d = null;
  try { d = t ? JSON.parse(t) : null; } catch { d = { raw: t.slice(0, 300) }; }
  return { status: r.status, ok: r.ok, data: d, setCookie: r.headers.get('set-cookie') };
}

(async () => {
  const out = { base: BASE, patient: { email: PATIENT_EMAIL, mobile: PATIENT_MOBILE, mrn: TARGET_MRN } };

  const login = await api('POST', `${BASE}/api/auth/password/login`, { email: EMAIL, password: PASS });
  const cookie = parseSetCookie(login.setCookie, 'wathiqcare_access_token');
  out.login = { status: login.status, ok: login.ok };
  if (!login.ok || !cookie) {
    console.log(JSON.stringify({ ...out, error: 'login_failed', payload: login.data }, null, 2));
    return;
  }

  const templates = await api('GET', `${BASE}/api/modules/informed-consents/templates`, null, cookie);
  const tplList = Array.isArray(templates.data) ? templates.data : (templates.data?.templates || templates.data?.data || []);
  out.templateCount = tplList.length;
  // Prefer GENERAL_CONSENT consent_type
  const tpl =
    tplList.find((t) => t?.consentType === 'GENERAL_CONSENT') ||
    tplList.find((t) => t?.id) ||
    null;
  out.templateId = tpl?.id || null;
  out.templateCode = tpl?.templateCode || tpl?.code || null;
  out.templateConsentType = tpl?.consentType || null;
  if (!out.templateId) {
    console.log(JSON.stringify({ ...out, error: 'no_template', templatesStatus: templates.status, sample: tplList.slice(0, 3) }, null, 2));
    return;
  }

  const cases = await api('GET', `${BASE}/api/cases`, null, cookie);
  const caseList = Array.isArray(cases.data?.data) ? cases.data.data : (Array.isArray(cases.data) ? cases.data : cases.data?.cases || []);
  const c = caseList.find((x) => x?.medicalRecordNo === TARGET_MRN) || caseList.find((x) => x?.id) || null;
  out.caseId = c?.id || null;
  out.caseMrn = c?.medicalRecordNo || null;
  if (!out.caseId) {
    console.log(JSON.stringify({ ...out, error: 'no_case', casesStatus: cases.status, sample: caseList.slice(0, 3) }, null, 2));
    return;
  }

  const create = await api(
    'POST',
    `${BASE}/api/modules/informed-consents/documents`,
    {
      caseId: out.caseId,
      templateId: out.templateId,
      language: 'ar',
      metadata: { patientEmail: PATIENT_EMAIL, patientMobile: PATIENT_MOBILE },
    },
    cookie,
  );
  out.create = { status: create.status, ok: create.ok, error: create.data?.error || create.data?.message || null };
  out.documentId = create.data?.id || create.data?.document?.id || null;
  if (!create.ok || !out.documentId) {
    console.log(JSON.stringify({ ...out, error: 'create_failed', payload: create.data }, null, 2));
    return;
  }

  const dispatch = await api(
    'POST',
    `${BASE}/api/modules/informed-consents/documents/${encodeURIComponent(out.documentId)}/secure-signing`,
    { mobileNumber: PATIENT_MOBILE, recipientEmail: PATIENT_EMAIL },
    cookie,
  );
  out.dispatch = { status: dispatch.status, ok: dispatch.ok, error: dispatch.data?.error || dispatch.data?.message || null };
  out.workflow = dispatch.data?.workflow || dispatch.data || null;
  console.log(JSON.stringify(out, null, 2));
})();

