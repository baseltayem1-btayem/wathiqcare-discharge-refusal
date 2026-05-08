# WathiqCare Web App

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Admin Operations

### Reset passwords safely

The web app includes a built-in admin script that uses the same `hashPassword()` logic as the live authentication flow.

Dry-run a single reset:

```bash
npm run admin:reset-password -- --username imc.jeddah.doctor1 --password '<secure-password>'
```

Apply a single reset:

```bash
npm run admin:reset-password -- --username imc.jeddah.doctor1 --password '<secure-password>' --apply
```

Apply multiple resets inline:

```bash
npm run admin:reset-password -- --target 'imc.admin=<secure-password>' --target 'imc.legal=<secure-password>' --apply
```

Load resets from a file:

```bash
npm run admin:reset-password -- --file ./scripts/reset-batch.json
npm run admin:reset-password -- --file ./scripts/reset-batch.csv --apply
```

Example JSON file:

```json
[
  { "identifier": "imc.admin", "password": "<secure-password>" },
  { "identifier": "imc.legal", "password": "<secure-password>" }
]
```

Example CSV file:

```csv
identifier,password
imc.admin,<secure-password>
imc.legal,<secure-password>
```

Optional audit logging:

```bash
npm run admin:reset-password -- --target 'imc.admin=<secure-password>' --actor superadmin --audit --apply
```

When `--audit` is enabled, the script writes an `audit_logs` entry for each reset and attempts to append a matching audit-chain event. Use `--actor` with an existing admin username or email so the operation is attributable.

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
