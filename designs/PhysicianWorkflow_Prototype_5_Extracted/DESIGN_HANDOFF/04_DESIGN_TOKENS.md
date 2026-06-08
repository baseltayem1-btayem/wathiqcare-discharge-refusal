# WathiqCare Physician Workflow - Design Tokens

## Color Tokens

### Brand Colors
```css
--color-brand-royal-blue: #002B5C;
--color-brand-luxury-gold: #C9A13B;
--color-brand-dark-gray: #2F2F2F;
--color-brand-white: #FFFFFF;
--color-brand-light-blue: #4B9CD3;
```

### Semantic Colors

**Primary**
```css
--color-primary-50: #EFF6FF;
--color-primary-100: #DBEAFE;
--color-primary-500: #3B82F6;
--color-primary-600: #2563EB;
--color-primary-700: #1D4ED8;
--color-primary-900: #002B5C; /* Brand Royal Blue */
```

**Success**
```css
--color-success-50: #D1FAE5;
--color-success-100: #A7F3D0;
--color-success-600: #10B981;
--color-success-700: #059669;
--color-success-900: #065F46;
```

**Warning**
```css
--color-warning-50: #FEF3C7;
--color-warning-100: #FDE68A;
--color-warning-600: #F59E0B;
--color-warning-700: #D97706;
--color-warning-900: #92400E;
```

**Error / Critical**
```css
--color-error-50: #FEE2E2;
--color-error-100: #FECACA;
--color-error-600: #EF4444;
--color-error-700: #DC2626;
--color-error-900: #991B1B;
```

**Neutral / Gray Scale**
```css
--color-gray-50: #F8FAFC;
--color-gray-100: #F3F4F6;
--color-gray-200: #E5E7EB;
--color-gray-300: #D8DCE3;
--color-gray-400: #9CA3AF;
--color-gray-500: #6B7280;
--color-gray-600: #4B5563;
--color-gray-700: #374151;
--color-gray-800: #2F2F2F; /* Brand Dark Gray */
--color-gray-900: #1F2937;
```

### Background Colors
```css
--bg-app: #F4F7FB; /* Soft clinical gray */
--bg-surface: #FFFFFF; /* Cards, panels */
--bg-sidebar: #002B5C; /* Brand Royal Blue */
--bg-header: #FFFFFF;
--bg-panel: #F8FAFC;
```

### Text Colors
```css
--text-primary: #2F2F2F;
--text-secondary: #6B7280;
--text-tertiary: #9CA3AF;
--text-inverse: #FFFFFF;
--text-link: #3B82F6;
--text-link-hover: #2563EB;
```

### Border Colors
```css
--border-default: #D8DCE3;
--border-hover: #9CA3AF;
--border-focus: #002B5C;
--border-error: #EF4444;
--border-warning: #F59E0B;
--border-success: #10B981;
```

### Status Colors
```css
/* Sync Status */
--status-synced: #10B981;
--status-pending: #F59E0B;
--status-failed: #EF4444;
--status-manual: #6B7280;

/* Consent Lifecycle */
--status-draft: #6B7280;
--status-sent: #3B82F6;
--status-opened: #8B5CF6;
--status-verified: #10B981;
--status-signed: #059669;
--status-completed: #065F46;

/* Review Status */
--status-review-required: #F59E0B;
--status-review-requested: #3B82F6;
--status-review-in-progress: #8B5CF6;
--status-review-approved: #10B981;
```

### IMC Approved Colors
```css
--imc-approved-bg: #FEF3C7;
--imc-approved-border: #C9A13B;
--imc-approved-text: #92400E;
--imc-approved-icon: #C9A13B;
```

---

## Typography Tokens

### Font Families
```css
--font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-family-monospace: 'SF Mono', 'Monaco', 'Courier New', monospace;
--font-family-arabic: 'Inter', 'Noto Sans Arabic', sans-serif;
```

### Font Sizes
```css
--font-size-xs: 10px;   /* Tiny labels, badges */
--font-size-sm: 12px;   /* Secondary text, captions */
--font-size-base: 13px; /* Body text, table cells */
--font-size-md: 14px;   /* Primary body, buttons */
--font-size-lg: 16px;   /* Card titles, headings */
--font-size-xl: 20px;   /* Page titles */
--font-size-2xl: 24px;  /* Main headings */
--font-size-3xl: 32px;  /* Dashboard counts */
```

