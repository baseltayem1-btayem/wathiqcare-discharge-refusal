# ALL IMC Physicians — Pilot Provisioning Report

**Date:** 2026-06-30T03:00:41.802Z  
**Environment:** Production (`https://wathiqcare.online`)  
**Tenant:** IMC Hospital (`imc`)  
**Source:** https://www.imc.med.sa/ar/doctors  
**Status:** ✅ Complete

---

## 1. Scope

Provision pilot login accounts for every physician discovered in the public IMC doctors directory, across all departments — not limited to General Surgery.

---

## 2. Dataset Discovery

| Metric | Value |
|--------|-------|
| Total pages detected | 22 (pages 0–21) |
| Pages successfully fetched | 21 |
| Pages skipped (server error) | 1 (page 17 returned HTTP 500) |
| Total physicians discovered | 243 |
| Duplicate slugs/emails deduplicated | 0 |

---

## 3. Provisioning Summary

| Metric | Count |
|--------|-------|
| Physicians discovered | 243 |
| Accounts created | 237 |
| Accounts updated (already existed) | 6 |
| Accounts skipped | 0 |
| Duplicate accounts | 0 |
| **Total accounts in tenant `imc`** | 243 |

---

## 4. Password Security

- Temporary passwords are **16+ characters** with uppercase, lowercase, numbers, and symbols.
- Passwords hashed with **bcrypt (12 rounds)** — production mechanism in `apps/web/src/lib/server/password.ts`.
- **No plaintext passwords stored in the database.**
- `password_reset_required = TRUE` and `last_password_changed_at = NULL` force a reset on first login.
- `mfa_enabled = FALSE` and `mfa_required = FALSE` for the pilot.

---

## 5. Per-Physician Data Stored

For each account the following are stored in `TenantMembership.metadata`:

- Arabic full name (`nameAr`)
- Arabic specialty (`specialtyAr`)
- Arabic department (`departmentAr`)
- IMC profile URL (`profileUrl`)
- IMC photo URL (`photoUrl`)
- Designation / qualifications (`designation`)
- Pilot flag (`pilot: true`)

---

## 6. Department Summary

