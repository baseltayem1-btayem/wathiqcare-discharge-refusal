"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Language, translations } from "@/i18n/translations";

type TranslateVars = Record<string, string | number>;

type I18nContextValue = {
  lang: Language;
  isRtl: boolean;
  locale: string;
  setLang: (next: Language) => void;
  t: (key: string, vars?: TranslateVars) => string;
};

const LANGUAGE_STORAGE_KEY = "wathiqcare_lang";

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) {
    return template;
  }

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    if (!(key in vars)) {
      return `{${key}}`;
    }
    return String(vars[key]);
  });
}

function isSupportedLanguage(value: string | null): value is Language {
  return value === "en" || value === "ar";
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export default function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === "undefined") {
      return "en";
    }

    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(stored)) {
      return stored;
    }

    const browserLanguage = window.navigator.language.toLowerCase();
    if (browserLanguage.startsWith("ar")) {
      return "ar";
    }

    return "en";
  });

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const nextDirection = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = nextDirection;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  }, [lang]);

  const t = useCallback(
    (key: string, vars?: TranslateVars) => {
      const source = translations[lang][key] ?? translations.en[key] ?? key;
      return interpolate(source, vars);
    },
    [lang]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      isRtl: lang === "ar",
      locale: lang === "ar" ? "ar-SA" : "en-US",
      setLang: setLangState,
      t,
    }),
    [lang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
