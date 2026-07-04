/**
 * WathiqCare Design Tokens
 *
 * Single source of truth for visual values used by the design-system components.
 * These tokens mirror the CSS custom properties in globals.css and are exported
 * as plain TypeScript values for use in component logic, Storybook, tests, and
 * runtime calculations.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // Brand
  navy: "#002B5C",
  navyDark: "#001a3a",
  navyMid: "#0a3a74",
  blue: "#1976D2",
  blueLight: "#4B9CD3",
  blueSoft: "#EAF4FB",
  gold: "#C9A13B",
  goldSoft: "#FFF8E6",
  teal: "#14b8a6",

  // Surfaces
  bg: "#F4FAFC",
  surface: "#FFFFFF",
  surface2: "#F8FBFD",
  border: "#D8E4EE",
  borderLight: "#E8F0F6",

  // Text
  text: "#102A43",
  textMuted: "#5A6E82",
  textLight: "#8A9BB0",

  // States
  success: "#0A6B3A",
  successBg: "#E6F5EE",
  warning: "#A05D00",
  warningBg: "#FFF3DC",
  danger: "#B91C1C",
  dangerBg: "#FEE2E2",
  info: "#1976D2",
  infoBg: "#E3F0FA",

  // Dark mode placeholders (values to be finalized when dark mode is built)
  dark: {
    bg: "#0b1220",
    surface: "#111827",
    surface2: "#1f2937",
    border: "#374151",
    borderLight: "#273244",
    text: "#f3f4f6",
    textMuted: "#9ca3af",
    textLight: "#6b7280",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────────────────────────

export const typography = {
  family: {
    sans: 'var(--font-inter, "Inter", ui-sans-serif, system-ui, sans-serif)',
    arabic:
      'var(--font-arabic, "IBM Plex Sans Arabic", "DIN Next Arabic", sans-serif)',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  size: {
    xs: "0.75rem", // 12px
    sm: "0.85rem", // ~13.6px
    base: "0.95rem", // ~15.2px
    md: "1rem", // 16px
    lg: "1.15rem",
    xl: "1.5rem",
    "2xl": "2rem",
    "3xl": "2.75rem",
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.65,
  },
  letterSpacing: {
    tight: "-0.02em",
    normal: "-0.01em",
    wide: "0.04em",
    wider: "0.14em",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Spacing
// ─────────────────────────────────────────────────────────────────────────────

export const spacing = {
  0: "0px",
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  10: "40px",
  12: "48px",
  14: "56px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Border Radius
// ─────────────────────────────────────────────────────────────────────────────

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "18px",
  "2xl": "28px",
  "3xl": "32px",
  full: "999px",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Elevation (shadows)
// ─────────────────────────────────────────────────────────────────────────────

export const elevation = {
  sm: "0 1px 3px rgba(16,42,67,.06), 0 1px 2px rgba(16,42,67,.04)",
  md: "0 4px 12px rgba(16,42,67,.08), 0 2px 4px rgba(16,42,67,.04)",
  lg: "0 8px 20px rgba(16,42,67,.06)",
  xl: "0 24px 60px rgba(16,42,67,.12), 0 8px 20px rgba(16,42,67,.06)",
  button: "0 10px 26px rgba(0,43,92,.28)",
  buttonHover: "0 12px 30px rgba(0,43,92,.34)",
  topbar: "0 2px 12px rgba(0,43,92,.20)",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Animation
// ─────────────────────────────────────────────────────────────────────────────

export const animation = {
  duration: {
    fast: "120ms",
    normal: "160ms",
    slow: "180ms",
  },
  easing: {
    default: "cubic-bezier(.2,.8,.2,1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Breakpoints
// ─────────────────────────────────────────────────────────────────────────────

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

export const layout = {
  headerHeight: "56px",
  menuHeight: "44px",
  ribbonHeight: "42px",
  maxWidth: {
    sm: "560px",
    md: "680px",
    lg: "720px",
    xl: "1200px",
    "2xl": "1800px",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// RTL Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the logical start/end class names for a given value.
 * Useful when you need to flip a physical margin/padding/border for RTL.
 */
export const logical = {
  start: (value: string | number) => ({ marginInlineStart: value }),
  end: (value: string | number) => ({ marginInlineEnd: value }),
  paddingStart: (value: string | number) => ({ paddingInlineStart: value }),
  paddingEnd: (value: string | number) => ({ paddingInlineEnd: value }),
  borderStart: (value: string) => ({ borderInlineStart: value }),
  borderEnd: (value: string) => ({ borderInlineEnd: value }),
} as const;

/**
 * CSS class that horizontally flips an icon in RTL contexts.
 * Add this class to directional icons (arrows, chevrons) so they mirror
 * automatically when the parent has `dir="rtl"`.
 */
export const rtlFlipClass = "rtl-flip";

// ─────────────────────────────────────────────────────────────────────────────
// Token Aggregates
// ─────────────────────────────────────────────────────────────────────────────

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  elevation,
  animation,
  breakpoints,
  layout,
  logical,
  rtlFlipClass,
} as const;

export default tokens;
