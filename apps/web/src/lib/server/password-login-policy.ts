import { userTypeForUserRole } from "@/lib/server/roles";

export function buildPostLoginRedirect(userRole: string | null | undefined, _email?: string | null): string {
  const userType = userTypeForUserRole(userRole ?? "");
  if (userType === "PLATFORM_ADMIN") {
    return "/platform";
  }
  return "/modules";
}

export function normalizeLoginIdentifier(input: string | null | undefined): string {
  return (input ?? "").trim().toLowerCase();
}

export function isEmailLoginIdentifier(input: string | null | undefined): boolean {
  return normalizeLoginIdentifier(input).includes("@");
}
