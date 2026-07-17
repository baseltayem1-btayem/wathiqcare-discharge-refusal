/**
 * Centralized governed overlay appearance constants for IMC AcroForm-backed
 * consent forms.
 *
 * These values control every field-addressed overlay rendered onto the approved
 * canonical PDF. They must not be duplicated in unrelated files; importing this
 * module is the single source of truth for governed overlay styling.
 */

export const GOVERNED_OVERLAY_COLOR = "#0066FF";
export const GOVERNED_OVERLAY_FONT_WEIGHT = 600;
export const GOVERNED_OVERLAY_OPACITY = 1;

/**
 * Identity fields (patient header, consent name, physician/substitute names,
 * designations, contacts) may compress further but can render slightly heavier
 * for readability when the value is short enough.
 */
export const GOVERNED_OVERLAY_IDENTITY_FONT_WEIGHT = 700;

/**
 * Minimum padding inside every governed field box. Horizontal padding keeps
 * text away from vertical borders; vertical padding lifts the text baseline
 * above the printed writing line.
 */
export const GOVERNED_OVERLAY_HORIZONTAL_PADDING_PT = 2;
export const GOVERNED_OVERLAY_VERTICAL_PADDING_PT = 1.5;

/**
 * Baseline lift as a fraction of the field box height. The rendered text
 * baseline is kept above the bottom edge so it never sits directly on a
 * printed underline.
 */
export const GOVERNED_OVERLAY_BASELINE_LIFT_RATIO = 0.18;
