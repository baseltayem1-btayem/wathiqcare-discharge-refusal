"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { getModuleDefinition, resolveModuleKeyFromPath } from "@/lib/modules/catalog";

type BreadcrumbItem = {
  href: string;
  label: string;
};

type AppBreadcrumbsProps = {
  caseLabel?: string;
};

const SEGMENT_KEY_MAP: Record<string, string> = {
  modules: "breadcrumbs.modules",
  dashboard: "breadcrumbs.dashboard",
  dashboards: "breadcrumbs.dashboard",
  cases: "breadcrumbs.cases",
  admin: "breadcrumbs.admin",
  "workspace-v2": "breadcrumbs.workspace",
  documents: "breadcrumbs.documents",
  "legal-package": "breadcrumbs.legalPackage",
  settings: "breadcrumbs.settings",
  "informed-consents": "breadcrumbs.informedConsents",
  "promissory-notes": "breadcrumbs.promissoryNotes",
  "discharge-refusal": "breadcrumbs.dischargeRefusal",
  templates: "breadcrumbs.templates",
  signatures: "breadcrumbs.signatures",
  archive: "breadcrumbs.archive",
};

function looksLikeCaseId(value: string): boolean {
  return /^[a-z0-9-]{8,}$/i.test(value);
}

function fallbackArabicLabel(segment: string): string {
  switch (segment) {
    case "dashboard":
    case "dashboards":
      return "لوحة التحكم";
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
    case "modules":
      return "المنصة";
    case "informed-consents":
      return "الموافقات المستنيرة";
    case "promissory-notes":
      return "السندات لأمر الإلكترونية";
    case "discharge-refusal":
      return "رفض الخروج";
    case "templates":
      return "القوالب";
    case "signatures":
      return "التوقيع";
    case "archive":
      return "الأرشيف";
    default:
      return decodeURIComponent(segment).replace(/[-_]/g, " ");
  }
}

export default function AppBreadcrumbs({ caseLabel }: AppBreadcrumbsProps) {
  const pathname = usePathname();
  const { t, isRtl } = useI18n();
  const DividerIcon = isRtl ? ChevronRight : ChevronLeft;

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "ar" && segment !== "en");
  const moduleKey = resolveModuleKeyFromPath(pathname);
  const moduleDefinition = moduleKey ? getModuleDefinition(moduleKey) : null;
  const normalizedSegments = [...segments];

  if (normalizedSegments[0] === "modules") {
    normalizedSegments.shift();
    if (moduleDefinition && normalizedSegments[0] === `${moduleDefinition.slug}`) {
      normalizedSegments.shift();
    }
  }

  const items: BreadcrumbItem[] = [
    {
      href: "/modules",
      label: t("breadcrumbs.platform"),
    },
  ];

  if (moduleDefinition) {
    items.push({
      href: moduleDefinition.href,
      label: isRtl ? moduleDefinition.arabicTitle : moduleDefinition.englishTitle,
    });
  }

  let cumulativePath = "";

  normalizedSegments.forEach((segment, index) => {
    cumulativePath += `/${segment}`;

    const previous = normalizedSegments[index - 1] || "";
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

    const href = moduleDefinition
      ? `${moduleDefinition.href}${cumulativePath}`
      : cumulativePath;

    items.push({ href, label });
  });

  return (
    <nav
      aria-label={t("breadcrumbs.ariaLabel")}
      className="min-h-6 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-slate-50/70 px-2 py-1.5"
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
              {!isLast ? <DividerIcon className="h-3.5 w-3.5 text-slate-400" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
