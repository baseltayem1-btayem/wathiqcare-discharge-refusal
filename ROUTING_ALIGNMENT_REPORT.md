# ROUTING ALIGNMENT REPORT

## Route alignment

- Old route: `/modules/informed-consents`
- New primary route: `/modules/informed-consents/create`
- Legacy route preserved at: `/legacy/informed-consents`
- Preview validation route used for workflow screenshots: `/internal/enterprise-consent`

## Affected menu items

- Tenant sidebar primary **Informed Consent** menu now points to `/modules/informed-consents/create`
- App shell primary navigation active-state logic now treats `/modules/informed-consents/*` and `/legacy/informed-consents` as the same module
- Module portal **Informed Consents** card now opens `/modules/informed-consents/create`
- Informed consent module menus now surface:
  - `/modules/informed-consents/create`
  - `/legacy/informed-consents`
  - existing list/archive/templates/governance routes

## Internal links updated

- Root informed consent module route now redirects to `/modules/informed-consents/create`
- Legacy dashboard moved to `/legacy/informed-consents`
- Catalog/module portal links now resolve to `/modules/informed-consents/create`
- Route-aware smoke/module-access tests updated for the new landing route and legacy route coverage

## Validation

### Automated

- `npm run build -w apps/web` ✅
- `npm run test -w apps/web` ⚠️ pre-existing unrelated failures remain:
  - `src/lib/server/legal-case-pdf-storage.test.ts` — Windows executable path assertion
  - `informed consent evidence HTML respects language direction and verification details`

### Manual / visual

- Login attempt with `admin@wathiqcare.test` / `Test@Secure123!` is currently blocked locally by `500: Internal server error`
- Workflow surface validated visually through `/internal/enterprise-consent`
- Route availability validated for:
  - `/modules/informed-consents` → redirect target `/modules/informed-consents/create`
  - `/modules/informed-consents/create`
  - `/legacy/informed-consents`

## Validation screenshots

### Repository artifacts

- `apps/web/artifacts/routing-alignment/01-login-screen.png`
- `apps/web/artifacts/routing-alignment/02-enterprise-consent-full.png`
- `apps/web/artifacts/routing-alignment/03-patient-education.png`
- `apps/web/artifacts/routing-alignment/04-signature-step.png`
- `apps/web/artifacts/routing-alignment/05-otp-step.png`
- `apps/web/artifacts/routing-alignment/06-evidence-step.png`

### Shareable URLs

- Login: https://github.com/user-attachments/assets/3fa3382f-79d6-4160-8846-35fb5e971142
- Workflow overview: https://github.com/user-attachments/assets/b6ef38c6-bc7e-450c-a3f5-3daf43fd8982
- Patient education / reading: https://github.com/user-attachments/assets/ce6c8a29-e090-40ba-8120-1b08bd835dd9
- Signature: https://github.com/user-attachments/assets/ed650bdb-f6fc-4a42-b98c-0736eaca1fa5
- OTP: https://github.com/user-attachments/assets/6ee27fe6-319b-42ce-97ed-fd65c1129c51
- Evidence: https://github.com/user-attachments/assets/c64e44af-8d8e-4292-8be2-153c63a6c4bb

## Requested flow coverage

- Login: locally blocked by current auth/server error screenshot above
- Informed Consent: validated on the new primary route alignment and preview shell
- Patient Education: validated via consent reading panel screenshot
- Understanding Check: represented by physician acknowledgment / patient acknowledgment controls in the preview workflow
- Signature: validated via patient signature screenshot
- OTP: validated via OTP verification screenshot
- Evidence: validated via evidence bundle screenshot