| Department (AR) | Department (EN) | Count |
|-----------------|-----------------|-------|
| Unknown | Unknown | 41 |
| مركز صحة المرأة | مركز صحة المرأة | 17 |
| مركز صحة الطفل | مركز صحة الطفل | 14 |
| مركز صحة العظام والعضلات | مركز صحة العظام والعضلات | 13 |
| قسم الجراحة | Department of Surgery | 12 |
| قسم طب الأمراض الباطنية | قسم طب الأمراض الباطنية | 11 |
| قسم طب الأسرة | قسم طب الأسرة | 8 |
| قسم جراحة الأنف والأذن والحنجرة و جراحة الرأس والرقبة | ENT & Head and Neck Surgery | 5 |
| قسم طب الاسرة | قسم طب الاسرة | 5 |
| مركز طب وجراحة العيون | مركز طب وجراحة العيون | 5 |
| مركز صحة القلب | مركز صحة القلب | 5 |
| مركز علاج الألم | مركز علاج الألم | 4 |
| قسم الأمراض العصبية | قسم الأمراض العصبية | 4 |
| مركز التصوير والأشعة الطبي | مركز التصوير والأشعة الطبي | 4 |
| مركز طب الأورام | مركز طب الأورام | 4 |
| قسم الطب النفسي | قسم الطب النفسي | 4 |
| قسم الأمراض الصدرية واضطرابات النوم | قسم الأمراض الصدرية واضطرابات النوم | 4 |
| طب أمراض الجهاز الهضمي والكبد والمناظير | طب أمراض الجهاز الهضمي والكبد والمناظير | 4 |
| جراحة المسالك البولية وأمراض الذكورة | جراحة المسالك البولية وأمراض الذكورة | 3 |
| طب جراحة المسالك البولية وأمراض الذكورة | طب جراحة المسالك البولية وأمراض الذكورة | 3 |
| قسم جراحة المخ والأعصاب | Neurosurgery | 3 |
| قسم الجراحة العامة | General Surgery Department | 3 |
| قسم الطوارئ | Emergency Medicine | 3 |
| مركز علاج السكري وأمراض الغدد الصمّاء | مركز علاج السكري وأمراض الغدد الصمّاء | 3 |
| قسم طب التخدير | قسم طب التخدير | 3 |
| جراحة الأطفال | جراحة الأطفال | 2 |
| &nbsp; | &nbsp; | 2 |
| قسم طب الطوارئ | قسم طب الطوارئ | 2 |
| قسم طب الأعصاب | قسم طب الأعصاب | 1 |
| قسم طب الأمراض الباطنية&nbsp; | قسم طب الأمراض الباطنية&nbsp; | 1 |
| استشاري أمراض الجهاز الهضمي&nbsp; | استشاري أمراض الجهاز الهضمي&nbsp; | 1 |
| شيخوخة و رعاية تلطيفية | شيخوخة و رعاية تلطيفية | 1 |
| جراحة عظام الأطراف العلوية وجراحة اليد، جراحة الكتف والكوع واليد | جراحة عظام الأطراف العلوية وجراحة اليد، جراحة الكتف والكوع واليد | 1 |
| العناية المركزة | العناية المركزة | 1 |
| استشارية أمراض المسالك البولية النسائية والجراحة التجميلية والترميمية النسائية | استشارية أمراض المسالك البولية النسائية والجراحة التجميلية والترميمية النسائية | 1 |
| استشاري الطب الباطني | استشاري الطب الباطني | 1 |
| أخصائية في طب الأطفال | أخصائية في طب الأطفال | 1 |
| طب الأمراض الباطنية العامة | طب الأمراض الباطنية العامة | 1 |
| الرئيس التنفيذي للشؤون الخارجية | الرئيس التنفيذي للشؤون الخارجية | 1 |
| أخصائي في طب التخدير | أخصائي في طب التخدير | 1 |
| استشاري طب الأسرة | استشاري طب الأسرة | 1 |
| قسم التصوير الطبي والأشعة | قسم التصوير الطبي والأشعة | 1 |
| جراحة التجميل | جراحة التجميل | 1 |
| استشاري العناية المركزة وأمراض الكلى | استشاري العناية المركزة وأمراض الكلى | 1 |
| استشاري طب الباطنة والأورام | استشاري طب الباطنة والأورام | 1 |
| قسم صحة الطفل | قسم صحة الطفل | 1 |
| وطب الأمومة و الأجنة والحمل الحرج | وطب الأمومة و الأجنة والحمل الحرج | 1 |
| وحدة الإخصاب والذكورة وأطفال الأنابيب | وحدة الإخصاب والذكورة وأطفال الأنابيب | 1 |
| جراحة الأنف والأذن والحنجرة و جراحة الرأس والرقبة | جراحة الأنف والأذن والحنجرة و جراحة الرأس والرقبة | 1 |
| طب الأسرة | طب الأسرة | 1 |
| مركز الأورام | مركز الأورام | 1 |
| قسم أمراض الكلى | قسم أمراض الكلى | 1 |
| استشاري جراحة المخ والأعصاب | استشاري جراحة المخ والأعصاب | 1 |
| استشاري طب الأطفال | استشاري طب الأطفال | 1 |
| استشاري طب وجراحة العيون و جراحات القرنية والمياه البيضاء وجراحات تصحيح النظر&nbsp; | استشاري طب وجراحة العيون و جراحات القرنية والمياه البيضاء وجراحات تصحيح النظر&nbsp; | 1 |
| قسم طب المسالك البولية | قسم طب المسالك البولية | 1 |
| مركز التصوير و الأشعة الطبي | مركز التصوير و الأشعة الطبي | 1 |
| أمراض داء الأمعاء الالتهابي&nbsp; | أمراض داء الأمعاء الالتهابي&nbsp; | 1 |
| استشاري طب الأمراض الباطنية | استشاري طب الأمراض الباطنية | 1 |
| جراحة الكتف والركبة | جراحة الكتف والركبة | 1 |
| استشاري علاج الأورام النسائية والمناظير | استشاري علاج الأورام النسائية والمناظير | 1 |
| مركز صحة الأطفال | مركز صحة الأطفال | 1 |
| استشاري أمراض الكلى | استشاري أمراض الكلى | 1 |
| طب الأنف والأذن والحنجرة وجراحة الرأس والرقبة | طب الأنف والأذن والحنجرة وجراحة الرأس والرقبة | 1 |
| مركز طب وجراحة الأسنان | مركز طب وجراحة الأسنان | 1 |
| قسم جراحة الأنف والأذن والحنجرة وجراحة الرأس والرقبة | قسم جراحة الأنف والأذن والحنجرة وجراحة الرأس والرقبة | 1 |
| قسم صحة المرأة | قسم صحة المرأة | 1 |
| قسم الأمراض المعدية | قسم الأمراض المعدية | 1 |
| الطب الباطني | الطب الباطني | 1 |
| طب المختبر وعلم الأمراض | طب المختبر وعلم الأمراض | 1 |
| أورام النساء والمناظير والروبوت | أورام النساء والمناظير والروبوت | 1 |
| قسم الأمراض الجلدية | قسم الأمراض الجلدية | 1 |
| رئيس قسم الأمراض العصبية | رئيس قسم الأمراض العصبية | 1 |
| طب الامومه والأجنه والحمل الحرج والحمل منخفض الخطورة | طب الامومه والأجنه والحمل الحرج والحمل منخفض الخطورة | 1 |
| رئيسة قسم طب الأمراض الصدرية و النوم | رئيسة قسم طب الأمراض الصدرية و النوم | 1 |
| قسم علم النفس | قسم علم النفس | 1 |
| مدير وحدة الأبحاث في قسم الطب الباطني | مدير وحدة الأبحاث في قسم الطب الباطني | 1 |
| قسم جراحة الصدر | Thoracic Surgery | 1 |
| طب التخدير | طب التخدير | 1 |
| جراحة اليد والجراحة المجهرية الترميمية | جراحة اليد والجراحة المجهرية الترميمية | 1 |

---

## 7. Deliverables

- `docs/release/ALL_IMC_DOCTOR_CREDENTIALS.md` — temporary credentials (secure distribution)
- `docs/release/ALL_IMC_PHYSICIANS_PROVISIONING_REPORT.md` — this report
- `scripts/provision-all-imc-physicians.mjs` — reproducible provisioning script
- `scripts/scrape-imc-doctors.mjs` — source dataset scraper
- `scripts/data/all-imc-doctors.json` — structured source dataset

---

## 8. Restrictions Observed

- No UI changes.
- No application deployment or production promotion.
- No automatic emails sent.
- No plaintext passwords stored in the DB.
- No git history mutations.

---

## 9. Next Steps

1. Distribute `docs/release/ALL_IMC_DOCTOR_CREDENTIALS.md` to the physicians securely.
2. Have each physician log in at `https://wathiqcare.online/login` and reset their temporary password.
3. Delete `docs/release/ALL_IMC_DOCTOR_CREDENTIALS.md` once first-logins are complete.
