/**
 * Legal-Grade Consent Design System — Print Tokens
 *
 * Print/PDF-safe layout rules. Applied as CSS @page + @media print.
 */

export const CONSENT_PRINT = {
  pageSize: "A4",
  pageMargin: "18mm 16mm 22mm 16mm",

  // Avoid orphans/widows
  orphans: 3,
  widows: 3,

  // Keep critical blocks together on print
  keepTogether: "page-break-inside: avoid; break-inside: avoid;",
  pageBreakBefore: "page-break-before: always; break-before: page;",
  pageBreakAfter: "page-break-after: always; break-after: page;",

  // Footer reserved height for QR / audit hash
  footerReserveHeight: "26mm",
} as const;

export type ConsentPrint = typeof CONSENT_PRINT;
