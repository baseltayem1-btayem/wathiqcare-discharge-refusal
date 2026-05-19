# WathiqCare PDF Engine Foundation

This folder contains the Phase 1 foundation for the WathiqCare™ enterprise legal PDF engine.

Scope of this foundation:

- deterministic evidence metadata types
- stable SHA-256 evidence hashing
- verification URL utility
- QR wrapper with safe fallback behavior
- centralized WathiqCare™ and IMC branding data
- HTML template foundation for informed-consent legal evidence preview

Safety guarantees:

- additive only; no existing route replacement
- import-safe in Node and SSR contexts
- no database writes
- no session dependency unless payload data is passed explicitly
- no side effects at module import time
- no browser-only globals at module top level

Planned later integration:

1. existing informed-consent PDF route can call `buildInformedConsentEvidenceHtml(payload)`
2. QR verification can be attached by calling `buildEvidenceQrVerification(...)`
3. evidence hashes can be stored by later route/service wiring without changing this foundation
4. legal evidence package generation can embed the rendered HTML and downstream PDF bytes

This phase does not replace the current production PDF engine.
