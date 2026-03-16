import { ForbiddenException } from "@nestjs/common";

import { PermissionsGuard } from "../src/common/guards/permissions.guard";

describe("PermissionsGuard", () => {
    it("allows super admin", () => {
        const reflector = {
            getAllAndOverride: jest.fn().mockReturnValue(["cases.read"]),
        };
        const guard = new PermissionsGuard(reflector as any);

        const ctx: any = {
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: () => ({
                getRequest: () => ({
                    user: {
                        id: "u1",
                        tenantId: "t1",
                        isSuperAdmin: true,
                        permissions: [],
                    },
                }),
            }),
        };

        expect(guard.canActivate(ctx)).toBe(true);
    });

    it("blocks missing permission", () => {
        const reflector = {
            getAllAndOverride: jest.fn().mockReturnValue(["cases.read"]),
        };
        const guard = new PermissionsGuard(reflector as any);

        const ctx: any = {
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: () => ({
                getRequest: () => ({
                    user: {
                        id: "u1",
                        tenantId: "t1",
                        isSuperAdmin: false,
                        permissions: ["tasks.read"],
                    },
                }),
            }),
        };

        expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
});
