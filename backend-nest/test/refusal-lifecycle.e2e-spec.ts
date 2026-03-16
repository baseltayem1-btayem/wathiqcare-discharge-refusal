import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as path from "node:path";

import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { configureApp } from "../src/bootstrap";

const rootDir = path.resolve(__dirname, "..");
const rootDatabaseUrl =
    process.env.TEST_DATABASE_ROOT_URL ||
    "postgresql://postgres:postgres@localhost:5433/wathiqcare_backend";

function buildSchemaDatabaseUrl(schema: string) {
    const url = new URL(rootDatabaseUrl);
    url.searchParams.set("schema", schema);
    return url.toString();
}

function configureTestEnvironment(databaseUrl: string) {
    process.env.NODE_ENV = "test";
    process.env.PORT = "0";
    process.env.API_PREFIX = "api";
    process.env.DATABASE_URL = databaseUrl;
    process.env.JWT_ACCESS_SECRET = "change-me-access";
    process.env.JWT_REFRESH_SECRET = "change-me-refresh";
    process.env.JWT_ACCESS_EXPIRES_IN = "15m";
    process.env.JWT_REFRESH_EXPIRES_IN = "7d";
    process.env.REDIS_URL = process.env.TEST_REDIS_URL || "redis://localhost:6380";
    process.env.S3_ENDPOINT = process.env.TEST_S3_ENDPOINT || "http://localhost:9002";
    process.env.S3_REGION = "us-east-1";
    process.env.S3_BUCKET = "wathiqcare-docs";
    process.env.S3_ACCESS_KEY = "minioadmin";
    process.env.S3_SECRET_KEY = "minioadmin";
    process.env.DEFAULT_TENANT_CODE = "wathiq-hospital";
}

