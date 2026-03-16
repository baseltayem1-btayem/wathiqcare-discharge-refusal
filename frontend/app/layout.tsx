import type { Metadata } from "next";
import { Manrope, Geist_Mono, Noto_Kufi_Arabic } from "next/font/google";
import I18nProvider from "@/i18n/I18nProvider";
import AppProviders from "@/providers/AppProviders";
import { Toaster } from "@/components/make-ui/sonner";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansArabic = Noto_Kufi_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "WathiqCare",
  description: "WathiqCare discharge refusal workflow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${manrope.variable} ${geistMono.variable} ${notoSansArabic.variable} antialiased`}>
        <I18nProvider>
          <AppProviders>
            {children}
            <Toaster />
          </AppProviders>
        </I18nProvider>
      </body>
    </html>
  );
}
