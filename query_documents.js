const { Client } = require('pg');

const dbUrl = `postgresql://neondb_owner:npg_wJ8PraiuEHI3@ep-solitary-haze-a97tafw0.gwc.azure.neon.tech/neondb?channel_binding=require&sslmode=require`;

async function runQuery() {
  const client = new Client({
    connectionString: dbUrl,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('? Connected successfully\n');

    // Get total counts
    console.log('Fetching document counts...');
    const countsResult = await client.query(`
      SELECT 
        COUNT(*) as total_docs,
        COUNT(CASE WHEN template_key = 'legal_case_pdf' THEN 1 END) as legal_case_pdf_count,
        COUNT(CASE WHEN template_key = 'legal_case_pdf' AND status = 'GENERATED' THEN 1 END) as generated_count,
        COUNT(CASE WHEN template_key = 'legal_case_pdf' AND status = 'GENERATED' 
          AND (payload_json->>'pdf_base64' IS NULL OR payload_json->>'pdf_base64' = '') THEN 1 END) as matching_rows
      FROM documents;
    `);
    
    console.log('Counts:');
    console.log(JSON.stringify(countsResult.rows[0], null, 2));
    console.log();

    // Get the newest 20 rows matching criteria
    console.log('Fetching newest 20 matching rows...');
    const queryResult = await client.query(`
      SELECT 
        id, 
        case_id, 
        version, 
        status, 
        storage_path, 
        mime_type, 
        size_bytes, 
        created_at, 
        generated_at, 
        metadata->>'report_status' as report_status
      FROM documents
      WHERE template_key = 'legal_case_pdf'
        AND status = 'GENERATED'
        AND (payload_json->>'pdf_base64' IS NULL OR payload_json->>'pdf_base64' = '')
      ORDER BY generated_at DESC NULLS LAST, created_at DESC
      LIMIT 20;
    `);

    console.log(`Found ${queryResult.rows.length} rows:\n`);
    if (queryResult.rows.length > 0) {
      console.log(JSON.stringify(queryResult.rows, null, 2));
    } else {
      console.log('No rows found matching the criteria.');
    }
    
    await client.end();
    console.log('\n? Query completed successfully');
  } catch (error) {
    console.error('? Connection or Query Failed:');
    console.error(`Error Code: ${error.code}`);
    console.error(`Error Message: ${error.message}`);
    console.error(`Error Detail: ${error.detail}`);
    if (error.response) console.error(`Response: ${error.response}`);
    console.error(error);
  }
}

runQuery();
