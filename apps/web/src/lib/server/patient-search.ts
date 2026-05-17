type NormalizePatientSearchOptions = {
  enableUatMrnAlias?: boolean;
};

type NormalizedPatientSearchQuery = {
  trimmedQuery: string;
  canonicalQuery: string;
  containsQuery: string;
  mrnVariants: string[];
};

const MRN_PATTERN = /^[A-Z]+-\d{4}-\d+$/i;

function isTruthyEnvFlag(value: string | undefined): boolean {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isMrnLike(value: string): boolean {
  return MRN_PATTERN.test(value.trim());
}

function maybeApplyUatAlias(value: string, enabled: boolean): string {
  if (!enabled) {
    return value;
  }

  if (value.startsWith("MRN-")) {
    return `IMC-${value.slice(4)}`;
  }

  return value;
}

export function isUatMrnAliasEnabled(): boolean {
  return isTruthyEnvFlag(process.env.ENABLE_UAT_MRN_ALIAS);
}

export function normalizePatientSearchQuery(
  rawQuery: string,
  options: NormalizePatientSearchOptions = {},
): NormalizedPatientSearchQuery {
  const trimmedQuery = rawQuery.trim();
  const uppercaseQuery = trimmedQuery.toUpperCase();
  const enableUatMrnAlias = options.enableUatMrnAlias ?? false;
  const canonicalQuery = isMrnLike(trimmedQuery)
    ? maybeApplyUatAlias(uppercaseQuery, enableUatMrnAlias)
    : trimmedQuery;

  const mrnVariants = new Set<string>();

  if (isMrnLike(trimmedQuery)) {
    mrnVariants.add(uppercaseQuery);
    mrnVariants.add(canonicalQuery);

    if (enableUatMrnAlias && uppercaseQuery.startsWith("IMC-")) {
      mrnVariants.add(`MRN-${uppercaseQuery.slice(4)}`);
    }
  }

  return {
    trimmedQuery,
    canonicalQuery,
    containsQuery: trimmedQuery,
    mrnVariants: Array.from(mrnVariants),
  };
}