# WathiqCare Web App

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Admin Operations

### Reset passwords safely

The web app includes a built-in admin script that uses the same `hashPassword()` logic as the live authentication flow.

Dry-run a single reset:

```bash
npm run admin:reset-password -- --username imc.jeddah.doctor1 --password Doctor@123
```

Apply a single reset:

```bash
npm run admin:reset-password -- --username imc.jeddah.doctor1 --password Doctor@123 --apply
```

Apply multiple resets inline:

```bash
npm run admin:reset-password -- --target imc.admin=Welcome@123 --target imc.legal=Legal@123 --apply
```

Load resets from a file:

```bash
npm run admin:reset-password -- --file ./scripts/reset-batch.json
npm run admin:reset-password -- --file ./scripts/reset-batch.csv --apply
```

Example JSON file:

```json
[
  { "identifier": "imc.admin", "password": "Welcome@123" },
  { "identifier": "imc.legal", "password": "Legal@123" }
]
```

Example CSV file:

```csv
identifier,password
imc.admin,Welcome@123
imc.legal,Legal@123
```

Optional audit logging:

```bash
npm run admin:reset-password -- --target imc.admin=Welcome@123 --actor superadmin --audit --apply
```

When `--audit` is enabled, the script writes an `audit_logs` entry for each reset and attempts to append a matching audit-chain event. Use `--actor` with an existing admin username or email so the operation is attributable.

## Enterprise sandbox staging

Use the built-in demo seed to prepare a production-like staging tenant for authenticated UAT and workflow certification.

1. Copy `/home/runner/work/wathiqcare-discharge-refusal/wathiqcare-discharge-refusal/.env.example` into your staging runtime env files.
2. Point `DATABASE_URL`, `DATABASE_URL_POOLED`, and `DATABASE_URL_UNPOOLED` to the dedicated staging database.
3. Keep delivery safe for UAT by setting:
   - `EMAIL_DELIVERY_MODE=mock`
   - `SMS_PROVIDER=mock`
   - `SMS_ENABLED=false`
4. Use persistent document storage in staging:
   - `PDF_BINARY_STORAGE_MODE=local_file`
   - `PDF_STORAGE_ROOT=/var/lib/wathiqcare/staging-documents`
5. Generate the Prisma client and seed enterprise demo data:

```bash
npm run prisma:generate -w apps/web
npm run demo:seed -w apps/web
```

The seed now provisions authenticated enterprise demo accounts for platform administration, legal affairs, physician, nurse, medical director, compliance, finance, external reviewer, read-only auditor, quality manager, and risk officer, plus multilingual workflow data for informed consent, discharge refusal, promissory note, and legal review scenarios.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
