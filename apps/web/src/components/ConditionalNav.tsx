"use client";

import { usePathname } from "next/navigation";
import { LegalQueueNav } from "./LegalQueueNav";

export function ConditionalNav() {
  const pathname = usePathname() || "/";

  const hiddenPrefixes = [
    "/",
    "/en",
    "/ar",
    "/login",
    "/api",
    "/_next",
    "/public-signing",
    "/modules/informed-consents",
    "/modules/promissory-notes",
  ];

  const exactHidden = pathname === "/" || pathname === "/en" || pathname === "/ar" || pathname === "/login";

  if (exactHidden) return null;

  if (
    hiddenPrefixes.some((prefix) => {
      if (prefix === "/") return false;
      return pathname === prefix || pathname.startsWith(`${prefix}/`);
    })
  ) {
    return null;
  }

  const legalPrefixes = ["/legal", "/cases", "/dashboard", "/modules/discharge-refusal"];

  const shouldShowLegalNav = legalPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!shouldShowLegalNav) return null;

  return <LegalQueueNav />;
}
