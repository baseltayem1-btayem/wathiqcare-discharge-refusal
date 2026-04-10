import type { ReactNode } from "react";
import I18nProvider from "@/i18n/I18nProvider";
import type { Language } from "@/lib/i18n";

interface LangLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function LangLayout({ children, params }: LangLayoutProps) {
  const { lang } = await params;
  const validLang: Language = lang === "en" ? "en" : "ar";

  return <I18nProvider initialLang={validLang}>{children}</I18nProvider>;
}

export function generateStaticParams() {
  return [{ lang: "ar" }, { lang: "en" }];
}
