# WathiqCare Design System

## Purpose

Phase 1 defines the shared visual foundation only. It does not change business logic, routes, API behavior, authentication flows, or database schema.

The design direction is intentionally calm, formal, and hospital-appropriate:

- Enterprise medical/legal presentation
- Blue for primary actions and selected states
- Gray for layout, panels, and neutral structure
- Green only for success and completion
- Red only for destructive or error states
- Amber only for warnings and pending attention
- Minimal gradients, minimal shadows, no playful consumer styling

## Phase 1 Scope

Phase 1 includes only:

- Global design tokens in [app/globals.css](c:/work/wathiqcare-discharge-refusal-main/apps/web/app/globals.css)
- Reusable primitives in [src/components/design-system/button.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/src/components/design-system/button.tsx), [src/components/design-system/badge.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/src/components/design-system/badge.tsx), [src/components/design-system/card.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/src/components/design-system/card.tsx), [src/components/design-system/input.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/src/components/design-system/input.tsx), [src/components/design-system/switch.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/src/components/design-system/switch.tsx), [src/components/design-system/tabs.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/src/components/design-system/tabs.tsx), [src/components/design-system/table.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/src/components/design-system/table.tsx), and [src/components/design-system/progress.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/src/components/design-system/progress.tsx)
- Documentation of rules and rollout order

Phase 1 does not include page-by-page restyling yet.

## Design Tokens

### Core Color Roles

| Role | Token | Usage |
|------|-------|-------|
| App background | `--background` | Page canvas and neutral shells |
| Primary surface | `--surface` | Cards, forms, modal bodies |
| Secondary surface | `--surface-muted` | Quiet panels, grouped filters, table headers |
| Primary text | `--foreground` | Headings, key values, labels |
| Secondary text | `--foreground-secondary` | Descriptions, metadata |
| Primary action | `--primary` | Primary buttons, active tabs, focus states, selected controls |
| Primary hover | `--primary-hover` | Hover state for primary actions |
| Border | `--border` | Default input, card, and table borders |

### State Tokens

| State | Token family | Allowed usage |
|-------|--------------|---------------|
| Success | `--state-success-*` | Approval, completion, successful submission |
| Warning | `--state-warning-*` | Pending attention, caution |
| Error | `--state-error-*` | Validation, failed actions, destructive flows |
| Info | `--state-info-*` | Informational callouts only |

### Shape and Elevation

| Token | Intent |
|-------|--------|
| `--radius-sm` | Inputs, compact controls |
| `--radius-md` | Buttons, selects, tabs |
| `--radius-lg` | Cards, dialogs, grouped panels |
| `--shadow-sm` | Default surface separation |
| `--shadow-md` | Reserved for elevated containers |
| `--shadow-floating` | Reserved for dialogs and overlays |

## Component Rules

### Buttons

- `default` is the only primary visual action and must be blue.
- `outline` is neutral and used for secondary actions.
- `ghost` is neutral and should not compete with primary CTAs.
- `success` and `destructive` are reserved for true status or irreversible actions.
- Avoid using green or red for ordinary navigation or standard CRUD actions.

### Badges

- Default badge is informational and blue-toned.
- Neutral metadata uses `secondary` or `outline`.
- Success, warning, and destructive variants are semantic only.
- Badges should remain quiet, compact, and highly legible.

### Cards and Panels

- White surfaces on gray page backgrounds.
- Thin borders first, light shadow second.
- Large panels should feel structured, not decorative.
- Avoid stacked heavy shadows or tinted card backgrounds unless status-specific.

### Inputs and Form Fields

- White field surfaces with gray border.
- Blue focus ring and blue focus border.
- Rounded corners should be consistent and not overly soft.
- Placeholder text should remain muted and secondary.

### Switches and Tabs

- Active state is blue, not green.
- Inactive state remains neutral gray.
- Selected tabs should feel formal and structured, with border emphasis instead of loud fills.

### Tables

- Use gray header rows and quiet row hover states.
- Header typography is compact, uppercase, and subdued.
- Keep borders subtle and alignment consistent.
- Avoid decorative zebra striping unless necessary for readability.

### Progress Indicators

- Default progress uses blue to indicate process, not success.
- Green should be reserved for explicit completion messaging.

## Typography Rules

- Prioritize clarity over decoration.
- Maintain strong heading hierarchy with restrained weight.
- Labels and metadata should be readable but visually secondary.
- Arabic and English typography should remain consistent in density and spacing.

## Icon Rules

- Use line icons only.
- Prefer formal, structured geometry.
- Avoid filled icons except for specific status emphasis.
- Avoid overly playful or highly rounded icon styles.

## Safe Integration Rules

- Do not change workflows.
- Do not change case logic.
- Do not change forms behavior.
- Do not change backend integrations.
- Do not change route structures.
- Keep component public APIs stable during redesign.

## Proposed Page Transformation Order

This is the rollout order for Phase 2, after Phase 1 tokens and primitives are validated:

1. Platform shell and shared navigation
2. Platform tenants page
3. Platform users page
4. Platform health page
5. Login pages and auth surfaces
6. Dashboard summary surfaces
7. Case list pages
8. Case detail header and meta panels
9. Workflow panels and timeline surfaces
10. Admin/compliance modules
11. Reports workspace
12. Remaining modal and utility surfaces

## Why This Order

- The shell defines spacing, header, and navigation tone for everything else.
- The tenants and users pages are operationally important and visually repetitive, making them ideal for safe incremental validation.
- Login comes after shared controls are stabilized, so auth visuals can change without changing auth flow behavior.
- Workflow-heavy pages come later because they have denser interactions and need stronger regression discipline.

## Validation Checklist For Each Future Page

- No routing changes
- No API request changes
- No auth behavior changes
- No form submission changes
- No accessibility regression in focus, contrast, or labels
- Visual changes limited to layout, spacing, color, typography, or component replacement using the same handlers and data

## Shared Component Inventory

Reusable primitives currently aligned to Phase 1:

- Button
- Badge
- Card
- Dialog
- Input, Textarea, Select
- Progress
- Switch
- Tabs
- Table

Module wrappers remain available and should adopt the new primitives without changing the underlying application logic.
Test enhancement wrappers with existing data flows.

## Performance

### Bundle Size
- Core design system: ~15KB gzipped
- Enhancement layer: ~8KB gzipped
- Total impact: ~23KB additional

### Optimization
- Tree-shaking enabled
- Components lazy-loadable
- No runtime dependencies beyond React

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile Safari: Latest 2 versions
- Chrome Android: Latest version

## Troubleshooting

### Component Not Rendering
- Check import path: `@/components/design-system` or `@/ui-enhancements`
- Verify TypeScript types match props
- Ensure all required props are passed

### Styling Issues
- Confirm Tailwind CSS is processing the new files
- Check `tailwind.config.js` includes design-system path
- Clear Next.js cache: `rm -rf .next`

### Type Errors
- Run `npm run type-check`
- Verify all props match component interfaces
- Check for conflicting types in existing code

## Contributing

### Adding New Components
1. Create component in `/src/components/design-system/`
2. Follow existing patterns (Context API for complex components)
3. Export from `index.ts`
4. Document props and usage

### Adding Enhancement Wrappers
1. Create wrapper in appropriate `/src/ui-enhancements/{module}/` folder
2. Accept existing data types as props
3. Test with real data from existing services
4. Export from `/src/ui-enhancements/index.ts`

## Support

For questions or issues:
- Check existing component documentation
- Review usage examples in `/app/admin/ui-showcase`
- Contact development team

## License

Internal use only - WathiqCare Platform
