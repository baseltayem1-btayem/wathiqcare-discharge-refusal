import { useI18n } from "@/i18n/I18nProvider";

export function useTranslations() {
  const { t, lang: locale, isRtl, setLang, locale: localeTag } = useI18n();

  return {
    t,
    locale,
    localeTag,
    isRtl,
    setLocale: setLang,
  };
}
