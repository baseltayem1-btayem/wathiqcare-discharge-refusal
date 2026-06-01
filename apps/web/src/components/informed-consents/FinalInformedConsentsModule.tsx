/**
 * Phase 40 — Controlled Port of Localhost OneDrive UI.
 *
 * This wrapper mounts the ported Vite/Figma-Make UI under the official Next.js
 * informed-consents module surface (`/modules/informed-consents`). It is a
 * **visual-only** mount: the ported screens currently render from mock data
 * isolated in `final-ui/fixtures/`. No real patient identity, OTP, signing
 * token, or backend API is hit from this tree.
 *
 * Production wiring will replace the fixture imports with real fetches to
 * `/api/modules/informed-consents/*` once visual approval is granted by the
 * physician stakeholders.
 *
 * Boundaries:
 *   - The official `/sign/[token]/workflow` patient surface (powered by
 *     `ApprovedPatientWorkflow`) is **untouched**.
 *   - The public-signing APIs, OTP, signing-token validation, audit, and
 *     Arabic mojibake guards are **untouched**.
 *   - The legacy `/modules/informed-consents/create` doctor creation surface
 *     remains available unless and until a follow-up phase explicitly replaces
 *     it.
 */

"use client";

import FinalApp from "./final-ui/App";

export type FinalInformedConsentsModuleAuth = {
  role?: string | null;
  platform_role?: string | null;
  email?: string | null;
  name?: string | null;
};

export type FinalInformedConsentsModuleProps = {
  // Accepted but not yet consumed by the visual port. Once wired to real APIs,
  // the wrapper will forward the live physician identity into the OneDrive App.
  auth?: FinalInformedConsentsModuleAuth;
};

export default function FinalInformedConsentsModule(_props: FinalInformedConsentsModuleProps) {
  return <FinalApp />;
}
