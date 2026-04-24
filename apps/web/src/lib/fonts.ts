import { Almarai, Inter } from "next/font/google";

export const fontArabic = Almarai({
  subsets: ["arabic"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-arabic",
  display: "swap",
});

export const fontEnglish = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-english",
  display: "swap",
});
