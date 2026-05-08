# Controlled Demo Account Plan (Preparation Only)

## Purpose
Prepare role-scoped demo validation for controlled review of commit 43dff9d without broad credential distribution and without exposing real passwords.

## Global Controls
- No real production credentials are used.
- No credential values are included in this document.
- Accounts are tenant-scoped unless explicitly platform-wide.
- Demo sessions must preserve audit attribution to the specific demo identity.
- Forced reset behavior follows controlled-demo policy: no forced reset during supervised demo session; reset can be re-enabled post-demo as needed.

## Role Matrix

### 1) Platform Admin
- Intended module visibility: informed-consents, promissory-notes, discharge-refusal
- Allowed routes:
  - /platform
  - /modules
  - /modules/informed-consents/*
  - /modules/promissory-notes/*
  - /modules/discharge-refusal/*
- Blocked routes: none at module level (platform-admin context)
- Test scenario: login, verify platform landing, open each module portal/path, verify cross-module visibility
- Forced reset behavior: disabled during controlled demo run
- Audit attribution expectations: all actions attributable to platform admin demo account with clear timestamped events

### 2) Legal Affairs
- Intended module visibility: informed-consents, promissory-notes, discharge-refusal
- Allowed routes:
  - /modules
  - /modules/informed-consents/*
  - /modules/promissory-notes/*
  - /modules/discharge-refusal/*
- Blocked routes:
  - platform administration routes
- Test scenario: execute cross-module legal workflow checks and confirm module portal exposure matches role
- Forced reset behavior: disabled during controlled demo run
- Audit attribution expectations: legal actions and evidence access logged under legal-affairs identity

### 3) Doctor
- Intended module visibility: informed-consents, discharge-refusal
- Allowed routes:
  - /modules
  - /modules/informed-consents/*
  - /modules/discharge-refusal/*
- Blocked routes:
  - /modules/promissory-notes/*
  - platform administration routes
- Test scenario: verify clinical acknowledgment and discharge-related path access; confirm promissory routes are denied/hidden
- Forced reset behavior: disabled during controlled demo run
- Audit attribution expectations: clinical actions attributable to doctor identity, including consent/refusal events

### 4) Nurse
- Intended module visibility: informed-consents, discharge-refusal
- Allowed routes:
  - /modules
  - /modules/informed-consents/*
  - /modules/discharge-refusal/*
- Blocked routes:
  - /modules/promissory-notes/*
  - platform administration routes
- Test scenario: verify nursing role can execute permitted module pages and is blocked from finance-oriented paths
- Forced reset behavior: disabled during controlled demo run
- Audit attribution expectations: nursing entries must remain distinct from physician/legal accounts

### 5) Medical Director
- Intended module visibility: informed-consents, discharge-refusal
- Allowed routes:
  - /modules
  - /modules/informed-consents/*
  - /modules/discharge-refusal/*
- Blocked routes:
  - /modules/promissory-notes/*
  - platform administration routes
- Test scenario: validate oversight access to clinical legal records while finance module remains blocked
- Forced reset behavior: disabled during controlled demo run
- Audit attribution expectations: governance/oversight accesses attributable to medical-director account

### 6) Quality/Compliance
- Intended module visibility: informed-consents, promissory-notes, discharge-refusal
- Allowed routes:
  - /modules
  - /modules/informed-consents/*
  - /modules/promissory-notes/*
  - /modules/discharge-refusal/*
- Blocked routes:
  - platform administration routes
- Test scenario: verify cross-module audit/review navigation and evidentiary data visibility consistent with compliance role
- Forced reset behavior: disabled during controlled demo run
- Audit attribution expectations: compliance review actions logged for traceable legal/audit evidence

### 7) Finance/Admin
- Intended module visibility: promissory-notes
- Allowed routes:
  - /modules
  - /modules/promissory-notes/*
- Blocked routes:
  - /modules/informed-consents/*
  - /modules/discharge-refusal/*
  - platform administration routes
- Test scenario: confirm finance workflows function in promissory module and non-finance modules are hidden/blocked
- Forced reset behavior: disabled during controlled demo run
- Audit attribution expectations: financial undertakings attributable to finance-admin identity with complete event trail

## Controlled Execution Guardrails
- Execute demo matrix in supervised session only.
- Capture route allow/block outcomes per role.
- Retain logs/screenshots as non-production evidence artifacts.
- Do not promote demo credentials beyond authorized reviewers.
