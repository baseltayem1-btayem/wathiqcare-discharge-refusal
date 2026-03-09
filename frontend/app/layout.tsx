import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import I18nProvider from "@/i18n/I18nProvider";
import UiRootShell from "@/ui/layout/UiRootShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansArabic = Noto_Sans_Arabic({
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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${notoSansArabic.variable} antialiased`}>
        <I18nProvider>
          <UiRootShell>{children}</UiRootShell>
        </I18nProvider>
      </body>
    </html>
  );
}
