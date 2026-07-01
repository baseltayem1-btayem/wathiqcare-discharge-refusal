# 20 — Component Catalog

This catalog lists the reusable components introduced or extended during VE-02. All components live under `apps/web/src/components/design-system/` and are exported from `index.ts`.

## Layout Primitives

### `Container`
- **File:** `container.tsx`
- **Props:** `as`, `size` (`sm` | `md` | `lg` | `xl` | `full`), `className`, `children`
- **Use:** Page-level width constraint with consistent horizontal padding.

### `Stack`
- **File:** `stack.tsx`
- **Props:** `direction`, `gap`, `align`, `justify`, `wrap`, `className`, `children`
- **Use:** Flex-based vertical/horizontal stacking.

### `Grid`
- **File:** `grid.tsx`
- **Props:** `cols`, `rows`, `gap`, `responsive`, `className`, `children`
- **Use:** Responsive CSS-grid wrapper.

### `Section`
- **File:** `section.tsx`
- **Props:** `spacing` (`none` | `sm` | `md` | `lg` | `xl`), `className`, `children`
- **Use:** Semantic section with standard vertical spacing presets.

## Primitives

### `Button`
- **File:** `button.tsx`
- **Variants:** `default`, `outline`, `ghost`, `destructive`, `success`, `secondary`, `dashed`, `brand`
- **Sizes:** `default`, `sm`, `lg`, `xl`, `2xl`, `icon`
- **Extra props:** `fullWidth`, `uppercase`
- **Use:** Primary CTA (`brand`), secondary actions (`secondary`), destructive actions, icon-only buttons.

### `Input`
- **File:** `input.tsx`
- **Sizes:** `sm`, `default`, `lg`, `xl`
- **Extra props:** `startIcon`, `endIcon`, `error`
- **Use:** Form text inputs; icons are rendered inside the input wrapper.

### `Card`
- **File:** `card.tsx`
- **Variants:** `default`, `login`
- **Subcomponents:** `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- **Use:** Content panels; `login` variant supplies the approved login card radius/shadow.

### `Badge`
- **File:** `badge.tsx`
- **Variants:** `default`, `secondary`, `destructive`, `outline`, `success`, `warning`
- **Sizes:** `default`, `sm`, `lg`
- **Use:** Status labels and counts.

### `Divider`
- **File:** `divider.tsx`
- **Props:** `orientation`, `className`
- **Use:** Horizontal or vertical separators.

## Feedback & Empty States

### `Alert`
- **File:** `alert.tsx`
- **Variants:** `default`, `error`, `success`, `warning`, `info`
- **Subcomponents:** `AlertTitle`, `AlertDescription`
- **Use:** Inline validation messages, system warnings, success confirmations.

### `EmptyState`
- **File:** `empty-state.tsx`
- **Props:** `icon`, `title`, `description`, `action`
- **Use:** Empty list/table screens with a primary action.

### `LoadingState`
- **File:** `loading-state.tsx`
- **Props:** `message`, `size`
- **Use:** Full-section or inline loading placeholders.

## Page Chrome

### `PageHeader`
- **File:** `page-header.tsx`
- **Props:** `title`, `subtitle`, `actions`, `backHref`, `className`
- **Use:** Consistent page title area with optional back link and action buttons.

## Form Helpers

### `Form`
- **File:** `form.tsx`
- **Props:** standard `<form>` props + `className`
- **Use:** Wraps forms; passes through native behavior.

### `FormField`
- **File:** `form.tsx`
- **Props:** `name`, `label`, `htmlFor`, `error`, `className`, `labelClassName`, `children`
- **Use:** Groups a label, input, and optional error message with consistent spacing.

## Import Pattern

```tsx
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Container,
  Form,
  FormField,
  Input,
  Section,
  Stack,
} from "@/components/design-system";
```

## Migration Notes

- Existing consumers of `Button`, `Input`, `Card`, and `Badge` keep their previous default behavior; new sizes/variants are opt-in.
- Prefer `Container` + `Section` + `Stack`/`Grid` for new page layouts.
- Use `FormField` for all labeled inputs to ensure consistent spacing and accessibility.
