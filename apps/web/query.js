async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    // Total count
    const totalCount = await prisma.document.count({
      where: { templateKey: "legal_case_pdf" }
    });

    // Count with status=GENERATED
    const generatedCount = await prisma.document.count({
      where: { 
        templateKey: "legal_case_pdf",
        status: "GENERATED"
      }
    });

    // Count GENERATED with pdf_base64 missing or empty
    const missingBase64Count = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM documents
      WHERE template_key = 'legal_case_pdf'
      AND status = 'GENERATED'
      AND (payload_json->>'pdf_base64' IS NULL OR payload_json->>'pdf_base64' = '')
    `;

    // Count GENERATED with storage_path null/empty
    const nullStorageCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM documents
      WHERE template_key = 'legal_case_pdf'
      AND status = 'GENERATED'
      AND (storage_path IS NULL OR storage_path = '')
    `;

    // 10 newest problematic rows
    const problematicRows = await prisma.$queryRaw`
      SELECT id, case_id, version, status, storage_path, mime_type, size_bytes, generated_at
      FROM documents
      WHERE template_key = 'legal_case_pdf'
      AND status = 'GENERATED'
      AND (
        (payload_json->>'pdf_base64' IS NULL OR payload_json->>'pdf_base64' = '')
        OR (storage_path IS NULL OR storage_path = '')
      )
      ORDER BY generated_at DESC
      LIMIT 10
    `;

    console.log("=== Document Query Results ===");
    console.log("Total count:", totalCount);
    console.log("Count with status=GENERATED:", generatedCount);
    console.log("Count GENERATED with pdf_base64 missing/empty:", missingBase64Count[0].count);
    console.log("Count GENERATED with storage_path null/empty:", nullStorageCount[0].count);
    console.log("\n=== 10 Newest Problematic Rows ===");
    console.table(problematicRows);
    
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