### Font Weights
```css
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Line Heights
```css
--line-height-tight: 1.25;   /* Headings */
--line-height-normal: 1.5;   /* Body text */
--line-height-relaxed: 1.6;  /* Long-form text */
--line-height-loose: 1.75;   /* Disclosure fields */
```

### Letter Spacing
```css
--letter-spacing-tight: -0.01em;
--letter-spacing-normal: 0;
--letter-spacing-wide: 0.05em; /* Uppercase labels */
```

---

## Spacing Tokens

### Base Spacing Scale (8px grid)
```css
--space-0: 0;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
```

### Semantic Spacing
```css
/* Component Internal Spacing */
--spacing-card-padding: 24px;
--spacing-input-padding-x: 16px;
--spacing-input-padding-y: 12px;
--spacing-button-padding-x: 20px;
--spacing-button-padding-y: 10px;
--spacing-badge-padding-x: 10px;
--spacing-badge-padding-y: 4px;

/* Layout Spacing */
--spacing-page-padding: 32px;
--spacing-section-gap: 32px;
--spacing-card-gap: 16px;
--spacing-field-gap: 12px;

/* Component Gaps */
--gap-icon-text: 8px;
--gap-stepper-items: 12px;
--gap-timeline-items: 24px;
--gap-validation-items: 12px;
```

---

## Radius Tokens

```css
--radius-none: 0;
--radius-sm: 4px;     /* Small badges */
--radius-md: 8px;     /* Buttons, inputs */
--radius-lg: 12px;    /* Cards, panels */
--radius-xl: 16px;    /* Large cards */
--radius-full: 9999px; /* Pills, avatars */
```

---

## Shadow Tokens

```css
--shadow-none: none;
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-base: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 10px 15px rgba(0, 0, 0, 0.1);

/* Focus Ring */
--shadow-focus: 0 0 0 2px rgba(0, 43, 92, 0.2);

/* Selected State */
--shadow-selected: 0 0 0 4px rgba(0, 43, 92, 0.12);
```

---

## Border Tokens

```css
--border-width-thin: 1px;
--border-width-medium: 2px;
--border-width-thick: 3px;
--border-width-emphasis: 4px; /* Left border for alerts */

--border-style-solid: solid;
--border-style-dashed: dashed;
```

---

## Size Tokens

### Component Heights
```css
--height-input-sm: 36px;
--height-input-md: 44px;
--height-input-lg: 52px;
--height-button-sm: 36px;
--height-button-md: 44px;
--height-button-lg: 52px;
--height-badge-sm: 20px;
--height-badge-md: 24px;
--height-badge-lg: 32px;
--height-header: 64px;
--height-stepper: 60px;
--height-patient-summary-bar: 56px;
```

### Component Widths
```css
--width-sidebar: 240px;
--width-validation-panel: 30%; /* 30% of viewport */
--width-validation-panel-min: 320px;
--width-icon-sm: 16px;
--width-icon-md: 20px;
--width-icon-lg: 24px;
--width-icon-xl: 48px;
--width-avatar-sm: 32px;
--width-avatar-md: 40px;
--width-avatar-lg: 48px;
```

### Layout Breakpoints
```css
--breakpoint-mobile: 390px;
--breakpoint-tablet: 1024px;
--breakpoint-desktop: 1440px;
--breakpoint-wide: 1920px;
```

---

## Z-Index Tokens

```css
--z-index-base: 0;
--z-index-dropdown: 1000;
--z-index-sticky: 1020;
--z-index-fixed: 1030;
--z-index-modal-backdrop: 1040;
--z-index-modal: 1050;
--z-index-popover: 1060;
--z-index-tooltip: 1070;
--z-index-notification: 1080;
```

---

## Animation / Transition Tokens

```css
--transition-fast: 150ms ease-in-out;
--transition-base: 200ms ease-in-out;
--transition-slow: 300ms ease-in-out;

