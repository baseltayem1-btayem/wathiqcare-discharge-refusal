# Phase 35C-Auth Correction

## Correction Trigger

User-provided live visual evidence for:

- https://wathiqcare.online/modules/informed-consents

contradicts the prior marker-based Phase 35C-Auth conclusion.

The prior conclusion is invalidated.

## Immediate Operational Decision

**STOP - APPROVED UI NOT VISIBLE**

Until corrected and re-approved:

- Do not unfreeze the pilot.
- Do not send patient links.
- Do not enable SMS.
- Do not broaden pilot usage.
- Do not treat current production UI as approved.

## Why the Prior Conclusion Is Invalid

The prior decision relied on route markers and positive DOM checks:

- `data-testid="approved-informed-consents-module"`
- `data-release-surface="approved-informed-consents"`

This is now insufficient because markers can be present even when the visual surface does not match the approved pilot UI baseline.

## Verified Technical State (Code Inspection)

### Active route files

- `apps/web/app/modules/informed-consents/page.tsx`
- `apps/web/src/app/modules/informed-consents/page.tsx`

Both currently render:

- `ApprovedPhysicianDashboard`

with release markers attached at route wrapper level.

### User-validated production behavior

Despite route markers, the production screen currently appears as a simplified/legacy consent-type selection experience and not the expected approved pilot interface.

## Root Correction Principle

Visual approval is a UI-match decision, not a marker-only decision.

From this point forward:

1. Marker checks are secondary evidence.
2. Primary gate is visual equivalence to the approved pilot UI baseline.
3. User visual evidence has higher authority than marker-only automation when they disagree.

## Pilot State

**Pilot remains frozen.**

No deployment actions are authorized by this correction record.

## Final Classification (for this correction)

**CURRENT UI CONFIRMED LEGACY - PILOT REMAINS FROZEN**
