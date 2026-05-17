"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getTranslation, interpolate, isSupportedLanguage, type Language } from "@/lib/i18n";

type TranslateVars = Record<string, string | number>;

type I18nContextValue = {
  lang: Language;
  language: Language;
  isRtl: boolean;
  locale: string;
  setLang: (next: Language) => void;
  t: (key: string, vars?: TranslateVars) => string;
};

const LANGUAGE_STORAGE_KEY = "wathiqcare_lang";
const LANGUAGE_COOKIE_KEY = "wathiqcare_lang";

const I18nContext = createContext<I18nContextValue | undefined>(undefined);
const FALLBACK_LANG: Language = "en";

const FALLBACK_I18N_CONTEXT: I18nContextValue = {
  lang: FALLBACK_LANG,
  language: FALLBACK_LANG,
  isRtl: false,
  locale: "en-US",
  setLang: () => {
    // No-op fallback when provider context is unavailable.
  },
  t: (key, vars) => interpolate(getTranslation(FALLBACK_LANG, key), vars),
};

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

function getPathLang(pathname: string): Language | null {
  const match = pathname.match(/^\/(ar|en)(?:\/|$)/);
  if (match && isSupportedLanguage(match[1])) {
    return match[1];
  }
  return null;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    if (typeof console !== "undefined") {
      console.warn("useI18n provider missing; applying safe fallback locale context.");
    }
    return FALLBACK_I18N_CONTEXT;
  }
  return context;
}

function initializePreferredLang(initialLang?: Language): Language {
  if (initialLang) return initialLang;
  
  if (typeof document !== "undefined") {
    const cookie = getCookieLang();
    if (cookie) return cookie;
  }

  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(stored)) return stored;

    const browserLanguage = window.navigator.language.toLowerCase();
    if (browserLanguage.startsWith("ar")) return "ar";
  }

  return "en";
}

export default function I18nProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang?: Language;
}) {
  const pathname = usePathname() ?? "";
  const [preferredLang, setPreferredLang] = useState<Language>(() =>
    initializePreferredLang(initialLang)
  );

  const lang = useMemo<Language>(() => {
    const pathLang = pathname ? getPathLang(pathname) : null;
    if (pathLang) {
      return pathLang;
    }

    if (initialLang) {
      return initialLang;
    }

    return preferredLang;
  }, [initialLang, pathname, preferredLang]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const nextDirection = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = nextDirection;

    if (typeof window !== "undefined") {
      // Keep persistence aligned with effective locale source.
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
      language: lang,
      isRtl: lang === "ar",
      locale: lang === "ar" ? "ar-SA" : "en-US",
      setLang: setPreferredLang,
      t,
    }),
    [lang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