describe("Refusal Lifecycle E2E", () => {
    let app: INestApplication;
    let adminPrisma: PrismaClient;
    let appModuleRef: typeof import("../src/app.module").AppModule;
    const schemaName = `e2e_${Date.now()}_${randomUUID().replace(/-/g, "")}`;
    const databaseUrl = buildSchemaDatabaseUrl(schemaName);

    beforeAll(async () => {
        configureTestEnvironment(databaseUrl);

        execFileSync("npx", ["prisma", "migrate", "deploy", "--schema", "./prisma/schema.prisma"], {
            cwd: rootDir,
            env: { ...process.env, DATABASE_URL: databaseUrl },
            stdio: "pipe",
        });

        execFileSync("npx", ["tsx", "prisma/seed.ts"], {
            cwd: rootDir,
            env: { ...process.env, DATABASE_URL: databaseUrl },
            stdio: "pipe",
        });

        adminPrisma = new PrismaClient({
            datasources: { db: { url: rootDatabaseUrl } },
        });

        ({ AppModule: appModuleRef } = await import("../src/app.module"));

        const moduleFixture = await Test.createTestingModule({
            imports: [appModuleRef],
        }).compile();

        app = moduleFixture.createNestApplication();
        await configureApp(app, { enableShutdownHooks: false });
        await app.init();
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }

        if (adminPrisma) {
            await adminPrisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS \"${schemaName}\" CASCADE`);
            await adminPrisma.$disconnect();
        }
    });

    it("returns ready health checks against live dependencies", async () => {
        const response = await request(app.getHttpServer())
            .get("/api/health/ready")
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.ok).toBe(true);
        expect(response.body.data.checks.database.ok).toBe(true);
        expect(response.body.data.checks.redis.ok).toBe(true);
        expect(response.body.data.checks.objectStorage.ok).toBe(true);
    });

    it("runs the core refusal-case lifecycle end to end", async () => {
        const loginResponse = await request(app.getHttpServer())
            .post("/api/auth/login")
            .send({
                email: "admin@wathiqcare.local",
                password: "Admin@12345",
                tenantCode: "wathiq-hospital",
            })
            .expect(201);

        const token = loginResponse.body.data.accessToken as string;
        const adminUserId = loginResponse.body.data.user.id as string;
        const authHeader = { Authorization: `Bearer ${token}` };

        const [facilitiesResponse, departmentsResponse, patientsResponse, encountersResponse, rolesResponse, reasonCategoriesResponse] =
            await Promise.all([
                request(app.getHttpServer()).get("/api/facilities").set(authHeader).expect(200),
                request(app.getHttpServer()).get("/api/departments").set(authHeader).expect(200),
                request(app.getHttpServer()).get("/api/patients").set(authHeader).expect(200),
                request(app.getHttpServer()).get("/api/encounters").set(authHeader).expect(200),
                request(app.getHttpServer()).get("/api/roles").set(authHeader).expect(200),
                request(app.getHttpServer()).get("/api/refusal-reason-categories").set(authHeader).expect(200),
            ]);

        const facilityId = facilitiesResponse.body.data[0].id as string;
        const nursingDepartment = departmentsResponse.body.data.find((item: { code: string }) => item.code === "nursing");
        const patientId = patientsResponse.body.data.items[0].id as string;
        const patientName = patientsResponse.body.data.items[0].fullName as string;
        const encounterId = encountersResponse.body.data.items[0].id as string;
        const adminRole = rolesResponse.body.data.find((item: { code: string }) => item.code === "admin");
        const patientRelationsRole = rolesResponse.body.data.find((item: { code: string }) => item.code === "patient_relations");
        const legalRole = rolesResponse.body.data.find((item: { code: string }) => item.code === "legal_officer");
        const reasonCategoryId = reasonCategoriesResponse.body.data[0].id as string;

        const createCaseResponse = await request(app.getHttpServer())
            .post("/api/cases")
            .set(authHeader)
            .send({
                caseType: "DISCHARGE_REFUSAL",
                priority: "HIGH",
                facilityId,
                departmentId: nursingDepartment.id,
                patientId,
                encounterId,
                summary: "E2E refusal lifecycle case",
            })
            .expect(201);

        const caseId = createCaseResponse.body.data.id as string;

        const dischargeDecisionResponse = await request(app.getHttpServer())
            .post(`/api/cases/${caseId}/discharge-decision`)
            .set(authHeader)
            .send({
                decisionStatus: "issued",
                dischargeMedicallyAppropriate: true,
                decisionDate: "2026-03-16",
                decisionTime: "10:30",
                clinicalRemarks: "E2E discharge decision",
            })
            .expect(201);

        const dischargePlanResponse = await request(app.getHttpServer())
            .post(`/api/cases/${caseId}/discharge-plan`)
            .set(authHeader)
            .send({
                destination: "home",
                instructionsProvided: true,
                notes: "E2E discharge plan",
            })
            .expect(201);

        const acknowledgmentResponse = await request(app.getHttpServer())
            .post(`/api/cases/${caseId}/acknowledgment/send`)
            .set(authHeader)
            .send({
                recipientType: "PATIENT",
                patientId,
                recipientName: patientName,
                deliveryMethod: "SMS",
            })
            .expect(201);

        const refusalEventResponse = await request(app.getHttpServer())
            .post(`/api/cases/${caseId}/refusal-events`)
            .set(authHeader)
            .send({
                refusalDate: "2026-03-16",
                refusalTime: "11:00",
                refusingPersonName: patientName,
                refusingPersonRelationship: "self",
                reasonCategoryId,
                detailedReason: "E2E refusal reason",
                consequencesExplained: true,
                immediateEscalationRequired: false,
            })
            .expect(201);

        const uploadDocumentResponse = await request(app.getHttpServer())
            .post(`/api/cases/${caseId}/documents/upload`)
            .set(authHeader)
            .send({
                category: "legal",
                originalFileName: "e2e-proof.pdf",
                mimeType: "application/pdf",
                fileSize: 512,
                confidentialityLevel: "NORMAL",
                contentBase64: Buffer.from("e2e proof").toString("base64"),
            })
            .expect(201);

        await request(app.getHttpServer())
            .post(`/api/users/${adminUserId}/roles`)
            .set(authHeader)
            .send({
                roleIds: [adminRole.id, patientRelationsRole.id, legalRole.id],
            })
            .expect(201);

        const transitionsResponse = await request(app.getHttpServer())
            .get(`/api/cases/${caseId}/available-transitions`)
            .set(authHeader)
            .expect(200);

        const transition = transitionsResponse.body.data.find((item: { code: string }) => item.code === "to_patient_relations");

        const executeTransitionResponse = await request(app.getHttpServer())
            .post(`/api/cases/${caseId}/transition`)
            .set(authHeader)
            .send({
                transitionCode: transition.code,
                comment: "E2E transition",
            })
            .expect(201);

        const tasksResponse = await request(app.getHttpServer())
            .get(`/api/tasks?refusalCaseId=${caseId}`)
            .set(authHeader)
            .expect(200);

        const legalNoteResponse = await request(app.getHttpServer())
            .post(`/api/cases/${caseId}/legal-notes`)
            .set(authHeader)
            .send({
                title: "E2E legal note",
                content: "Lifecycle validated in e2e",
                visibilityScope: "LEGAL_ONLY",
            })
            .expect(201);

        const auditResponse = await request(app.getHttpServer())
            .get(`/api/cases/${caseId}/audit`)
            .set(authHeader)
            .expect(200);

        expect(dischargeDecisionResponse.body.data.id).toBeTruthy();
        expect(dischargePlanResponse.body.data.id).toBeTruthy();
        expect(acknowledgmentResponse.body.data.id).toBeTruthy();
        expect(refusalEventResponse.body.data.id).toBeTruthy();
        expect(uploadDocumentResponse.body.data.id).toBeTruthy();
        expect(executeTransitionResponse.body.data.taskId).toBeTruthy();
        expect(tasksResponse.body.data.items).toHaveLength(1);
        expect(legalNoteResponse.body.data.id).toBeTruthy();
        expect(auditResponse.body.data.length).toBeGreaterThanOrEqual(8);
    });
});