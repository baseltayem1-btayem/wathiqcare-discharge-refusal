# Wathiq Care UI Template Selection Rules

Status: Active (Mandatory)
Effective date: 2026-03-13
Applies to: Any new base template, admin kit, layout system, or major UI component suite

## 1) Purpose

Ensure any selected UI template/layout is fully compliant with Wathiq Care architecture, healthcare workflow, scalability, and licensing constraints before implementation starts.

## 2) Hard Eligibility Requirements (Fail-Fast)

A candidate template is immediately rejected if any item below is not satisfied:

1. Native Angular architecture support (Angular only).
2. No React, no Vue, no static HTML template adoption unless wrapped in fully supported Angular architecture.
3. Proven bilingual support model for Arabic and English.
4. Native RTL support for Arabic and LTR support for English.
5. No dependency on direction-specific hacks as primary RTL method.
6. Commercially valid license for internal hospital deployment.
7. Supports future module expansion without architectural lock-in.

## 3) Mandatory Capability Checklist

The base layout/template MUST support all of the following:
- Sidebar navigation
- Modular dashboards
- Data tables
- Reactive forms
- Modal dialogs
- Alerts/notifications
- Charts/statistics
- Role-based layout adaptability
- Document/file upload/download
- Media/educational content display

Any missing capability is a NO-GO unless a documented Angular-native extension plan is approved before implementation.

## 4) Architecture and Stack Conformance

Accepted candidates SHALL align with:
- Angular routing
- Angular reactive forms
- Modular Angular architecture
- RTL/LTR switching
- i18n-ready structure
- Tablet-friendly responsive design
- Healthcare workflow usability first

## 5) Scalability and Maintainability Requirements

Template choice MUST:
- Allow domain-based module growth without shell rewrite
- Support route-level and feature-level decomposition
- Keep styling/theming maintainable for long-term product evolution
- Avoid proprietary constraints that prevent replacement or extension

## 6) Healthcare Workflow Suitability Requirements

Template choice MUST support:
- Dense, form-heavy user journeys
- Case management timelines and status indicators
- Safe display of medical/legal workflow context
- Fast navigation between related workflow tasks
- High clarity for alerts, escalations, and critical actions

## 7) Responsive and Tablet Requirements

Candidate templates MUST prove usability on tablet and desktop:
- Navigation remains functional
- Forms remain readable and operable
- Tables remain usable with filters/sorting/pagination
- Dialogs and action areas remain accessible on touch devices

## 8) Licensing and Compliance Requirements

Before approval, provide:
- License type and version (SPDX)
- Commercial-use confirmation
- Internal hospital deployment rights confirmation
- Third-party dependency license list
- Confirmation of no copyleft or usage clauses that conflict with organizational policy

If licensing is unclear, reject until clarified.

## 9) Evaluation Workflow (Required Before Coding)

1. Create candidate dossier (architecture, capabilities, i18n/RTL, responsive proof, licensing).
2. Run fail-fast check against Section 2.
3. Complete capability and stack conformance checks (Sections 3 and 4).
4. Validate healthcare and scalability fit (Sections 5 and 6).
5. Validate tablet readiness (Section 7).
6. Complete legal/license sign-off (Section 8).
7. Record decision with pass/fail rationale.

No implementation may start until this workflow is completed and approved.

## 10) Acceptance Gates for Future UI Work

### Gate T-1: Template Compliance
Pass condition:
- Candidate passes all fail-fast and capability checks

### Gate T-2: i18n/RTL Compliance
Pass condition:
- Arabic/English and RTL/LTR requirements are fully satisfied

### Gate T-3: Healthcare Workflow Fit
Pass condition:
- Candidate supports required workflow complexity and role variation

### Gate T-4: Responsive/Tablet Fit
Pass condition:
- Critical workflows run successfully on tablet and desktop

### Gate T-5: Licensing Approval
Pass condition:
- Commercially valid, policy-compliant license evidence provided

If any gate fails, DO NOT PROCEED with implementation.

## 11) Mismatch Reporting Rule

Before changing code, teams MUST explicitly explain any mismatch between proposed UI/template choices and these governance rules.
Changes MAY proceed only after mismatch resolution and governance approval.
