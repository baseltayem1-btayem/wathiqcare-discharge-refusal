# WathiqCare Enterprise UX 2.0 — Patient Journey

**Principal Product Designer | WathiqCare Enterprise Edition**

---

## Overview

The patient journey is designed around comprehension, autonomy, and dignity. Every screen reduces anxiety, builds understanding, and records a clear decision. The entire journey should be completable in **under five minutes** for a standard consent, with the patient controlling the pace.

---

## Entry Points

| Entry Point | When Used | Experience |
|---|---|---|
| **Secure link (email/SMS)** | Remote pre-arrival signing | Mobile-first, OTP identity verification |
| **QR code / tablet kiosk** | Bedside or waiting room | Staff-assisted or self-service |
| **Patient portal** | Returning patient with account | Logged-in experience with history |
| **Coordinator-initiated session** | In-person assistance | Shared device, staff guidance |

---

## Journey Map

```
Access → Verify → Welcome → Understand → Decide → Sign → Confirm
```

---

## Step 1: Access

### Screen: Secure Link Landing

**Purpose:** Reassure the patient that the link is legitimate and from their care team.

#### Content
- Organization logo and name.
- Patient name (partially masked for privacy).
- Procedure name (high-level only).
- “This link was sent by [Care Team / Hospital].”
- Call-to-action: **Start Now**.
- Expiration notice and support contact.

#### Design Rules
- No login required; the token carries the session.
- Privacy notice is concise and plain.
- If the link is expired or invalid, show a helpful error with recovery action.

---

## Step 2: Verify

### Screen: Identity Verification

**Purpose:** Confirm that the person signing is the patient or authorized guardian.

#### Verification Methods
- SMS/email OTP.
- Date of birth + last name.
- National ID last digits (where permitted).
- Guardian authority check.

#### Design Rules
- Use the minimum verification necessary for the risk level.
- OTP input uses a single field with auto-advance; no confusing split boxes.
- Clear error messaging without exposing whether an identifier exists.
- Rate limiting and lockout are communicated calmly.

---

## Step 3: Welcome

### Screen: What to Expect

**Purpose:** Set expectations and reduce anxiety.

#### Content
- “We’ll walk you through [procedure name].”
- Estimated time to complete.
- “You can ask questions, go back, or take a break at any time.”
- Option to switch language.

#### Design Rules
- Friendly illustration or icon, not clinical photography.
- Large, tappable primary action.
- Language switcher is prominent for bilingual deployments.

---

## Step 4: Understand

### Screen: Procedure Summary

**Purpose:** Explain what will happen in plain language.

#### Content
- Procedure name and purpose.
- What to expect before, during, and after.
- Who will perform it.
- Approximate duration.

#### Design Rules
- Use short sections with clear headings.
- Visuals (illustrations or animations) where helpful.
- Avoid dense paragraphs; use bullet points.

---

### Screen: Risks & Benefits

**Purpose:** Present risks in a layered, understandable way.

#### Content
- “Common risks” — things that happen often but are usually manageable.
- “Serious risks” — things that are rare but important to know.
- “Benefits” — why the care team recommends this.
- “Alternatives” — including no procedure.

#### Design Rules
- Use plain language first; clinical terms are defined inline.
- Each category is collapsible.
- Risk severity is communicated with labels, not just color.
- No alarmist language; no minimization of serious risks.

---

### Screen: Ask Questions

**Purpose:** Give patients a structured way to raise concerns.

#### Content
- Common questions pre-populated.
- Free-text question field.
- Option to request a call from the care team.

#### Design Rules
- Optional step; skipping is allowed.
- Submitted questions are routed to the care team and logged.
- If a question is submitted, the care team is notified before signing.

---

## Step 5: Decide

### Screen: Decision

**Purpose:** Capture an informed, voluntary decision.

#### Options
- **I agree to proceed.**
- **I want to talk to someone first.**
- **I do not want to proceed at this time.**

#### Design Rules
- All options have equal visual weight.
- No pre-selection.
- Each option has a brief explanation of what happens next.
- Decline is treated with the same respect as agreement.

---

### Screen: Decline Flow

**Purpose:** Document refusal respectfully and offer alternatives.

#### Content
- “You have the right to decline.”
- “Please tell us why so we can discuss alternatives.” (optional)
- “A member of your care team will contact you.”

#### Design Rules
- No guilt language.
- Patient can still change their mind.
- Care team is notified immediately.

---

## Step 6: Sign

### Screen: Signature Capture

**Purpose:** Record a legally meaningful signature or acknowledgment.

#### Signature Modes
- Touch/mouse-drawn signature.
- Typed name with attestation.
- Biometric / stylus capture on supported devices.
- Guardian signature when applicable.

#### Design Rules
- Signature pad is large, responsive, and undoable.
- Clear label: “Sign to confirm you understand and agree.”
- For decline: “Sign to confirm you have read and declined.”
- No hard-coded or synthetic signatures.

---

## Step 7: Confirm

### Screen: Confirmation

**Purpose:** Provide closure, a record reference, and next steps.

#### Content
- Thank you message.
- Confirmation code (short, human-readable).
- What happens next.
- Download or email copy option.
- Contact information for questions.

#### Design Rules
- No raw audit hashes shown to patients.
- Confirmation code is short enough to read aloud.
- Option to download a patient copy.
- Clear path to close or return to portal.

---

## Cross-Cutting Patient Experience Rules

### Navigation
- Step indicator shows progress.
- Back button available on every screen except confirmation.
- Save progress automatically; resume on any device with the same link.

### Language
- Language can be changed at any time.
- Arabic and English content must be equivalent, not machine-translated as an afterthought.

### Accessibility
- All content readable by screen readers.
- Focus management follows the step order.
- Sufficient contrast and touch target sizes.

### Trust Signals
- Organization branding throughout.
- Clear privacy and data-use statements.
- No unexpected requests for unrelated data.

---

## Patient Journey Success Metrics

| Metric | Target |
|---|---|
| Time to complete standard consent | ≤ 5 minutes |
| Completion rate from link open | ≥ 85% |
| Decline rate handled gracefully | 100% |
| Comprehension score (post-sign quiz) | ≥ 80% |
| Patient confidence score | ≥ 4.2 / 5 |
| Support call rate due to confusion | < 5% |
