"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import { getTranslation, interpolate, isSupportedLanguage, type Language } from "@/lib/i18n";

type TranslateVars = Record<string, string | number>;

type I18nContextValue = {
  lang: Language;
  isRtl: boolean;
  locale: string;
  setLang: (next: Language) => void;
  t: (key: string, vars?: TranslateVars) => string;
};

const LANGUAGE_STORAGE_KEY = "wathiqcare_lang";
const LANGUAGE_COOKIE_KEY = "wathiqcare_lang";

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function getCookieLang(): Language | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )wathiqcare_lang=([^;]*)/);
  if (match && isSupportedLanguage(match[1])) return match[1];
  return null;
}

function setCookieLang(lang: Language) {
  if (typeof document === "undefined") return;
  document.cookie = `${LANGUAGE_COOKIE_KEY}=${lang};path=/;max-age=31536000;SameSite=Lax`;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export default function I18nProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang?: Language;
}) {
  const didInit = useRef(false);
  const [lang, setLangState] = useState<Language>(() => {
    // Server-seeded lang from URL takes highest priority
    if (initialLang) return initialLang;

    if (typeof window === "undefined") {
      return "en";
    }

    const cookie = getCookieLang();
    if (cookie) return cookie;

    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(stored)) return stored;

    const browserLanguage = window.navigator.language.toLowerCase();
    if (browserLanguage.startsWith("ar")) {
      return "ar";
    }

    return "en";
  });

  // Sync initialLang changes (e.g. navigating /ar → /en)
  useEffect(() => {
    if (initialLang && initialLang !== lang) {
      setLangState(initialLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLang]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const nextDirection = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = nextDirection;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setCookieLang(lang);
    }
  }, [lang]);

  const t = useCallback(
    (key: string, vars?: TranslateVars) => {
      const source = getTranslation(lang, key);
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
