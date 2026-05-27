/**
 * Tiny class-name joiner for the ui-refresh scaffold. Local to this
 * folder so we don't drag in `clsx` or alter the workspace's existing
 * cn() conventions. Pure UI helper — no behaviour.
 */
export function cn(
  ...args: Array<string | false | null | undefined>
): string {
  return args.filter(Boolean).join(" ");
}

export type Lang = "ar" | "en";

export function dirFor(lang: Lang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

export function rowDir(lang: Lang): string {
  return lang === "ar" ? "flex-row-reverse" : "flex-row";
}

export function textAlign(lang: Lang): string {
  return lang === "ar" ? "text-right" : "text-left";
}
