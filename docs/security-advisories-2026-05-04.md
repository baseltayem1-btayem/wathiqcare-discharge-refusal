# Security Advisory Follow-Up - 2026-05-04

## Completed runtime updates

- Upgraded `next` to `16.2.4`.
- Upgraded `nodemailer` to `8.0.5`.
- Upgraded direct `postcss` usage in the workspace to `8.5.10+`.
- Verified production build succeeds with `npm run build -w apps/web`.

## Remaining advisory state

`npm audit --omit=dev` still reports 2 moderate vulnerabilities tied to `postcss`, but the remaining affected path is inside `next` itself:

```text
next@16.2.4 -> postcss@8.4.31
```

Verified locally on 2026-05-04:

```text
npm view next version => 16.2.4
npm view next@latest dependencies.postcss => 8.4.31
```

This means there is currently no newer published stable `next` release available to this repository that removes the nested `postcss` version.

## Production impact assessment

- The previous high-severity `next` Server Components DoS advisory was remediated by upgrading from `16.2.1` to `16.2.4`.
- The previous `nodemailer` SMTP injection advisory was remediated by upgrading from `8.0.4` to `8.0.5`.
- The remaining `postcss` advisory is currently upstream to `next` and not triggered by any direct runtime `postcss.parse(...).toResult().css` flow found in this app.
- Residual risk is currently low, but the audit finding remains open until `next` publishes a release with a patched nested `postcss` dependency.

## Required follow-up

1. Re-check `npm view next version` on the next dependency review.
2. Upgrade `next` immediately when a stable release no longer depends on `postcss < 8.5.10`.
3. Re-run `npm audit --omit=dev` and production build after that upgrade.