# 19 — Design System Foundation (VE-02)

## Objective
Establish a single, maintainable design-system foundation for WathiqCare so that future UI work can be built from reusable components and tokens rather than one-off styles.

## Scope
This deliverable is intentionally limited to the foundation layer and a single-page proof-of-concept migration:

- Central design tokens
- Primitive layout + container components
- Enhanced existing primitives (`Button`, `Input`, `Card`, `Badge`)
- Login page refactored to consume the new system
- **Stop rule:** no other pages were migrated; existing pages keep their current implementation.

## Files Added / Modified

| File | Purpose |
|------|---------|
| `apps/web/src/styles/design-tokens.ts` | Central token source of truth |
| `apps/web/src/components/design-system/button.tsx` | Added enterprise sizes/variants (`brand`, `dashed`, `xl`, full-width, uppercase toggle) |
| `apps/web/src/components/design-system/input.tsx` | Added icon slots, error state, size variants |
| `apps/web/src/components/design-system/card.tsx` | Added `login` variant and composition subcomponents |
| `apps/web/src/components/design-system/badge.tsx` | Added size variants |
| `apps/web/src/components/design-system/container.tsx` | New responsive width container |
| `apps/web/src/components/design-system/stack.tsx` | New flex stack helper |
| `apps/web/src/components/design-system/grid.tsx` | New responsive grid helper |
| `apps/web/src/components/design-system/section.tsx` | New section wrapper with spacing presets |
| `apps/web/src/components/design-system/page-header.tsx` | New page header pattern |
| `apps/web/src/components/design-system/alert.tsx` | New alert with error/success/warning/info variants |
| `apps/web/src/components/design-system/empty-state.tsx` | New empty-state illustration + CTA pattern |
| `apps/web/src/components/design-system/loading-state.tsx` | New skeleton/spinner loading pattern |
| `apps/web/src/components/design-system/divider.tsx` | New divider helper |
| `apps/web/src/components/design-system/form.tsx` | New `Form` + `FormField` composition |
| `apps/web/src/components/design-system/index.ts` | Public barrel export |
| `apps/web/src/app/login/page.tsx` | Refactored to consume DS components while preserving auth logic |
| `scripts/capture-login-ve2.mjs` | Screenshot capture + diff utility for VE-1 baseline verification |

## Token Architecture

Tokens are grouped by domain:

- `colors` — navy/blue/gold semantic palette plus surface/background/text helpers
- `typography` — font stacks, weights, sizes, line heights
- `spacing` — 4 px grid scale
- `radius` — rounded corners from `sm` to `full`
- `elevation` — shadows for cards, popovers, overlays
- `animation` — durations and easing curves
- `breakpoints` — responsive widths
- `layout` — max widths, z-index scale
- `rtlFlipClass` — helper for direction-aware transforms

All components reference the token file; hard-coded values inside components are progressively being replaced as each page is migrated.

## Migration Strategy

1. **Foundation first** — tokens and primitives are now available project-wide.
2. **Login-only pilot** — the login page was migrated to prove the system works in production without redesigning the page.
3. **Future pages** — should import from `@/components/design-system` and follow the patterns documented in `20-component-catalog.md` and `21-design-token-reference.md`.

## Verification

- `npm run build -w apps/web` ✅
- `npm run test -w apps/web` ✅ 224 passing
- TypeScript: login page is clean; pre-existing errors elsewhere in the monorepo were not introduced by this work.
- Screenshots captured and compared against `qa-screenshots/login-ve1/` baseline (see `22-login-refactor-verification.md`).
