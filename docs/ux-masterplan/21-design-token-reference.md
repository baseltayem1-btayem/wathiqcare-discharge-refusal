# 21 — Design Token Reference

This document summarizes the design tokens exported from `apps/web/src/styles/design-tokens.ts`. Use these tokens for all new UI work instead of hard-coded values.

## Token Structure

```ts
import {
  colors,
  typography,
  spacing,
  radius,
  elevation,
  animation,
  breakpoints,
  layout,
  rtlFlipClass,
} from "@/styles/design-tokens";
```

## Colors

| Token | Value | Usage |
|-------|-------|-------|
| `colors.navy` | `#002B5C` | Primary brand navy |
| `colors.navyDark` | `#001A3A` | Deep navy backgrounds |
| `colors.navyMid` | `#15457C` | Interactive navy |
| `colors.blue` | `#1976D2` | Accent / focus rings |
| `colors.blueLight` | `#4B9CD3` | Hover accents |
| `colors.blueSoft` | `#EDF6FF` | Soft backgrounds |
| `colors.gold` | `#C9A13B` | Premium / eyebrow text |
| `colors.goldLight` | `#D4B467` | Gold hover |
| `colors.surface` | `#FFFFFF` | Cards and raised surfaces |
| `colors.surface2` | `#F8FBFD` | Subtle input backgrounds |
| `colors.background` | `#F4FAFC` | Page background |
| `colors.border` | `#D8E4EE` | Default borders |
| `colors.borderLight` | `#E9EFF6` | Footer/divider borders |
| `colors.text` | `#18324F` | Primary text |
| `colors.textMuted` | `#5E7289` | Secondary text |
| `colors.textLight` | `#8A9BB0` | Placeholder / hint text |
| `colors.error` | `#B91C1C` | Error text |
| `colors.errorSurface` | `#FFF5F5` | Error backgrounds |

## Typography

| Token | Value |
|-------|-------|
| `typography.family.sans` | `var(--font-inter)` |
| `typography.family.arabic` | `var(--font-arabic)` |
| `typography.weight.normal` | `400` |
| `typography.weight.medium` | `500` |
| `typography.weight.semibold` | `600` |
| `typography.weight.bold` | `700` |
| `typography.size.sm` | `0.875rem` |
| `typography.size.base` | `1rem` |
| `typography.size.lg` | `1.125rem` |
| `typography.size.xl` | `1.25rem` |
| `typography.size.xxl` | `1.5rem` |
| `typography.lineHeight.tight` | `1.25` |
| `typography.lineHeight.normal` | `1.5` |
| `typography.lineHeight.relaxed` | `1.65` |

## Spacing

Base unit is `4px`.

| Token | Value |
|-------|-------|
| `spacing[1]` | `4px` |
| `spacing[2]` | `8px` |
| `spacing[3]` | `12px` |
| `spacing[4]` | `16px` |
| `spacing[5]` | `20px` |
| `spacing[6]` | `24px` |
| `spacing[8]` | `32px` |
| `spacing[10]` | `40px` |
| `spacing[12]` | `48px` |
| `spacing[16]` | `64px` |

## Radius

| Token | Value |
|-------|-------|
| `radius.sm` | `6px` |
| `radius.md` | `10px` |
| `radius.lg` | `14px` |
| `radius.xl` | `18px` |
| `radius.2xl` | `28px` |
| `radius.full` | `999px` |

## Elevation

| Token | Value |
|-------|-------|
| `elevation.sm` | `0 2px 8px rgba(17, 47, 81, 0.08)` |
| `elevation.md` | `0 8px 24px rgba(17, 47, 81, 0.12)` |
| `elevation.lg` | `0 18px 48px rgba(17, 47, 81, 0.16)` |
| `elevation.xl` | `0 30px 70px rgba(17, 47, 81, 0.18)` |

## Animation

| Token | Value |
|-------|-------|
| `animation.duration.fast` | `120ms` |
| `animation.duration.normal` | `180ms` |
| `animation.duration.slow` | `300ms` |
| `animation.easing.default` | `cubic-bezier(.2, .8, .2, 1)` |

## Breakpoints

| Token | Value |
|-------|-------|
| `breakpoints.sm` | `640` |
| `breakpoints.md` | `768` |
| `breakpoints.lg` | `1024` |
| `breakpoints.xl` | `1280` |
| `breakpoints.2xl` | `1536` |

## Layout

| Token | Value |
|-------|-------|
| `layout.maxWidth.sm` | `640px` |
| `layout.maxWidth.md` | `768px` |
| `layout.maxWidth.lg` | `1024px` |
| `layout.maxWidth.xl` | `1280px` |
| `layout.maxWidth.2xl` | `1536px` |
| `layout.zIndex.base` | `0` |
| `layout.zIndex.dropdown` | `50` |
| `layout.zIndex.sticky` | `100` |
| `layout.zIndex.modal` | `200` |
| `layout.zIndex.toast` | `300` |

## RTL Helpers

- `rtlFlipClass = "rtl-flip"` — utility class to horizontally flip an icon in RTL layouts.

## Usage Example

```tsx
import { colors, radius, elevation } from "@/styles/design-tokens";

const style = {
  backgroundColor: colors.surface,
  borderRadius: radius.xl,
  boxShadow: elevation.lg,
};
```

For Tailwind users, the token values are mirrored as CSS custom properties in `globals.css` (e.g. `var(--wc-navy)`, `var(--wc-surface)`, `var(--wc-sh-md)`). Prefer the CSS variables in Tailwind arbitrary values and the typed tokens in TypeScript logic.
