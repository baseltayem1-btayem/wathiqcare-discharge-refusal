"use client";

type Status = "pending" | "approved" | "signed" | "expired" | "review" | "anesthesia" | "sent";

const config: Record<Status, { bg: string; text: string; dot: string; label: { en: string; ar: string } }> = {
  pending:    { bg: "#FFF8E8", text: "#D9A93B", dot: "#D9A93B", label: { en: "Pending",    ar: "&ع" } },
  approved:   { bg: "#E8F9F4", text: "#19A978", dot: "#19A978", label: { en: "Approved",   ar: "معتمد" } },
  signed:     { bg: "#EAF6FF", text: "#2F90C7", dot: "#2F90C7", label: { en: "Signed",     ar: "&ع" } },
  expired:    { bg: "#FFEAEA", text: "#d4183d", dot: "#d4183d", label: { en: "Expired",    ar: "منتهي" } },
  review:     { bg: "#F1EFFF", text: "#6B5CE7", dot: "#6B5CE7", label: { en: "In Review",  ar: "`د ا&راجعة" } },
  anesthesia: { bg: "#EAFFFB", text: "#12B7B5", dot: "#12B7B5", label: { en: "Anesthesia", ar: "تخدير" } },
  sent:       { bg: "#E8F9F4", text: "#19A978", dot: "#19A978", label: { en: "Link Sent",  ar: "ت& اإرسا" } },
};

interface Props {
  status: Status;
  lang?: "en" | "ar";
  customLabel?: string;
}

export function StatusBadge({ status, lang = "en", customLabel }: Props) {
  const c = config[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {customLabel ?? (lang === "en" ? c.label.en : c.label.ar)}
    </span>
  );
}




