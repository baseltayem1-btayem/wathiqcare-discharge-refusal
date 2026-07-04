# WathiqCare Enterprise UX 2.0 — Mobile Strategy

**Principal Product Designer | WathiqCare Enterprise Edition**

---

## Overview

Mobile is not a secondary viewport for WathiqCare. It is the primary surface for patients and a critical surface for physicians and coordinators in clinical settings. The mobile strategy ensures that every core task is completable with confidence on a small screen.

---

## Mobile User Scenarios

### Patient Scenarios

| Scenario | Device | Context |
|---|---|---|
| Remote consent signing | Smartphone | At home, on the move, possibly distracted |
| Bedside signing with staff | Tablet | Hospital room, shared device |
| Waiting-room QR signing | Tablet/kiosk | Time-limited, possibly anxious |
| Review after appointment | Smartphone | Follow-up, post-discharge |

### Clinical Scenarios

| Scenario | Device | Context |
|---|---|---|
| Quick task check | Smartphone | Between rounds, away from workstation |
| Bedside consent initiation | Tablet | With patient, need portability |
| Coordinator task management | Tablet | Walking units, shared device |
| Emergency override review | Smartphone | Time-critical, high cognitive load |

---

## Mobile-First Design Principles

1. **One thing per screen.** Avoid multi-column layouts on mobile.
2. **Thumb-friendly targets.** Minimum 44×44px touch targets; 48×48px preferred.
3. **Readable at arm’s length.** Minimum 16px body text; generous line height.
4. **Fast on slow networks.** Optimize assets; defer non-critical content.
5. **Works offline where possible.** Save progress locally; sync when connected.
6. **Respects interruptions.** Auto-save after every meaningful action.

---

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|---|---|---|
| `xs` | < 480px | Small phones |
| `sm` | 480–767px | Large phones |
| `md` | 768–1023px | Tablets, small laptops |
| `lg` | 1024–1279px | Laptops |
| `xl` | ≥ 1280px | Desktops |

---

## Patient Journey on Mobile

### Landing & Verification
- Single-column centered layout.
- Large input fields with clear labels.
- Numeric keyboard for OTP.
- Biometric login where available for portal users.

### Education Screens
- One concept per scroll view.
- Sticky “Next” button at bottom.
- Collapsible sections for risks and alternatives.
- Optional audio playback for procedure explanation.

### Decision & Signature
- Decision buttons stacked, full width, equal weight.
- Signature pad occupies full width; rotate to landscape for larger canvas.
- Confirmation screen centered with large confirmation code.

---

## Physician Workspace on Mobile

### Dashboard / Inbox
- Card list instead of table.
- Swipe actions for quick triage.
- Filter chips at top.
- Pull-to-refresh.

### Task Detail
- Sticky patient header.
- Step-by-step vertical flow.
- Floating action button for primary action.
- Bottom sheet for secondary options.

### Review & Send
- Collapsible knowledge package.
- Simplified disclosure preview.
- One-tap send with confirmation modal.

---

## Tablet Strategy

### Bedside Tablet
- Larger canvas supports side-by-side context.
- Signature pad is comfortable for patient use.
- Staff-assisted mode: clinician view on one side, patient-facing view on the other.
- Kiosk mode locks to WathiqCare; no system chrome visible.

### Clinical Tablet
- Two-pane layout: task list + detail.
- Supports stylus input for signatures or annotations.
- Rotates between portrait and landscape gracefully.

---

## Native Considerations

While the initial strategy is responsive web, future native apps should support:

- Push notifications for consent completion and reminders.
- Secure biometric authentication.
- Offline draft saving.
- Camera integration for ID verification (where permitted).
- Native share sheet for sending secure links.

---

## Performance Targets

| Metric | Target |
|---|---|
| First Contentful Paint (FCP) | < 1.5s on 4G |
| Largest Contentful Paint (LCP) | < 2.5s on 4G |
| Time to Interactive (TTI) | < 3.5s |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Input delay | < 100ms |

---

## Mobile Testing Requirements

- Test on real devices, not just emulators.
- Include iOS Safari and Android Chrome.
- Test in RTL Arabic layouts on mobile.
- Validate touch targets, font scaling, and screen reader behavior.
- Conduct usability tests with patients in clinical waiting areas.
