export type AttendingAuthorityCheckInput = {
    userId: string;
    attendingPhysicianId: string | null | undefined;
    hasDischargeApprovePermission: boolean;
};

export type AttendingAuthorityCheckResult =
    | { allowed: true }
    | {
        allowed: false;
        reason:
        | "missing_permission"
        | "missing_attending_physician"
        | "not_attending_physician";
    };

export function checkAttendingPhysicianAuthority(
    input: AttendingAuthorityCheckInput,
): AttendingAuthorityCheckResult {
    if (!input.hasDischargeApprovePermission) {
        return { allowed: false, reason: "missing_permission" };
    }

    if (!input.attendingPhysicianId || !input.attendingPhysicianId.trim()) {
        return { allowed: false, reason: "missing_attending_physician" };
    }

    if (input.userId !== input.attendingPhysicianId.trim()) {
        return { allowed: false, reason: "not_attending_physician" };
    }

    return { allowed: true };
}
