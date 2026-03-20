-- WathiqCare SQL Server DDL
-- File: 01_create_schemas.sql
-- Purpose: Create logical schemas for controlled deployment.
-- Execution: Manual/CI deployment pipeline only. Do NOT execute automatically from application startup.

SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'security')
    EXEC('CREATE SCHEMA [security]');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'workflow')
    EXEC('CREATE SCHEMA [workflow]');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'documents')
    EXEC('CREATE SCHEMA [documents]');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'compliance')
    EXEC('CREATE SCHEMA [compliance]');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'legal')
    EXEC('CREATE SCHEMA [legal]');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'audit')
    EXEC('CREATE SCHEMA [audit]');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'integration')
    EXEC('CREATE SCHEMA [integration]');
GO

-- Deferred schema (not part of immediate rollout): billing
