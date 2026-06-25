"use client";

import { usePathname } from "next/navigation";
import LegalQueueNav from "./LegalQueueNav";

export default function ConditionalNav() {
  const pathname = usePathname() || "/";

  const exactHidden =
    pathname === "/" ||
    pathname === "/en" ||
    pathname === "/ar" ||
    pathname === "/login";

  if (exactHidden) return null;

  const hiddenPrefixes = [
    "/api",
    "/_next",
    "/public-signing",
    "/modules/informed-consents",
    "/modules/promissory-notes",
    "/modules/wathiqnote",
  ];

  if (
    hiddenPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return null;
  }

  const legalPrefixes = [
    "/legal",
    "/cases",
    "/dashboard",
    "/modules/discharge-refusal",
  ];

  const shouldShowLegalNav = legalPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!shouldShowLegalNav) return null;

  return <LegalQueueNav />;
}

export { ConditionalNav };
