# WathiqCare Design System

## Overview

A comprehensive, production-ready design system built for the WathiqCare Discharge Refusal Management platform. This system provides reusable UI components and enhancement wrappers that integrate seamlessly with existing application logic.

## Architecture

```
frontend/
├── src/
│   ├── components/
│   │   ├── design-system/      # Core UI primitives
│   │   ├── ui/                  # Existing UI components (preserved)
│   │   ├── make-ui/             # Previously imported components (preserved)
│   │   └── ...                  # Other existing components
│   └── ui-enhancements/         # Enhancement wrappers for modules
│       ├── discharge/
│       ├── legal/
│       ├── consent/
│       └── dashboard/
```

## Design System Components

### Core Primitives (`/src/components/design-system/`)

All components follow these principles:
  - **Accessible**: ARIA-compliant with keyboard navigation
- **Consistent**: Emerald accent color (#10b981) for brand alignment
- **Type-safe**: Full TypeScript support with strict types
- **Composable**: Built with compound component patterns

#### Available Components

| Component | Description | Variants |
|-----------|-------------|----------|
| **Button** | Action trigger | default, outline, ghost, destructive, success |
| **Badge** | Status indicator | default, secondary, outline, success, warning, destructive |
| **Card** | Container with header/footer | - |
| **Dialog** | Modal overlay | - |
| **Drawer** | Side panel | left, right, top, bottom |
| **Dropdown Menu** | Action menu | - |
| **Form** | Form wrapper with validation | - |
| **Input** | Text input | includes Textarea, Select |
| **Popover** | Floating content | - |
| **Progress** | Progress bar | - |
| **Radio Group** | Radio button set | - |
| **Switch** | Toggle control | - |
| **Table** | Data table | - |
| **Tabs** | Tab navigation | - |
| **Tooltip** | Contextual help | - |

### Usage Examples

```tsx
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/design-system";

function MyComponent() {
  return (
    <Dialog open={true} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discharge Case Details</DialogTitle>
        </DialogHeader>
        <p>Content here...</p>
        <Button variant="default">Save Changes</Button>
      </DialogContent>
    </Dialog>
  );
}
```

## UI Enhancement Layer (`/src/ui-enhancements/`)

Pre-built, module-specific components that wrap existing business logic without modification.

### Discharge Module

#### `DischargeCaseTable`
Enhanced table for displaying discharge cases with filtering and sorting.

**Props:**
```tsx
{
  cases: DischargeCaseItem[];
  loading?: boolean;
  onRowClick?: (caseItem: DischargeCaseItem) => void;
}
```

**Usage:**
```tsx
import { DischargeCaseTable } from "@/ui-enhancements";

<DischargeCaseTable 
  cases={cases} 
  loading={loading}
  onRowClick={(item) => navigate(`/cases/${item.id}`)}
/>
```

#### `DischargeCaseDialog`
Modal dialog for viewing/editing case details with tabbed interface.

**Props:**
```tsx
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: CaseData | null;
  onSave?: () => void;
  saving?: boolean;
}
```

### Legal Module

#### `LegalCaseDashboard`
Comprehensive dashboard for legal escalation cases with KPI cards and case table.

**Props:**
```tsx
{
  cases: LegalCase[];
  stats: { active: number; underReview: number; resolved: number; highRisk: number };
  onCaseClick?: (caseItem: LegalCase) => void;
}
```

### Consent Module

#### `ConsentWorkflowPanel`
Workflow panel for managing informed consent and signature capture.

**Props:**
```tsx
{
  caseId: string;
  consents: ConsentItem[];
  stats: { pending: number; verified: number; expired: number };
  onStartConsent?: (documentType: string) => void;
  onVerifyConsent?: (consentId: string) => void;
}
```

### Dashboard Module

#### `DashboardStatsGrid`
KPI cards grid with loading states and trend indicators.

**Props:**
```tsx
{
  stats: {
    totalCases: number;
    activeCases: number;
    escalatedCases: number;
    closedCases: number;
    totalTrend?: string;
    activeTrend?: string;
  };
  loading?: boolean;
}
```

## Integration Guidelines

### ✅ Safe Integration Practices

1. **Import from Enhancement Layer**
   ```tsx
   import { DischargeCaseTable } from "@/ui-enhancements";
   ```

2. **Pass Existing Data**
   - Use existing API responses/state
   - No transformation required
   - Maintains backward compatibility

3. **Preserve Event Handlers**
   ```tsx
   <DischargeCaseTable 
     cases={existingCases}
     onRowClick={existingClickHandler}
   />
   ```

### ❌ Avoid These Patterns

1. **Don't Modify Backend Services**
   - Never change API endpoints
   - Never alter database models
   - Never refactor services

2. **Don't Replace Existing Components Directly**
   - Create NEW routes/pages for testing
   - Use feature flags if available
   - Gradual migration, not wholesale replacement

3. **Don't Break Existing Routes**
   - Test in isolated environments
   - Verify all existing links still work

## Migration Strategy

### Phase 1: Parallel Implementation (Current)
- ✅ Design system created
- ✅ Enhancement wrappers built
- ✅ No existing code touched

### Phase 2: Gradual Adoption (Recommended)
1. Create demo pages using new components
2. Test with real data in isolated routes
3. Gather feedback from stakeholders
4. Update one module at a time

### Phase 3: Full Integration (Future)
1. Replace old components route-by-route
2. Keep old components as fallback
3. Monitor for regressions
4. Document breaking changes (if any)

## Styling System

### Tailwind Configuration
All components use Tailwind CSS with these conventions:

- **Primary Color**: Emerald (#10b981)
- **Base Gray**: Slate
- **Border Radius**: `rounded-lg` (8px), `rounded-2xl` (16px)
- **Shadows**: Minimal, subtle elevation
- **Focus Ring**: 2px emerald-500

### Dark Mode (Future)
Components are built to support dark mode via Tailwind's `dark:` variants. Implementation pending.

## Accessibility

All components follow WCAG 2.1 Level AA standards:

- ✅ Keyboard navigation
- ✅ ARIA labels and roles
- ✅ Focus management
- ✅ Screen reader support
- ✅ Color contrast compliance

## Testing

### Unit Tests (Recommended)
```bash
npm test -- design-system
```

### Visual Regression (Recommended)
```bash
npm run storybook  # If Storybook is added
```

### Integration Tests
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
