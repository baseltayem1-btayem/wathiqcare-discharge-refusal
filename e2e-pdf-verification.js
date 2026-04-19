#!/usr/bin/env node

/**
 * End-to-end PDF lifecycle verification
 * Tests: generate → persist → retrieve (preview/download) → final generation
 */

const fs = require("node:fs");
const path = require("node:path");

async function runE2ETest() {
  const BASE_URL = "http://localhost:3000";
  const TEST_CASE_ID = "test-case-pdf-e2e-001";
  
  // Mock auth token for test
  const mockAuth = {
    sub: "test-user-001",
    tenantId: "test-tenant-001",
    role: "doctor",
  };

  const results = {
    testName: "PDF Lifecycle E2E Verification",
    timestamp: new Date().toISOString(),
    steps: [],
    passed: 0,
    failed: 0,
  };

  async function step(name, fn) {
    const stepResult = { name, ok: false, error: null, data: null };
    results.steps.push(stepResult);
    
    try {
      console.log(`\n✓ Starting: ${name}`);
      const data = await fn();
      stepResult.ok = true;
      stepResult.data = data;
      results.passed += 1;
      console.log(`  ✓ Success`);
      return data;
    } catch (err) {
      stepResult.error = String(err?.message || err);
      results.failed += 1;
      console.error(`  ✗ Failed: ${stepResult.error}`);
      throw err;
    }
  }

  try {
    // Step 1: Generate Draft PDF
    await step("Generate Draft PDF", async () => {
      const response = await fetch(`${BASE_URL}/api/cases/${TEST_CASE_ID}/generate-pdf`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-test-auth": JSON.stringify(mockAuth),
        },
        body: JSON.stringify({
          requestedFinal: false,
          language: "en",
          trigger: "manual_generation",
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();
      if (!data.report || !data.report.id) {
        throw new Error("No document ID returned from generation");
      }

      return {
        documentId: data.report.id,
        version: data.report.versionLabel,
        status: data.report.status,
      };
    });

    // Step 2: Preview Draft PDF
    const draftDoc = results.steps[0].data;
    await step("Preview Draft PDF", async () => {
      const response = await fetch(
        `${BASE_URL}/api/cases/${TEST_CASE_ID}/pdf/${draftDoc.version}/preview`,
        {
          method: "GET",
          headers: {
            "x-test-auth": JSON.stringify(mockAuth),
          },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength === 0) {
        throw new Error("Preview returned empty buffer");
      }

      return {
        previewSize: buffer.byteLength,
        mimeType: response.headers.get("content-type"),
      };
    });

    // Step 3: Download Draft PDF
    await step("Download Draft PDF", async () => {
      const response = await fetch(
        `${BASE_URL}/api/cases/${TEST_CASE_ID}/pdf/${draftDoc.version}/download`,
        {
          method: "GET",
          headers: {
            "x-test-auth": JSON.stringify(mockAuth),
          },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength === 0) {
        throw new Error("Download returned empty buffer");
      }

      return {
        downloadSize: buffer.byteLength,
        mimeType: response.headers.get("content-type"),
        filename: response.headers.get("content-disposition"),
      };
    });

    // Step 4: List PDF Versions (should show draft)
    await step("List PDF Versions", async () => {
      const response = await fetch(`${BASE_URL}/api/cases/${TEST_CASE_ID}/pdf/versions`, {
        method: "GET",
        headers: {
          "x-test-auth": JSON.stringify(mockAuth),
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();
      if (!Array.isArray(data.versions) || data.versions.length === 0) {
        throw new Error("No versions returned from list");
      }

      const draftVersion = data.versions.find((v) => !v.isFinal);
      if (!draftVersion) {
        throw new Error("Draft version not found in versions list");
      }

      return {
        totalVersions: data.versions.length,
        draftVersion: draftVersion.versionLabel,
        draftStatus: draftVersion.status,
      };
    });

    // Step 5: Generate Final PDF
    await step("Generate Final PDF", async () => {
      const response = await fetch(`${BASE_URL}/api/cases/${TEST_CASE_ID}/generate-pdf`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-test-auth": JSON.stringify(mockAuth),
        },
        body: JSON.stringify({
          requestedFinal: true,
          language: "en",
          trigger: "manual_generation",
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();
      if (!data.report || !data.report.id) {
        throw new Error("No document ID returned from final generation");
      }

      return {
        documentId: data.report.id,
        version: data.report.versionLabel,
        status: data.report.status,
        isFinal: data.report.isFinal,
      };
    });

    // Step 6: Preview Final PDF
    const finalDoc = results.steps[4].data;
    await step("Preview Final PDF", async () => {
      const response = await fetch(
        `${BASE_URL}/api/cases/${TEST_CASE_ID}/pdf/${finalDoc.version}/preview`,
        {
          method: "GET",
          headers: {
            "x-test-auth": JSON.stringify(mockAuth),
          },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength === 0) {
        throw new Error("Final preview returned empty buffer");
      }

      return {
        finalPreviewSize: buffer.byteLength,
        mimeType: response.headers.get("content-type"),
      };
    });

    // Step 7: Download Final PDF
    await step("Download Final PDF", async () => {
      const response = await fetch(
        `${BASE_URL}/api/cases/${TEST_CASE_ID}/pdf/${finalDoc.version}/download`,
        {
          method: "GET",
          headers: {
            "x-test-auth": JSON.stringify(mockAuth),
          },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength === 0) {
        throw new Error("Final download returned empty buffer");
      }

      return {
        finalDownloadSize: buffer.byteLength,
        mimeType: response.headers.get("content-type"),
        filename: response.headers.get("content-disposition"),
      };
    });

    // Step 8: Verify Latest PDF returns final
    await step("Verify Latest PDF Returns Final", async () => {
      const response = await fetch(`${BASE_URL}/api/cases/${TEST_CASE_ID}/pdf`, {
        method: "GET",
        headers: {
          "x-test-auth": JSON.stringify(mockAuth),
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();
      if (!data.latest) {
        throw new Error("No latest PDF found");
      }

      if (!data.latest.isFinal) {
        throw new Error("Latest PDF is not marked as final");
      }

      return {
        latestIsFinal: data.latest.isFinal,
        latestVersion: data.latest.versionLabel,
      };
    });

    results.summary = `✓ All ${results.steps.length} steps completed successfully`;
    results.success = true;

  } catch (err) {
    results.summary = `✗ Test failed at step ${results.steps.filter((s) => s.ok).length + 1}: ${err.message}`;
    results.success = false;
  }

  const reportPath = path.join(process.cwd(), "e2e-pdf-verification-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), "utf8");

  console.log("\n" + "=".repeat(60));
  console.log(results.summary);
  console.log(`Report: ${reportPath}`);
  console.log("=".repeat(60));

  process.exit(results.success ? 0 : 1);
}

runE2ETest().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
