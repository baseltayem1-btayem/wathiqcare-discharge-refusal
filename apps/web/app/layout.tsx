import type { Metadata } from "next";
import I18nProvider from "@/i18n/I18nProvider";
import { Toaster } from "@/components/make-ui/sonner";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased">
        <I18nProvider>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
