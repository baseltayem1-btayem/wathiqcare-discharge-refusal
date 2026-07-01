import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "../styles/globals.css";
import ConditionalNav from "../components/ConditionalNav";
import I18nProvider from "@/i18n/I18nProvider";
import { isSupportedLanguage, type Language } from "@/lib/i18n";

// Self-hosted via next/font — no external CDN, no CSP changes needed
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | WathiqCare™",
    default: "WathiqCare™ | Enterprise Healthcare Legal Automation Platform",
  },
  description: "Healthcare consent, clinical-legal workflows, and audit-ready governance — governed from request to signature.",
  metadataBase: new URL("https://wathiqcare.online"),
  openGraph: {
    siteName: "WathiqCare™",
    type: "website",
    locale: "en_US",
  },
};

async function resolveInitialLang(): Promise<Language> {
  try {
    const cookieStore = await cookies();
    const cookieLang = cookieStore.get("wathiqcare_lang")?.value;
    if (cookieLang && isSupportedLanguage(cookieLang)) {
      return cookieLang;
    }
  } catch {
    // cookies() may throw in static/export contexts; fall back to LTR default.
  }
  return "en";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialLang = await resolveInitialLang();
  const dir = initialLang === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={initialLang}
      dir={dir}
      data-scroll-behavior="smooth"
      className={`scroll-smooth ${inter.variable} ${ibmPlexSansArabic.variable}`}
    >
      <body>
        <I18nProvider initialLang={initialLang}>
          <ConditionalNav />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
