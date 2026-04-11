import type { Metadata } from "next";
import { cookies } from "next/headers";
import I18nProvider from "@/i18n/I18nProvider";
import { Toaster } from "@/components/make-ui/sonner";
import { fontArabic, fontEnglish } from "@/lib/fonts";
import "./globals.css";

const CANONICAL_ORIGIN = "https://wathiqcare.online";

export const metadata: Metadata = {
  title: "WathiqCare",
  description: "WathiqCare discharge refusal workflow",
  metadataBase: new URL(CANONICAL_ORIGIN),
  alternates: {
    canonical: "/",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("wathiqcare_lang")?.value;
  const locale = langCookie === "ar" ? "ar" : "en";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${fontArabic.variable} ${fontEnglish.variable} scroll-smooth`}
    >
      <body className="antialiased">
        <I18nProvider>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
