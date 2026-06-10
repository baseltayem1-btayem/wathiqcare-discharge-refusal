"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";

const NAV_LINKS = [
  { href: "/modules",                         en: "Modules",          ar: "الوحدات" },
  { href: "/modules/informed-consents",       en: "Doctor Workspace", ar: "مساحة الطبيب" },
  { href: "/modules/informed-consents/forms", en: "Approved Forms",   ar: "النماذج المعتمدة" },
  { href: "/legal",                           en: "Legal Queue",      ar: "الطابور القانوني" },
  { href: "/cases",                           en: "Cases",            ar: "الحالات" },
  { href: "/dashboard",                       en: "Dashboard",        ar: "لوحة التحكم" },
];

export default function LegalQueueNav() {
  const pathname = usePathname();
  const { lang } = useI18n();
  const isAr = lang === "ar";

  return (
    <nav
      dir={isAr ? "rtl" : "ltr"}
      style={{
        background: "white",
        borderBottom: "1px solid #D8E4EE",
        boxShadow: "0 1px 4px rgba(16,42,67,0.05)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", height: 40, overflowX: "auto" }}>
        {NAV_LINKS.map(link => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0 12px",
                height: "100%",
                fontSize: 12,
                fontWeight: isActive ? 700 : 600,
                color: isActive ? "#002B5C" : "#5A6E82",
                textDecoration: "none",
                borderBottom: `2px solid ${isActive ? "#1976D2" : "transparent"}`,
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {isAr ? link.ar : link.en}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
