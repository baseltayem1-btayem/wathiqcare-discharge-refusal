import type { PatientLanguage } from "../types/workspace";

export function t(language: PatientLanguage, english: string, arabic: string): string {
  return language === "ar" ? arabic : english;
}
