"use client";

import { usePathname } from "next/navigation";
import LegalQueueNav from "./LegalQueueNav";

// Suppress the internal nav breadcrumb on the homepage and login page
// so they can render their own full-page layouts without the nav injected above.
export default function ConditionalNav() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/login") return null;
  return <LegalQueueNav />;
}
