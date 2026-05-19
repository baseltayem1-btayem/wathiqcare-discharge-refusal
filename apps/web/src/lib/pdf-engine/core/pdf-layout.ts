export { resolvePdfDirection } from "@/lib/pdf-engine/core/pdf-rtl";

export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatEvidenceValue(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? escapeHtml(normalized) : "—";
}

export function renderDefinitionRows(rows: ReadonlyArray<{ label: string; value: string }>): string {
  return rows
    .map(
      (row) => `
        <div class="wc-pdf-kv-row">
          <div class="wc-pdf-kv-label">${escapeHtml(row.label)}</div>
          <div class="wc-pdf-kv-value">${row.value}</div>
        </div>`
    )
    .join("");
}

export function renderSection(title: string, contentHtml: string): string {
  return `
    <section class="wc-pdf-section">
      <h2 class="wc-pdf-section-title">${escapeHtml(title)}</h2>
      <div class="wc-pdf-section-body">${contentHtml}</div>
    </section>`;
}