import type { PatientLanguage, TextSize } from "../types/workspace";

export function t(lang: PatientLanguage, en: string, ar: string): string {
  return lang === "ar" ? ar : en;
}

export function textSizeClass(size: TextSize): string {
  switch (size) {
    case "large":
      return "text-base";
    case "extra-large":
      return "text-lg";
    default:
      return "text-sm";
  }
}

export function headingSizeClass(size: TextSize): string {
  switch (size) {
    case "large":
      return "text-xl";
    case "extra-large":
      return "text-2xl";
    default:
      return "text-lg";
  }
}
