/**
 * Centralized governed overlay appearance constants for IMC AcroForm-backed
 * consent forms.
 *
 * These values control every field-addressed overlay rendered onto the approved
 * canonical PDF. They must not be duplicated in unrelated files; importing this
 * module is the single source of truth for governed overlay styling.
 */

export const GOVERNED_OVERLAY_COLOR = "#0066FF";

/**
 * Long clinical and multiline values use a medium weight for readability across
 * dense paragraphs while staying visually distinct from the printed black source.
 */
export const GOVERNED_OVERLAY_FONT_WEIGHT = 500;

/**
 * Patient identity fields (patient header, consent name, physician/substitute
 * names, designations, contacts) use a slightly heavier weight so short legal
 * identifiers remain scannable.
 */
export const GOVERNED_OVERLAY_IDENTITY_FONT_WEIGHT = 600;

/**
 * A very short identity value (e.g., a single initial or short label) may use
 * 700 only when it demonstrably improves readability. This is reserved for
 * exceptional cases and must not be the default.
 */
export const GOVERNED_OVERLAY_SHORT_IDENTITY_FONT_WEIGHT = 700;

/**
 * Maximum weight applied to any governed overlay text. Used as an upper bound
 * for safety checks.
 */
export const GOVERNED_OVERLAY_MAX_FONT_WEIGHT = 700;

export const GOVERNED_OVERLAY_OPACITY = 1;

/**
 * Minimum padding inside every governed field box. Horizontal padding keeps
 * text away from vertical borders; vertical padding lifts the text baseline
 * above the printed writing line.
 */
export const GOVERNED_OVERLAY_HORIZONTAL_PADDING_PT = 3;
export const GOVERNED_OVERLAY_VERTICAL_PADDING_PT = 2;

/**
 * Baseline lift as a fraction of the field box height. The rendered text
 * baseline is kept above the bottom edge so it never sits directly on a
 * printed underline.
 */
export const GOVERNED_OVERLAY_BASELINE_LIFT_RATIO = 0.16;

/**
 * Governed minimum font sizes. Clinical/legal content must never render below
 * 7pt; identity fields must never render below 8pt. The renderer must fail
 * closed if the full value cannot fit above these minima.
 */
export const GOVERNED_OVERLAY_MIN_CLINICAL_FONT_SIZE_PT = 7;
export const GOVERNED_OVERLAY_MIN_IDENTITY_FONT_SIZE_PT = 8;

/**
 * Line heights for overlay text. Multiline clinical fields use 1.25 for
 * readability; short single-line identity fields use 1.15 for tight vertical
 * fitting in header boxes.
 */
export const GOVERNED_OVERLAY_MULTILINE_LINE_HEIGHT = 1.25;
export const GOVERNED_OVERLAY_SINGLE_LINE_HEIGHT = 1.15;
