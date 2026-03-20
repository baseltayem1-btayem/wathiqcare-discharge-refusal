-- WathiqCare SQL Server DDL
-- File: 05_seed_reference_data.sql
-- Purpose: Seed reference/static data only.
-- Notes:
--   - This script is idempotent.
--   - No tenant/user/case production data is inserted here.

SET NOCOUNT ON;
GO

/* =========================
   DEFERRED FROM IMMEDIATE ROLLOUT
   ========================= */
-- billing.plans
-- billing.subscriptions
-- billing.usage_records
-- billing.invoices
-- billing.subscription_events

/* =========================
   INTEGRATION SYSTEM REFERENCE DEFAULTS (GLOBAL)
   ========================= */
;WITH source_data AS (
    SELECT CAST('his' AS nvarchar(64)) AS system_code,
        CAST(1 AS bit) AS enabled,
        CAST('/his/patient/{mrn}' AS nvarchar(512)) AS endpoint_pattern,
        CAST(NULL AS nvarchar(max)) AS resources_json,
        CAST('{"source":"seed","description":"Hospital Information System patient lookup"}' AS nvarchar(max)) AS metadata_json
    UNION ALL
    SELECT CAST('fhir' AS nvarchar(64)),
        CAST(1 AS bit),
        CAST('/fhir/*' AS nvarchar(512)),
        CAST('["Patient","Encounter","Procedure","Consent"]' AS nvarchar(max)),
        CAST('{"source":"seed","description":"FHIR resource adapter"}' AS nvarchar(max))
    UNION ALL
    SELECT CAST('docuware' AS nvarchar(64)),
        CAST(0 AS bit),
        CAST(NULL AS nvarchar(512)),
        CAST(NULL AS nvarchar(max)),
        CAST('{"source":"seed"}' AS nvarchar(max))
    UNION ALL
    SELECT CAST('sharepoint' AS nvarchar(64)),
        CAST(0 AS bit),
        CAST(NULL AS nvarchar(512)),
        CAST(NULL AS nvarchar(max)),
        CAST('{"source":"seed"}' AS nvarchar(max))
    UNION ALL
    SELECT CAST('erp' AS nvarchar(64)),
        CAST(0 AS bit),
        CAST(NULL AS nvarchar(512)),
        CAST(NULL AS nvarchar(max)),
        CAST('{"source":"seed"}' AS nvarchar(max))
)
UPDATE target
SET target.enabled = source_data.enabled,
    target.endpoint_pattern = source_data.endpoint_pattern,
    target.resources_json = source_data.resources_json,
    target.metadata_json = source_data.metadata_json,
    target.observed_at = SYSUTCDATETIME(),
    target.updated_at = SYSUTCDATETIME()
FROM integration.integration_system_references AS target
INNER JOIN source_data
    ON target.system_code = source_data.system_code
WHERE target.tenant_id IS NULL;
GO

;WITH source_data AS (
    SELECT CAST('his' AS nvarchar(64)) AS system_code,
        CAST(1 AS bit) AS enabled,
        CAST('/his/patient/{mrn}' AS nvarchar(512)) AS endpoint_pattern,
        CAST(NULL AS nvarchar(max)) AS resources_json,
        CAST('{"source":"seed","description":"Hospital Information System patient lookup"}' AS nvarchar(max)) AS metadata_json
    UNION ALL
    SELECT CAST('fhir' AS nvarchar(64)),
        CAST(1 AS bit),
        CAST('/fhir/*' AS nvarchar(512)),
        CAST('["Patient","Encounter","Procedure","Consent"]' AS nvarchar(max)),
        CAST('{"source":"seed","description":"FHIR resource adapter"}' AS nvarchar(max))
    UNION ALL
    SELECT CAST('docuware' AS nvarchar(64)),
        CAST(0 AS bit),
        CAST(NULL AS nvarchar(512)),
        CAST(NULL AS nvarchar(max)),
        CAST('{"source":"seed"}' AS nvarchar(max))
    UNION ALL
    SELECT CAST('sharepoint' AS nvarchar(64)),
        CAST(0 AS bit),
        CAST(NULL AS nvarchar(512)),
        CAST(NULL AS nvarchar(max)),
        CAST('{"source":"seed"}' AS nvarchar(max))
    UNION ALL
    SELECT CAST('erp' AS nvarchar(64)),
        CAST(0 AS bit),
        CAST(NULL AS nvarchar(512)),
        CAST(NULL AS nvarchar(max)),
        CAST('{"source":"seed"}' AS nvarchar(max))
)
INSERT INTO integration.integration_system_references (
    tenant_id,
    system_code,
    enabled,
    endpoint_pattern,
    resources_json,
    metadata_json,
    observed_at,
    created_at,
    updated_at
)
SELECT
    NULL,
    source_data.system_code,
    source_data.enabled,
    source_data.endpoint_pattern,
    source_data.resources_json,
    source_data.metadata_json,
    SYSUTCDATETIME(),
    SYSUTCDATETIME(),
    SYSUTCDATETIME()
FROM source_data
WHERE NOT EXISTS (
    SELECT 1
    FROM integration.integration_system_references AS target
    WHERE target.tenant_id IS NULL
      AND target.system_code = source_data.system_code
);
GO
