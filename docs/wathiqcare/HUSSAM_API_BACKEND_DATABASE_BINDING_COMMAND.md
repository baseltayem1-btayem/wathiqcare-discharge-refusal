# WathiqCare – أمر حسام لتنفيذ ربط جميع الأزرار والحقول والخصائص مع APIs / Backend / Database

## الهدف
تنفيذ مشروع شامل لربط وتفعيل جميع الأزرار، الحقول، البطاقات، القوائم، النوافذ، الشاشات الرئيسية والفرعية في Doctor Workspace الخاص بوحدة Informed Consents، بحيث لا تبقى أي خاصية مجرد واجهة ثابتة أو Placeholder.

## النطاق الإجباري
المسار الرئيسي:
- /modules/informed-consents

الصفحات الحالية التي يجب ربطها بالكامل:
1. Create Consent
2. Pending Consents
3. Consent Records
4. Approved Forms
5. Anesthesia Queue
6. Patient Education
7. Compliance Review
8. Audit Trail
9. Settings & Support

## قاعدة التنفيذ
ممنوع ترك أي عنصر UI بدون واحد من الآتي:
- API حقيقي
- Backend handler
- Database model/table
- حالة Loading / Error / Empty
- صلاحيات Role-Based Access Control
- Audit log
- Toast / confirmation feedback
- Validation للحقول
- ربط كامل بالحالة العملية للـ consent journey

---

# 1. Create Consent

## المطلوب ربطه
### Patient & Encounter
- Search patient
- Select patient
- Load encounter
- Select encounter
- Validate patient identity
- Validate MRN / Encounter ID
- Save draft consent case

### Consent Category
- Load approved categories from DB
- Select category
- Filter templates by category
- Save selected category

### Template Selection
- Load approved IMC templates from DB / manifest
- Preview PDF
- Select template
- Version lock
- Template governance check

### Procedure Details
- Procedure name
- Diagnosis
- Laterality
- Specialty
- Physician notes
- Required fields validation
- Save procedure details

### Anesthesia Decision
- Anesthesia applicable / not applicable
- Anesthesia type
- Trigger anesthesiologist workflow
- Create anesthesia review task
- Notify anesthesia queue

### Patient Education
- Load education packages
- Attach bilingual education material
- Mark as sent / acknowledged
- Save patient education record

### Physician Review
- Show full consent summary
- Missing fields checker
- Physician confirmation
- Submit for patient signing

### Send to Patient
- Mobile number
- Email
- Generate secure public link
- Send SMS OTP / link
- Send email
- Update patient-signature queue
- Audit send event

## Required APIs
- GET /api/modules/informed-consents/patients/search
- GET /api/modules/informed-consents/patients/{patientId}/encounters
- POST /api/modules/informed-consents/cases
- PATCH /api/modules/informed-consents/cases/{caseId}
- GET /api/modules/informed-consents/categories
- GET /api/modules/informed-consents/templates
- GET /api/modules/informed-consents/templates/{templateId}
- POST /api/modules/informed-consents/cases/{caseId}/procedure
- POST /api/modules/informed-consents/cases/{caseId}/anesthesia-decision
- POST /api/modules/informed-consents/cases/{caseId}/education
- POST /api/modules/informed-consents/cases/{caseId}/physician-review
- POST /api/modules/informed-consents/cases/{caseId}/send

---

# 2. Pending Consents

## Cards to bind
### Awaiting Patient Signature
- Load all consents pending patient action
- Resend link
- Cancel link
- View public link status
- OTP attempts
- Expiry status

### Physician Review Pending
- Load consents requiring physician completion
- Open case
- Continue review
- Show missing fields

### Send Reminder
- Trigger SMS reminder
- Trigger email reminder
- Audit reminder event
- Throttle reminders to avoid abuse

## Required APIs
- GET /api/modules/informed-consents/pending
- GET /api/modules/informed-consents/pending/patient-signature
- GET /api/modules/informed-consents/pending/physician-review
- POST /api/modules/informed-consents/cases/{caseId}/reminder
- POST /api/modules/informed-consents/cases/{caseId}/resend-link
- POST /api/modules/informed-consents/cases/{caseId}/cancel-link

---

# 3. Consent Records

## Cards to bind
### Signed Records
- List completed signed consents
- Open signed PDF
- Download patient copy
- Download hospital copy

