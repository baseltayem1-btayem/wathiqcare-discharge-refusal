import ar from "@/locales/ar.json";
import en from "@/locales/en.json";
import arCommon from "@/locales/ar/common.json";
import enCommon from "@/locales/en/common.json";

export type Language = "en" | "ar";

type TranslationLeaf = string;
type TranslationArray = TranslationNode[];
type TranslationNode = TranslationLeaf | TranslationTree | TranslationArray;
type TranslationTree = {
  [key: string]: TranslationNode;
};

type TranslateVars = Record<string, string | number>;

const dictionaries: Record<Language, TranslationTree> = {
  en: { ...(en as TranslationTree), ...(enCommon as TranslationTree) },
  ar: { ...(ar as TranslationTree), ...(arCommon as TranslationTree) },
};

function getNestedValue(tree: TranslationTree, path: string): string | undefined {
  const direct = tree[path];
  if (typeof direct === "string") {
    return direct;
  }

  const parts = path.split(".");
  let cursor: TranslationNode | undefined = tree;

  for (const part of parts) {
    if (!cursor || typeof cursor === "string") {
      return undefined;
    }

    if (Array.isArray(cursor)) {
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0 || index >= cursor.length) {
        return undefined;
      }
      cursor = cursor[index];
      continue;
    }

    if (!(part in cursor)) {
      return undefined;
    }

    cursor = cursor[part] as TranslationNode;
  }

  return typeof cursor === "string" ? cursor : undefined;
}

export function isSupportedLanguage(value: string | null): value is Language {
  return value === "en" || value === "ar";
}

export function getTranslation(language: Language, key: string): string {
  const primary = getNestedValue(dictionaries[language], key);
  if (primary !== undefined) {
    return primary;
  }

  const fallback = getNestedValue(dictionaries.en, key);
  if (fallback !== undefined) {
    return fallback;
  }

  return key;
}

export function interpolate(template: string, vars?: TranslateVars): string {
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

export function getDictionaries(): Record<Language, TranslationTree> {
  return dictionaries;
}