--animation-spin: spin 1s linear infinite;
--animation-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
--animation-bounce: bounce 1s infinite;
```

---

## Button Tokens

### Primary Button
```css
--button-primary-bg: #002B5C;
--button-primary-bg-hover: #001F45;
--button-primary-bg-active: #001835;
--button-primary-bg-disabled: #D8DCE3;
--button-primary-text: #FFFFFF;
--button-primary-text-disabled: #9CA3AF;
```

### Secondary Button
```css
--button-secondary-bg: #FFFFFF;
--button-secondary-border: #D8DCE3;
--button-secondary-border-hover: #9CA3AF;
--button-secondary-text: #6B7280;
--button-secondary-text-hover: #2F2F2F;
```

### Danger Button
```css
--button-danger-bg: #EF4444;
--button-danger-bg-hover: #DC2626;
--button-danger-text: #FFFFFF;
```

---

## Card Tokens

```css
--card-bg: #FFFFFF;
--card-border: #D8DCE3;
--card-border-hover: #9CA3AF;
--card-border-selected: #002B5C;
--card-border-width: 1px;
--card-border-width-selected: 2px;
--card-radius: 12px;
--card-padding: 24px;
--card-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
--card-shadow-hover: 0 2px 4px rgba(0, 0, 0, 0.1);
```

---

## Badge Tokens

### Critical Badge
```css
--badge-critical-bg: #FEE2E2;
--badge-critical-border: #EF4444;
--badge-critical-text: #991B1B;
--badge-critical-icon: #EF4444;
```

### Warning Badge
```css
--badge-warning-bg: #FEF3C7;
--badge-warning-border: #F59E0B;
--badge-warning-text: #92400E;
--badge-warning-icon: #F59E0B;
```

### Ready Badge
```css
--badge-ready-bg: #D1FAE5;
--badge-ready-border: #10B981;
--badge-ready-text: #065F46;
--badge-ready-icon: #10B981;
```

### IMC Approved Badge
```css
--badge-imc-bg: #FEF3C7;
--badge-imc-border: #C9A13B;
--badge-imc-text: #92400E;
--badge-imc-icon: #C9A13B;
```

---

## RTL/LTR Layout Tokens

```css
/* Direction-aware spacing */
--spacing-start: padding-left; /* LTR */
--spacing-start-rtl: padding-right; /* RTL */
--spacing-end: padding-right; /* LTR */
--spacing-end-rtl: padding-left; /* RTL */

/* Text alignment */
--text-align-start: left; /* LTR */
--text-align-start-rtl: right; /* RTL */
--text-align-end: right; /* LTR */
--text-align-end-rtl: left; /* RTL */

/* Border placement */
--border-start: border-left; /* LTR */
--border-start-rtl: border-right; /* RTL */
```

### RTL Transformation Rules
```css
/* For RTL layout */
[dir="rtl"] {
  direction: rtl;
}

[dir="rtl"] .sidebar {
  border-right: none;
  border-left: var(--border-width-thin) solid var(--border-default);
}

[dir="rtl"] .icon-directional {
  transform: scaleX(-1);
}
```

---

## Accessibility Tokens

```css
--focus-ring-width: 2px;
--focus-ring-color: rgba(0, 43, 92, 0.2);
--focus-ring-offset: 2px;

--min-touch-target: 44px;
--min-click-target: 32px;

--contrast-aa-normal: 4.5;
--contrast-aa-large: 3.0;
--contrast-aaa-normal: 7.0;
```

---

## Usage Examples

### CSS Custom Properties Implementation

```css
:root {
  /* Colors */
  --color-primary: var(--color-brand-royal-blue);
  --color-accent: var(--color-brand-luxury-gold);
  
  /* Typography */
  --font-body: var(--font-family-primary);
  --text-size-body: var(--font-size-md);
  
  /* Spacing */
  --space-card: var(--spacing-card-padding);
  --space-section: var(--spacing-section-gap);
  
  /* Components */
  --button-height: var(--height-button-md);
  --button-radius: var(--radius-md);
}

/* Arabic override */
:root[lang="ar"] {
  --font-body: var(--font-family-arabic);
  direction: rtl;
}
```

### Component Usage

```css
.patient-card {
  background: var(--card-bg);
  border: var(--card-border-width) solid var(--card-border);
  border-radius: var(--card-radius);
  padding: var(--card-padding);
  box-shadow: var(--card-shadow);
  transition: var(--transition-base);
}

.patient-card:hover {
  border-color: var(--card-border-hover);
  box-shadow: var(--card-shadow-hover);
}

.patient-card.selected {
  border-width: var(--card-border-width-selected);
  border-color: var(--card-border-selected);
  background: var(--color-primary-50);
}
```

### Button Usage

```css
.button-primary {
  height: var(--button-height);
  padding: 0 var(--button-padding-x);
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--button-radius);
  transition: var(--transition-base);
}

.button-primary:hover {
  background: var(--button-primary-bg-hover);
}

.button-primary:disabled {
  background: var(--button-primary-bg-disabled);
  color: var(--button-primary-text-disabled);
  cursor: not-allowed;
}
```

---

## Design Token Export Formats

### JSON Format
```json
{
  "color": {
    "brand": {
      "royal-blue": "#002B5C",
      "luxury-gold": "#C9A13B",
      "dark-gray": "#2F2F2F"
    },
    "primary": {
      "50": "#EFF6FF",
      "900": "#002B5C"
    }
  },
  "spacing": {
    "card-padding": "24px",
    "section-gap": "32px"
  }
}
```

### Tailwind Config
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'brand-blue': '#002B5C',
        'brand-gold': '#C9A13B',
        'brand-gray': '#2F2F2F',
      },
      spacing: {
        'card': '24px',
        'section': '32px',
      }
    }
  }
}
```

---

**Document Version**: 1.0  
**Last Updated**: 8 June 2026  
**Purpose**: Design token system for WathiqCare Physician Workflow
