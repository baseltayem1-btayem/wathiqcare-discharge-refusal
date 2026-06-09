"use client";

import React from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  FileText,
  Grid2X2,
  Library,
  LogOut,
  Search,
  Settings,
  Shield,
  Stethoscope,
  User,
} from "lucide-react";
import ConsentSearchEngine from "./ConsentSearchEngine";

type ApprovedFigmaConsentWorkspaceProps = {
  auth?: unknown;
  lang?: "en" | "ar" | string;
};

type StatCard = {
  label: string;
  labelAr: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  tone: string;
  border: string;
};

type ReadinessItem = {
  label: string;
  labelAr: string;
  done: boolean;
};

export default function ApprovedFigmaConsentWorkspace({
  auth,
  lang = "en",
}: ApprovedFigmaConsentWorkspaceProps) {
  void auth;

  const [langState, setLangState] = React.useState<"en" | "ar">(
    lang === "ar" ? "ar" : "en",
  );

  const isArabic = langState === "ar";

  React.useEffect(() => {
    document.documentElement.lang = langState;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
  }, [langState, isArabic]);

  const toggleLanguage = React.useCallback(() => {
    setLangState((current) => (current === "ar" ? "en" : "ar"));
  }, []);

  const stats: StatCard[] = React.useMemo(
    () => [
      {
        label: "Pending Consents",
        labelAr: "الموافقات المعلقة",
        value: "7",
        icon: AlertCircle,
        bg: "bg-amber-50",
        tone: "text-amber-600",
        border: "border-[#D8DCE3]",
      },
      {
        label: "Draft Consents",
        labelAr: "مسودات الموافقات",
        value: "3",
        icon: FileText,
        bg: "bg-slate-50",
        tone: "text-slate-600",
        border: "border-[#D8DCE3]",
      },
      {
        label: "Sent / Awaiting",
        labelAr: "مرسلة / بانتظار التوقيع",
        value: "12",
        icon: Bell,
        bg: "bg-blue-50",
        tone: "text-blue-600",
        border: "border-[#D8DCE3]",
      },
      {
        label: "Completed Today",
        labelAr: "مكتملة اليوم",
        value: "5",
        icon: CheckCircle2,
        bg: "bg-emerald-50",
        tone: "text-emerald-600",
        border: "border-[#D8DCE3]",
      },
    ],
    [],
  );

  const readinessItems: ReadinessItem[] = React.useMemo(
    () => [
      { label: "Patient selected", labelAr: "تم اختيار المريض", done: true },
      { label: "Encounter selected", labelAr: "تم اختيار الزيارة", done: true },
      { label: "Template selected", labelAr: "تم اختيار النموذج", done: true },
      {
        label: "IMC approved template",
        labelAr: "نموذج معتمد من IMC",
        done: true,
      },
      {
        label: "Procedure details completed",
        labelAr: "تم استكمال تفاصيل الإجراء",
        done: true,
      },
      {
        label: "Anesthesia decision",
        labelAr: "قرار التخدير",
        done: true,
      },
      {
        label: "Education package",
        labelAr: "الحزمة التثقيفية",
        done: true,
      },
      {
        label: "Draft PDF generated",
        labelAr: "تم إنشاء مسودة PDF",
        done: false,
      },
      {
        label: "Patient link sent",
        labelAr: "تم إرسال رابط المريض",
        done: false,
      },
    ],
    [],
  );

  const navItems = React.useMemo(
    () => [
      {
        label: "Dashboard",
        labelAr: "لوحة التحكم",
        href: "/modules/informed-consents",
        icon: Grid2X2,
        active: true,
        badge: "3",
      },
      {
        label: "Physician Workflow",
        labelAr: "رحلة الطبيب",
        href: "/modules/informed-consents/physician-workflow",
        icon: Stethoscope,
        active: false,
      },
      {
        label: "Patient Search",
        labelAr: "بحث المرضى",
        href: "/modules/informed-consents/consent-creation-workflow",
        icon: Search,
        active: false,
      },
      {
        label: "Consent Library",
        labelAr: "مكتبة الموافقات",
        href: "/modules/informed-consents/templates",
        icon: Library,
        active: false,
      },
      {
        label: "Status Tracking",
        labelAr: "تتبع الحالة",
        href: "/modules/informed-consents/list",
        icon: Activity,
        active: false,
      },
    ],
    [],
  );

  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <aside 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <Shield 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
            </div>
            <div>
              <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >WathiqCare</div>
              <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                Clinical Consent Platform
              </div>
            </div>
          </div>

          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                <User 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
              </div>
              <div>
                <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Dr. Khalid Al-Qahtani</div>
                <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                  General Surgery · FACS
                </div>
              </div>
            </div>
          </div>

          <nav 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              Clinical Workspace
            </div>

            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      item.active
                        ? "bg-[#1976D2] text-white"
                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      <Icon 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                      {isArabic ? item.labelAr : item.label}
                    </span>

                    {item.badge ? (
                      <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>

            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              System
            </div>

            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <Link
                href="/modules/informed-consents/settings-support"
                
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
              >
                <Settings 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                {isArabic ? "الإعدادات والدعم" : "Settings & Support"}
              </Link>

              <Link
                href="/login"
                
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
              >
                <LogOut 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                {isArabic ? "تسجيل الخروج" : "Sign Out"}
              </Link>
            </div>
          </nav>
        </aside>

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <header 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                Department:{" "}
                <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                  General Surgery
                </span>
                <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >·</span>
                28 May 2026
                <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >·</span>
                Session: 2h 14m
              </div>

              <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                <button
                  type="button"
                  onClick={toggleLanguage}
                  
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
                >
                  <span aria-hidden="true" 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                    🌐
                  </span>
                  {langState === "en" ? "EN" : "ع"}
                </button>

                <button
                  type="button"
                  
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
                >
                  <Bell 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                  <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                </button>

                <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                  Physician Portal /{" "}
                  <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Dashboard</span>
                </div>
              </div>
            </div>
          </header>

          <main 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <section 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <div>
                <h1 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                  {isArabic ? "لوحة موافقات الطبيب" : "Physician Consent Dashboard"}
                </h1>
                <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                  Thursday, 28 May 2026 · Surgical Day List Active
                </p>
              </div>

              <Link
                href="/modules/informed-consents/consent-creation-workflow"
                
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
              >
                <ChevronRight 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                {isArabic ? "موافقة جديدة" : "New Consent"}
              </Link>
            </section>

            <section 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                  <AlertCircle 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                  <span>
                    {isArabic
                      ? "توجد 3 موافقات بها إفصاحات إلزامية غير مكتملة — لا يمكن متابعة الإجراء حتى يتم حلها."
                      : "3 consents have incomplete mandatory disclosures — surgery cannot proceed until resolved."}
                  </span>
                </div>

                <Link
                  href="/modules/informed-consents/list"
                  
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
                >
                  {isArabic ? "عرض الكل" : "View All"}
                </Link>
              </div>
            </section>

            <section 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              {stats.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.label}
                    className={`rounded-lg border ${card.border} bg-white p-5 shadow-sm`}
                  >
                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      <div className={`rounded-md ${card.bg} p-2`}>
                        <Icon className={`h-4 w-4 ${card.tone}`} />
                      </div>
                      <span className={card.tone}>ⓘ</span>
                    </div>

                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      {card.value}
                    </div>

                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      {isArabic ? card.labelAr : card.label}
                    </div>
                  </div>
                );
              })}
            </section>

            <section 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                  <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                    <Library 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                    <h2 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      {isArabic
                        ? "مكتبة الموافقات المعتمدة"
                        : "IMC Approved Consent Library"}
                    </h2>
                  </div>

                  <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                    {isArabic
                      ? "تم ربط مكتبة الموافقات المعتمدة بمحرك البحث ومسار استعراض PDF."
                      : "The approved consent library is connected to search and PDF preview workflow."}
                  </p>
                </div>

                <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                  <ConsentSearchEngine />
                </div>
              </div>

              <aside 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                  <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      Overall Completion
                    </div>

                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                        88%
                      </div>
                      <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                        Blocked
                      </span>
                    </div>
                  </div>

                  <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                    {readinessItems.map((item) => (
                      <div key={item.label} 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                        <div
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${
                            item.done ? "text-emerald-600" : "text-slate-400"
                          }`}
                        >
                          {item.done ? (
                            <CheckCircle2 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                          ) : (
                            <Shield 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                          )}
                        </div>

                        <div>
                          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                            {isArabic ? item.labelAr : item.label}
                          </div>
                          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                            {item.done ? "Completed" : "Pending"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                  <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                    <h3 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      Risk Flags / المخاطر
                    </h3>
                  </div>

                  <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      IMC approved PDF matched, but runtime template mapping
                      requires verification.
                    </div>
                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      Draft PDF and patient link remain gated until readiness is
                      complete.
                    </div>
                  </div>
                </div>
              </aside>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}


