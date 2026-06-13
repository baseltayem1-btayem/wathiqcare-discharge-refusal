import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";

function safeDatabaseInfo() {
  const rawUrl = process.env.DATABASE_URL || "";
  if (!rawUrl) {
    return { databaseHost: null, databaseName: null, hasDatabaseUrl: false };
  }

  try {
    const uri = new URL(rawUrl);
    return {
      databaseHost: uri.hostname,
      databaseName: uri.pathname.replace(/^\//, ""),
      hasDatabaseUrl: true,
    };
  } catch {
    return { databaseHost: null, databaseName: null, hasDatabaseUrl: true };
  }
}

export async function GET() {
  const isPreviewSafe =
    process.env.VERCEL_ENV === "preview" || process.env.APP_ENV !== "production";

  if (!isPreviewSafe) {
    return NextResponse.json(
      { success: false, error: "Debug endpoint is disabled outside preview." },
      { status: 404 },
    );
  }

  const prisma = getPrisma();

  const schemaInfo = await prisma.$queryRawUnsafe<
    Array<{ current_schema: string | null; search_path: string | null }>
  >(`
    SELECT current_schema() AS current_schema, current_setting('search_path') AS search_path;
  `);

  const regclassRows = await prisma.$queryRawUnsafe<
    Array<{ table_name: string; regclass: string | null }>
  >(`
    SELECT 'public.consent_categories' AS table_name, to_regclass('public.consent_categories')::text AS regclass
    UNION ALL
    SELECT 'public.consent_templates' AS table_name, to_regclass('public.consent_templates')::text AS regclass
    UNION ALL
    SELECT 'public.consent_template_versions' AS table_name, to_regclass('public.consent_template_versions')::text AS regclass
    UNION ALL
    SELECT 'public.consent_template_sections' AS table_name, to_regclass('public.consent_template_sections')::text AS regclass
    UNION ALL
    SELECT 'public.consent_template_localizations' AS table_name, to_regclass('public.consent_template_localizations')::text AS regclass
  `);

  const informationSchemaRows = await prisma.$queryRawUnsafe<
    Array<{ table_schema: string; table_name: string }>
  >(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'consent_categories',
        'consent_templates',
        'consent_template_versions',
        'consent_template_sections',
        'consent_template_localizations'
      )
    ORDER BY table_name;
  `);

  return NextResponse.json({
    success: true,
    runtimeEnv: {
      VERCEL_ENV: process.env.VERCEL_ENV || null,
      APP_ENV: process.env.APP_ENV || null,
    },
    database: safeDatabaseInfo(),
    schemaInfo: schemaInfo[0] || null,
    regclassRows,
    informationSchemaRows,
  });
}
