# WathiqCare Enterprise UX 2.0 — Information Architecture

**Principal Product Designer | WathiqCare Enterprise Edition**

---

## Overview

WathiqCare Enterprise is organized around four primary activity domains:

1. **Clinical Workspace** — where physicians and coordinators prepare, review, and send consent.
2. **Patient Experience** — where patients and guardians review, ask, decide, and sign.
3. **Administration & Compliance** — where administrators configure, monitor, and audit.
4. **System & Identity** — where authentication, notifications, and user preferences live.

Each domain is a coherent mental model. Users should always know which domain they are in and how to move between them.

---

## Primary Navigation Model

### Top-Level Structure

```
WathiqCare Enterprise
│
├── Clinical
│   ├── Dashboard
│   ├── Patients
│   ├── Encounters
│   ├── Consent Tasks
│   ├── Templates & Content
│   └── Knowledge Packages
│
├── Patient Experience
│   ├── Signing Inbox (secure link entry)
│   ├── Review & Decide
│   ├── Ask Questions
│   ├── Signature
│   └── Confirmation
│
├── Compliance
│   ├── Consent Records
│   ├── Audit Trail
│   ├── Reports
│   └── Exceptions
│
├── Administration
│   ├── Organization & Facilities
│   ├── Users & Roles
│   ├── Workflows
│   ├── Templates
│   ├── Integrations
│   └── Branding & Localization
│
└── Me
    ├── Profile
    ├── Preferences
    ├── Notifications
    └── Help & Support
```

---

## Domain 1: Clinical Workspace

### Purpose
Enable physicians and clinical staff to prepare, personalize, and send consent with clinical decision support.

### Key Objects

| Object | Definition | Primary Actions |
|---|---|---|
| **Patient** | The person receiving care or their authorized guardian. | Search, select, verify identity, view history. |
| **Encounter** | A specific clinical interaction (appointment, admission, procedure). | Select, confirm context, link to consent. |
| **Consent Task** | A unit of work requiring physician input and patient signature. | Create, assign, review, send, monitor. |
| **Template** | Reusable consent content for a procedure or category. | Browse, preview, customize, approve. |
| **Knowledge Package** | Compiled clinical guidance, risks, alternatives, and rules. | Review, accept, edit, explain. |
| **Consent Record** | The final signed, auditable consent artifact. | View, download, revoke, audit. |

### Task Flow

```
Start → Select Patient → Confirm Encounter → Choose Procedure
        ↓
      Review Knowledge Package
        ↓
      Personalize Disclosures
        ↓
      Add Interpreter / Witness (if required)
        ↓
      Physician Review & Acknowledge
        ↓
      Send to Patient
        ↓
      Monitor Status → Receive Notification
        ↓
      Archive / Export Record
```

---

## Domain 2: Patient Experience

### Purpose
Enable patients and guardians to understand, question, and formally agree to or decline care.

### Entry Points

| Entry Point | Use Case |
|---|---|
| **Secure email/SMS link** | Remote signing before arrival. |
| **QR code at kiosk/tablet** | Bedside or waiting-room signing. |
| **Provider portal invitation** | Patient has an account and logs in. |
| **Coordinator-initiated session** | Staff assists with in-person signing. |

### Task Flow

```
Open Link → Verify Identity (OTP / DOB / ID)
        ↓
      Welcome & Purpose
        ↓
      Review Procedure Summary
        ↓
      Read Risks & Alternatives
        ↓
      Ask Questions (optional)
        ↓
      Make Decision → Agree / Decline / Request Delay
        ↓
      Provide Signature
        ↓
      Receive Confirmation
```

### Decision States

- **Agree** — proceed with care; signature captured.
- **Decline** — documented refusal; care team notified; alternatives offered.
- **Request Delay / More Information** — task paused; care team follow-up triggered.

---

## Domain 3: Compliance

### Purpose
Provide legal, regulatory, and quality teams with complete visibility and evidence.

### Structure

| Section | Content |
|---|---|
| **Consent Records** | Searchable, filterable list of all signed and pending consents. |
| **Audit Trail** | Immutable log of every view, edit, send, sign, and export. |
| **Reports** | Completion rates, exception trends, language usage, turnaround time. |
| **Exceptions** | Alerts for unsigned urgent consents, declined procedures, incomplete records. |

---

## Domain 4: Administration

### Purpose
Configure the platform to match organizational structure, clinical workflows, and regional requirements.

### Structure

| Section | Content |
|---|---|
| **Organization & Facilities** | Hospitals, departments, units, locations. |
| **Users & Roles** | Physicians, nurses, coordinators, admins, compliance officers. |
| **Workflows** | Consent pathways by specialty, encounter type, and region. |
| **Templates** | Master template library with versioning and approval. |
| **Integrations** | EHR, ADT, scheduling, identity provider, notification gateways. |
| **Branding & Localization** | Logos, colors, languages, RTL, regional legal text. |

---

## Cross-Cutting Concerns

### Search & Findability
- Global search across patients, encounters, consent tasks, and templates.
- Recent items and pinned favorites for frequent workflows.
- Smart filters by status, location, specialty, and urgency.

### Notifications
- Unified notification center for task assignment, patient completion, exceptions, and system alerts.
- Notifications are actionable: open the relevant record directly.

### Help & Support
- Contextual help panels linked to every screen.
- Role-based guidance: physician, patient, coordinator, admin.
- Escalation paths to IT support and clinical documentation teams.

---

## URL & Routing Philosophy

| Pattern | Example | Meaning |
|---|---|---|
| `/clinical/dashboard` | Domain-level landing | Clinical home |
| `/clinical/consent-tasks/:id` | Object detail | Work a specific consent task |
| `/clinical/patients/:id/encounters/:encounterId` | Nested context | Patient encounter view |
| `/sign/:token` | Public action | Patient secure signing entry |
| `/compliance/records/:id` | Compliance detail | View signed consent record |
| `/admin/templates/:id` | Admin detail | Edit template |

---

## Information Architecture Principles

1. **Depth ≤ 3 clicks** to any primary task from the domain home.
2. **Context is preserved** when navigating between related objects.
3. **No orphaned pages** — every screen has a parent and a clear exit.
4. **Public and private surfaces are separated** by route, layout, and authentication model.
5. **Metadata is separated from meaning** — debug/system data is never shown to clinical or patient users.
