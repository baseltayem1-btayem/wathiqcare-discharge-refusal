import { userTypeForUserRole } from "@/lib/server/roles";

export function buildPostLoginRedirect(userRole: string | null | undefined, email?: string | null): string {
  void email;
  return userTypeForUserRole(userRole ?? "") === "PLATFORM_ADMIN" ? "/platform" : "/modules";
}

export function normalizeLoginIdentifier(input: string | null | undefined): string {
  return (input ?? "").trim().toLowerCase();
}

export function isEmailLoginIdentifier(input: string | null | undefined): boolean {
  return normalizeLoginIdentifier(input).includes("@");
}
