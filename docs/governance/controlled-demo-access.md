# Controlled Demo Access

This environment uses controlled demo-only accounts for module validation. Do not use demo credentials for real patient data.

## Login Identifiers

- Bootstrap superadmin: `admin@wathiqcare.online`
- Bootstrap platform admin: `admin@wathiqcare.med.sa`
- Demo platform admin: `demo.platform.admin@wathiqcare.local`
- Demo legal affairs: `demo.legal.affairs@demo-imc.local`
- Demo doctor: `demo.doctor@demo-imc.local`
- Demo nurse: `demo.nurse@demo-imc.local`
- Demo medical director: `demo.medical.director@demo-imc.local`
- Demo quality/compliance: `demo.compliance@demo-imc.local`
- Demo finance/authorized admin: `demo.finance@demo-imc.local`

## Demo Roles

- Platform Admin: platform-wide access to all modules and system administration.
- Legal Affairs User: tenant-scoped access to all medico-legal modules.
- Doctor User: informed consents and discharge refusal.
- Nurse User: informed consents and discharge refusal.
- Medical Director User: informed consents and discharge refusal governance workflows.
- Quality / Compliance User: audit, governance, informed consents, promissory notes, and discharge refusal review.
- Finance / Authorized Admin User: electronic promissory notes only.

## Module Access Matrix

- Informed Consents: Platform Admin, Legal Affairs, Doctor, Nurse, Medical Director, Quality / Compliance.
- Electronic Promissory Notes: Platform Admin, Legal Affairs, Quality / Compliance, Finance / Authorized Admin.
- Discharge Refusal: Platform Admin, Legal Affairs, Doctor, Nurse, Medical Director, Quality / Compliance.

## Password Handling

- Demo accounts are provisioned with temporary controlled passwords for validation only.
- Demo accounts are provisioned in a login-ready state for role validation runs.
- Password values are not published in repository documentation or the demo credentials UI.

## Security Notes

- Do not use demo credentials for real patient data.
- All demo patient names, MRNs, and identifiers must remain explicitly marked `DEMO`.
- Rotate or disable demo accounts before full production rollout.
- Public signup remains disabled. Demo access is provisioned by controlled scripts or platform administrators only.
