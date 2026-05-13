import { PLATFORM_ADMIN_USER_TYPE, userTypeForUserRole } from "@/lib/server/roles";

export function buildPostLoginRedirect(userRole: string | null | undefined, email?: string | null): string {
  return userTypeForUserRole(userRole ?? "", email) === PLATFORM_ADMIN_USER_TYPE ? "/platform" : "/modules";
}

export function normalizeLoginIdentifier(input: string | null | undefined): string {
  return (input ?? "").trim().toLowerCase();
}

export function isEmailLoginIdentifier(input: string | null | undefined): boolean {
  return normalizeLoginIdentifier(input).includes("@");
}
