import { BadRequestException } from "@nestjs/common";

import { AuditService } from "../src/modules/audit/audit.service";
import { RefusalCasesService } from "../src/modules/refusal-cases/refusal-cases.service";

describe("RefusalCasesService", () => {
    it("rejects refusal event with invalid reason category", async () => {
        const prisma: any = {
            refusalCase: {
                findFirst: jest.fn().mockResolvedValue({
                    id: "case1",
                    tenantId: "t1",
                }),
            },
            refusalReasonCategory: {
                findFirst: jest.fn().mockResolvedValue(null),
            },
        };

        const audit = {
            log: jest.fn().mockResolvedValue({ id: "audit1" }),
            caseAudit: jest.fn().mockResolvedValue([]),
        };

        const service = new RefusalCasesService(prisma as any, audit as unknown as AuditService);

        const user = {
            id: "u1",
            tenantId: "t1",
            email: "user@example.com",
            isSuperAdmin: false,
            roles: ["nurse"],
            permissions: ["refusal_events.create"],
        };

        await expect(
            service.createRefusalEvent(user as any, "case1", {
                refusalDate: "2026-03-15",
                refusalTime: "11:00",
                refusingPersonName: "John",
                refusingPersonRelationship: "self",
                reasonCategoryId: "missing",
                consequencesExplained: true,
                immediateEscalationRequired: false,
            }),
        ).rejects.toThrow(BadRequestException);
    });
});