### Evidence Package
- Generate evidence package
- Include audit log
- Include OTP log
- Include signature events
- Include patient acknowledgement

### Search Archive
- Search by MRN
- Search by patient name
- Search by encounter
- Search by physician
- Search by date range
- Search by template

## Required APIs
- GET /api/modules/informed-consents/records
- GET /api/modules/informed-consents/records/search
- GET /api/modules/informed-consents/records/{caseId}
- GET /api/modules/informed-consents/records/{caseId}/pdf
- GET /api/modules/informed-consents/records/{caseId}/evidence-package
- POST /api/modules/informed-consents/records/{caseId}/export

---

# 4. Approved Forms

## Cards to bind
### General Surgery Forms
- Load approved general surgery templates
- Filter by specialty
- Preview PDF
- Show version
- Show approval date

### Anesthesia Forms
- Load anesthesia consent templates
- Preview approved anesthesia references
- Show controlled version

### Template Governance
- Approved / Draft / Retired status
- Version history
- Approval owner
- Legal approval date
- Clinical approval date

## Required APIs
- GET /api/modules/informed-consents/forms
- GET /api/modules/informed-consents/forms?category=general-surgery
- GET /api/modules/informed-consents/forms?category=anesthesia
- GET /api/modules/informed-consents/forms/{formId}
- GET /api/modules/informed-consents/forms/{formId}/versions
- GET /api/modules/informed-consents/forms/{formId}/preview

---

# 5. Anesthesia Queue

## Cards to bind
### Queued Reviews
- List cases awaiting anesthesia review
- Assign anesthesiologist
- Open same consent case
- Complete anesthesia section

### Completed Reviews
- List completed anesthesia reviews
- Return to physician
- Show reviewer name and timestamp

### Clinical Controls
- Block case until anesthesia completed
- Release case after anesthesia completion
- Audit all clinical decision events

## Required APIs
- GET /api/modules/informed-consents/anesthesia/queue
- GET /api/modules/informed-consents/anesthesia/completed
- POST /api/modules/informed-consents/cases/{caseId}/anesthesia/assign
- POST /api/modules/informed-consents/cases/{caseId}/anesthesia/complete
- POST /api/modules/informed-consents/cases/{caseId}/anesthesia/release
- POST /api/modules/informed-consents/cases/{caseId}/anesthesia/block

---

# 6. Patient Education

## Cards to bind
### Education Library
- Load approved education resources
- Filter by procedure
- Filter by language
- Preview material

### Patient Materials
- Attach material to consent case
- Send material to patient
- Track viewed / acknowledged

### Completion Status
- Show education pending
- Show viewed
- Show acknowledged
- Block sending if required education missing

## Required APIs
- GET /api/modules/informed-consents/education/library
- GET /api/modules/informed-consents/education/materials
- POST /api/modules/informed-consents/cases/{caseId}/education/attach
- POST /api/modules/informed-consents/cases/{caseId}/education/send
- GET /api/modules/informed-consents/cases/{caseId}/education/status

---

# 7. Compliance Review

## Cards to bind
### Readiness Score
- Calculate case readiness
- Required fields completion percentage
- Legal readiness
- Clinical readiness

### Missing Items
- List missing fields
- List missing documents
- List missing approvals
- Link each missing item to the exact step

### Legal Controls
- Verify template version
- Verify patient signature readiness
- Verify witness requirement
- Verify Arabic/English availability
- Verify audit evidence completeness

## Required APIs
- GET /api/modules/informed-consents/cases/{caseId}/compliance
- GET /api/modules/informed-consents/cases/{caseId}/compliance/readiness
- GET /api/modules/informed-consents/cases/{caseId}/compliance/missing-items
- GET /api/modules/informed-consents/cases/{caseId}/compliance/legal-controls

---

# 8. Audit Trail

## Cards to bind
### Activity Timeline
- Case created
- Patient selected
- Template selected
- Procedure completed
- Anesthesia decision
- Education sent
- Link sent
- OTP verified
- Patient signed
- Final PDF generated

### Signature Evidence
- Patient signature event
- Witness signature event
- Physician signature event
- IP address
- Device metadata
- Timestamp
- OTP verification status

### Export Audit
- Export CSV
- Export PDF
- Export evidence package
- Include hash / verification code

## Required APIs
- GET /api/modules/informed-consents/audit
- GET /api/modules/informed-consents/cases/{caseId}/audit
- GET /api/modules/informed-consents/cases/{caseId}/signature-evidence
- GET /api/modules/informed-consents/cases/{caseId}/audit/export
- POST /api/modules/informed-consents/audit/log

