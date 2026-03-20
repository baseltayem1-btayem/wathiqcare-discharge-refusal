# Wathiq Care Frontend Architecture Rules

Status: Active (Mandatory)
Effective date: 2026-03-13
Applies to: All new or modified frontend work in this repository

## 1) Purpose

This document defines non-negotiable architecture and delivery rules for all frontend work.
No UI implementation may begin until these rules are reviewed and accepted for the specific change.

## 2) Scope

These rules apply to:
- New frontend modules
- Refactors and redesigns
- Template adoption and UI kit decisions
- Third-party component selection
- Internal tools and clinical workflow screens

## 3) Non-Negotiable Architecture Rules (Hard Requirements)

1. Angular only.
2. No React, no Vue, no static HTML template adoption unless wrapped in fully supported Angular architecture.
3. Full Arabic/English bilingual support is mandatory.
4. Native RTL support is mandatory when Arabic is active.
5. LTR support is mandatory when English is active.
6. No partial RTL fixes and no CSS hacks as a substitute for real RTL support.
7. The UI must be enterprise-grade, scalable, and suitable for healthcare workflows.
8. The selected base layout must support:
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
9. Licensing must be commercially valid for internal hospital deployment.
10. Do not introduce architectural limitations that block future modules.

Any violation of the above is an automatic NO-GO.

## 4) Mandatory Stack Rules

All frontend solutions SHALL use:
- Angular routing
- Angular reactive forms
- Modular Angular architecture
- RTL/LTR switching
- i18n-ready structure
- Tablet-friendly responsive design
- Healthcare workflow usability first

## 5) Required Architecture Characteristics

All approved UI architecture SHALL:
- Use feature modules and clear domain boundaries
- Support lazy loading for major workflow areas
- Support role-based navigation and route protection
- Keep business logic outside UI components where practical
- Support maintainable theming and design token usage
- Avoid tightly coupled template dependencies

## 6) Scalability Requirements

Frontend architecture MUST support:
- Incremental addition of new healthcare modules without global rewrites
- Stable layout shell with pluggable feature areas
- Expansion to additional roles, tenants, and workflow variants
- Data-heavy screens (tables, filters, batch actions) without redesigning core layout

## 7) Healthcare Workflow UI Requirements

All UI architecture and screen patterns MUST support:
- Multi-step clinical/administrative workflows
- Form-intensive data entry with validation and save/resume behavior
- Clear status visibility for case progression and escalation states
- Document evidence viewing, upload, and verification flows
- High-readability interfaces for busy hospital operations

## 8) Responsive and Tablet Requirements

The frontend MUST:
- Work on desktop and tablet as first-class targets
- Preserve critical workflows at tablet widths without feature loss
- Keep navigation, forms, tables, and dialogs usable on touch devices
- Avoid designs that rely on hover-only interactions

## 9) Licensing and Legal Requirements

Before adoption, every UI library/template/component MUST have:
- License type documented (SPDX identifier)
- Explicit commercial use rights
- Internal deployment rights for hospital environments
- No restrictive clauses that block redistribution inside the organization
- Legal/procurement sign-off where required by policy

No unverified or ambiguous license may be used.

## 10) Prohibited Patterns

The following are forbidden:
- Starting new UI features in React, Vue, or plain static HTML stack
- Shipping one-language-only UI
- Direction-specific one-off CSS hacks instead of true bidi support
- Template lock-in that prevents future module growth
- Introducing UI dependencies without documented license review

## 11) Future UI Work Acceptance Gates (Must Pass Before Implementation)

Every UI initiative MUST pass all gates below before coding starts.

### Gate A: Architecture Conformance
Required evidence:
- Angular-only architecture statement
- Module map and routing strategy
- Reactive forms usage plan
Pass condition:
- Full compliance with Sections 3 and 4

### Gate B: Bilingual and Directionality Conformance
Required evidence:
- Arabic and English content strategy
- RTL/LTR switching design and component behavior notes
Pass condition:
- Full compliance with bilingual + bidi requirements (no partial solutions)

### Gate C: Workflow and Scalability Fit
Required evidence:
- Feature expansion plan
- Healthcare workflow mapping
- Layout capability checklist against required features
Pass condition:
- Supports enterprise workflow complexity and future module growth

### Gate D: Responsive/Tablet Fit
Required evidence:
- Breakpoint behavior summary
- Tablet interaction scenarios for forms, tables, and dialogs
Pass condition:
- No critical workflow degradation on tablet

### Gate E: Licensing and Compliance
Required evidence:
- License inventory and commercial-use confirmation
Pass condition:
- Commercially valid and policy compliant

If any gate fails, implementation MUST NOT proceed.

## 12) Enforcement

- Pull requests for UI work SHALL include a completed governance checklist.
- Reviewers SHALL reject UI changes that do not include gate evidence.
- Teams MUST explain any mismatch before changing code.
- No exception is valid unless explicitly approved by architecture and product owners.
