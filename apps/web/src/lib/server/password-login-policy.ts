import { userTypeForUserRole } from "@/lib/server/roles";

export function buildPostLoginRedirect(userRole: string | null | undefined, email?: string | null): string {
  const userType = userTypeForUserRole(userRole ?? "", email);
  return userType === "PLATFORM_ADMIN" ? "/platform" : "/modules";
}

export function normalizeLoginIdentifier(input: string | null | undefined): string {
  return (input ?? "").trim().toLowerCase();
}

export function isEmailLoginIdentifier(input: string | null | undefined): boolean {
  return normalizeLoginIdentifier(input).includes("@");
}
