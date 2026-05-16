import type { Metadata } from "next";
import { Toaster } from "@/components/make-ui/sonner";
import I18nProvider from "@/i18n/I18nProvider";
import "./globals.css";

const CANONICAL_ORIGIN = "https://wathiqcare.online";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WathiqCare",
  description: "WathiqCare discharge refusal workflow",
  metadataBase: new URL(CANONICAL_ORIGIN),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  alternates: {
    canonical: "/",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className="scroll-smooth"
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
