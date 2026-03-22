import assert from "node:assert/strict";
import test from "node:test";

import { checkAttendingPhysicianAuthority } from "./clinical-authority";

test("allows discharge approval when permission exists and user is attending physician", () => {
    const result = checkAttendingPhysicianAuthority({
        userId: "user-1",
        attendingPhysicianId: "user-1",
        hasDischargeApprovePermission: true,
    });

    assert.deepEqual(result, { allowed: true });
});

test("blocks discharge approval when attending physician does not match current user", () => {
    const result = checkAttendingPhysicianAuthority({
        userId: "user-2",
        attendingPhysicianId: "user-1",
        hasDischargeApprovePermission: true,
    });

    assert.deepEqual(result, { allowed: false, reason: "not_attending_physician" });
});

test("blocks discharge approval when attending physician is missing", () => {
    const result = checkAttendingPhysicianAuthority({
        userId: "user-1",
        attendingPhysicianId: null,
        hasDischargeApprovePermission: true,
    });

    assert.deepEqual(result, { allowed: false, reason: "missing_attending_physician" });
});

test("blocks discharge approval when permission is missing", () => {
    const result = checkAttendingPhysicianAuthority({
        userId: "user-1",
        attendingPhysicianId: "user-1",
        hasDischargeApprovePermission: false,
    });

    assert.deepEqual(result, { allowed: false, reason: "missing_permission" });
});