---

# 9. Settings & Support

## Cards to bind
### Legal Support
- Open legal consultation request
- Select case
- Enter legal question
- Attach consent case
- Submit ticket
- Track status

### Technical Ticket
- Report platform issue
- Attach screenshot
- Attach case ID
- Priority
- Submit technical ticket

### Workspace Settings
- Language preference
- Notification preference
- Role and access display
- Specialty
- Default department
- Save preferences

## Required APIs
- POST /api/modules/informed-consents/support/legal
- POST /api/modules/informed-consents/support/technical
- GET /api/modules/informed-consents/settings
- PATCH /api/modules/informed-consents/settings
- GET /api/modules/informed-consents/me
- GET /api/modules/informed-consents/notifications

---

# Database Models Required

## ConsentCase
- id
- patientId
- encounterId
- templateId
- categoryId
- status
- physicianId
- department
- specialty
- procedureName
- diagnosis
- laterality
- anesthesiaApplicable
- anesthesiaStatus
- educationStatus
- patientSignatureStatus
- complianceStatus
- createdAt
- updatedAt

## ConsentTemplate
- id
- titleEn
- titleAr
- category
- specialty
- version
- status
- pdfUrl
- approvedByLegal
- approvedByClinical
- approvedAt
- retiredAt

## ConsentEducation
- id
- caseId
- materialId
- language
- sentAt
- viewedAt
- acknowledgedAt
- status

## ConsentAuditEvent
- id
- caseId
- userId
- role
- eventType
- eventLabel
- metadata
- ipAddress
- userAgent
- createdAt

## ConsentSignatureEvidence
- id
- caseId
- signerType
- signerName
- signerId
- otpVerified
- ipAddress
- deviceMetadata
- signatureUrl
- signedAt

## ConsentSupportTicket
- id
- caseId
- type
- subject
- description
- priority
- status
- createdBy
- assignedTo
- createdAt
- updatedAt

## ConsentWorkspaceSettings
- id
- userId
- language
- defaultDepartment
- defaultSpecialty
- notificationsEnabled
- createdAt
- updatedAt

---

# Acceptance Criteria

## يجب ألا يتم قبول التسليم إلا إذا تحقق الآتي
1. كل زر يعمل ويرسل أو يستقبل بيانات من API.
2. كل حقل له state + validation + save behavior.
3. كل بطاقة Dashboard تسحب بيانات حقيقية أو تعرض Empty State واضح.
4. كل إجراء مهم يسجل في Audit Trail.
5. كل صفحة فيها Loading / Error / Empty states.
6. جميع الروابط في Sidebar وHeader تعمل.
7. Search patients مربوط ببيانات حقيقية.
8. Language toggle يعمل عربي / إنجليزي.
9. Notifications icon مربوط.
10. User profile menu مربوط.
11. Approved Forms تسحب نماذج معتمدة فقط.
12. Anesthesia Queue مربوطة بنفس consent case وليس workflow منفصل.
13. Patient Education مربوطة بإقرار المريض قبل الإرسال.
14. Compliance Review يقرأ حالة consent case الفعلية.
15. Audit Trail قابل للتصدير.
16. Settings & Support ترسل طلبات حقيقية.
17. لا يوجد Placeholder أو mock data في production.
18. كل API محمي بالصلاحيات.
19. كل عملية تعديل محفوظة في DB.
20. Smoke test على production بعد النشر.

---

# تعليمات التنفيذ لحسام

ابدأ بمراجعة جميع ملفات:
- apps/web/src/components/informed-consents
- apps/web/src/app/modules/informed-consents
- apps/web/src/app/api/modules/informed-consents
- prisma/schema.prisma

ثم نفذ الآتي:
1. اعمل inventory لكل button/input/select/card/modal/page.
2. اربط كل عنصر بـ API endpoint واضح.
3. أنشئ أو عدل backend routes اللازمة.
4. عدل Prisma schema إذا كانت الجداول ناقصة.
5. أضف migrations.
6. أضف service layer موحد.
7. أضف audit logging helper.
8. أضف validation schemas.
9. أضف loading/error/empty states.
10. أضف RBAC.
11. نفذ build.
12. انشر production.
13. نفذ smoke verification على https://wathiqcare.online/modules/informed-consents.

