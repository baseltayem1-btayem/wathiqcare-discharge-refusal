"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

type BreadcrumbItem = {
  href: string;
  label: string;
};

type AppBreadcrumbsProps = {
  caseLabel?: string;
};

const SEGMENT_KEY_MAP: Record<string, string> = {
  dashboard: "breadcrumbs.dashboard",
  dashboards: "breadcrumbs.dashboard",
  cases: "breadcrumbs.cases",
  admin: "breadcrumbs.admin",
  "workspace-v2": "breadcrumbs.workspace",
  documents: "breadcrumbs.documents",
  "legal-package": "breadcrumbs.legalPackage",
  settings: "breadcrumbs.settings",
};

function looksLikeCaseId(value: string): boolean {
  return /^[a-z0-9-]{8,}$/i.test(value);
}

function fallbackArabicLabel(segment: string): string {
  switch (segment) {
    case "dashboard":
    case "dashboards":
      return "لوحة المعلومات";
    case "cases":
      return "الحالات";
    case "admin":
      return "الإدارة";
    case "workspace-v2":
      return "مساحة العمل";
    case "documents":
      return "المستندات";
    case "legal-package":
      return "الحزمة القانونية";
    case "settings":
      return "الإعدادات";
    default:
      return decodeURIComponent(segment).replace(/[-_]/g, " ");
  }
}

export default function AppBreadcrumbs({ caseLabel }: AppBreadcrumbsProps) {
  const pathname = usePathname();
  const { t, isRtl } = useI18n();

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "ar" && segment !== "en");

  const items: BreadcrumbItem[] = [
    {
      href: "/dashboard",
      label: t("breadcrumbs.home"),
    },
  ];

  let cumulativePath = "";

  segments.forEach((segment, index) => {
    cumulativePath += `/${segment}`;

    const previous = segments[index - 1] || "";
    let label = "";
    const key = SEGMENT_KEY_MAP[segment];
    if (key) {
      const translated = t(key);
      label = translated !== key ? translated : "";
    }

    if (!label) {
      if (previous === "cases" && looksLikeCaseId(segment)) {
        label = caseLabel || `${t("breadcrumbs.case")}: ${segment.slice(0, 8)}`;
      } else {
        label = fallbackArabicLabel(segment);
      }
    }

    items.push({ href: cumulativePath, label });
  });

  return (
    <nav
      aria-label={t("breadcrumbs.ariaLabel")}
      className="min-h-6 overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.href}-${index}`} className="inline-flex items-center gap-1">
              {isLast ? (
                <span className="max-w-[16rem] truncate font-semibold text-slate-700">{item.label}</span>
              ) : (
                <Link href={item.href} className="max-w-[12rem] truncate hover:text-slate-700">
                  {item.label}
                </Link>
              )}
              {!isLast ? <ChevronLeft className="h-3.5 w-3.5 text-slate-400" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
