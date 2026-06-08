# WathiqCare Physician Workflow - Design Handoff Package

**Complete 10/10 UI/UX Design Specifications**  
**Version**: 1.0  
**Date**: 8 June 2026  
**Purpose**: Comprehensive design documentation for upgrading WathiqCare Physician Workflow to enterprise-grade quality

---

## 📦 Package Contents

This design handoff package contains complete specifications for redesigning the WathiqCare Informed Consents Physician Workflow from current state to 10/10 enterprise-grade quality (Epic/Mayo/Cleveland Clinic standard).

### Core Documents (6 files)

1. **`00_DEVELOPER_HANDOFF.md`** - START HERE ⭐
   - Executive summary
   - Complete index of all materials
   - 10/10 UX upgrade rules
   - Implementation checklist
   - No-break constraints
   - **Read this first**

2. **`01_PROTOTYPE_MAP.md`**
   - Complete 13-screen workflow navigation
   - Entry/exit points for each screen
   - API dependencies
   - Validation requirements
   - State management flows
   - **Use for**: Understanding workflow structure

3. **`02_SCREEN_SPECIFICATIONS.md`**
   - Detailed layout specs for all 13 screens
   - Component placement and dimensions
   - Desktop (1440px) and Tablet (1024px) layouts
   - Loading/Error/Empty states
   - Arabic RTL and English LTR layouts
   - **Use for**: Implementing screen layouts

4. **`03_COMPONENT_LIBRARY.md`**
   - 16+ reusable component specifications
   - Props and data structures
   - Visual states (default, hover, disabled, etc.)
   - Dimensions and spacing
   - Accessibility requirements
   - **Use for**: Building component library

5. **`04_DESIGN_TOKENS.md`**
   - Complete design token system
   - Colors (brand, semantic, status)
   - Typography (sizes, weights, line-heights)
   - Spacing (8px grid system)
   - Shadows, radius, borders
   - CSS variables and Tailwind config
   - **Use for**: Setting up design system

6. **`05_API_UI_MAPPING.md`**
   - All 13 API-backed actions
   - Request/response structures
   - UI component bindings
   - Error handling requirements
   - Validation rules
   - Data flow diagrams
   - **Use for**: Backend integration

---

## 🎯 What This Package Delivers

### For Designers
✓ Complete UI/UX specifications for Figma prototype recreation  
✓ Component library with all variants and states  
✓ Design token system (colors, typography, spacing)  
✓ Arabic RTL and English LTR layout guidelines  
✓ Accessibility requirements (WCAG 2.1 AA)  

### For Engineers
✓ Screen-by-screen implementation specs  
✓ Reusable component specifications  
✓ API endpoint mappings and payload structures  
✓ Validation logic and business rules  
✓ State management patterns  
✓ Technology stack recommendations  

### For Product Managers
✓ Complete workflow map (13 screens)  
✓ User journey and navigation flows  
✓ Validation and readiness requirements  
✓ No-break constraints (what NOT to change)  
✓ 10/10 UX quality criteria  

---

## 🚀 Quick Start Guide

### For First-Time Readers

1. **Start with**: `00_DEVELOPER_HANDOFF.md`
   - Read Executive Summary
   - Review Prototype Map section
   - Understand 10/10 UX Rules
   - Check No-Break Constraints

2. **Then review**: `01_PROTOTYPE_MAP.md`
   - Understand complete workflow flow
   - Note API dependencies
   - Review validation requirements

3. **For design details**: `02_SCREEN_SPECIFICATIONS.md`
   - Pick a screen to implement
   - Follow layout specs exactly
   - Note all states (loading, error, empty)

4. **For components**: `03_COMPONENT_LIBRARY.md`
   - Build reusable components first
   - Implement all visual states
   - Follow accessibility guidelines

5. **For styling**: `04_DESIGN_TOKENS.md`
   - Set up design token system first
   - Use CSS variables or Tailwind config
   - Maintain consistency across all screens

6. **For backend**: `05_API_UI_MAPPING.md`
   - Map UI actions to API calls
   - Implement error handling
   - Follow validation rules

---

## 📊 Workflow Overview

**13-Screen Physician Workflow**:

```
┌─────────────────────────────────────────────────────┐
│ 1. Dashboard → 2. Patient Search                    │
│                                                     │
│ 3. Encounter Selection → 4. Consent Selection       │
│                                                     │
│ 5. Anesthesia Decision → 6. Dynamic Disclosure      │
│                                                     │
│ 7. Patient Education → 8. Patient Preview           │
│                                                     │
│ 9. Validation Panel (always visible)                │
│                                                     │
│ 10. Draft PDF Review → 11. Send Secure Link         │
│                                                     │
│ 12. Status Tracking → 13. Dashboard (Updated)       │
└─────────────────────────────────────────────────────┘
```

**Critical Path** (minimum 7 screens):
Patient Search → Encounter → Consent → Anesthesia → Disclosure → PDF → Send

---

## 🎨 Design System Overview

### Brand Colors
- **Royal Blue**: `#002B5C` - Primary, headers, buttons
- **Luxury Gold**: `#C9A13B` - IMC approved badges, accents
- **Dark Gray**: `#2F2F2F` - Primary text
- **Light Blue**: `#4B9CD3` - Secondary actions
- **Clinical Background**: `#F4F7FB` - Soft gray

### Typography
- **Font**: Inter (English), Noto Sans Arabic (Arabic)
- **Sizes**: 10px - 32px scale
- **Weights**: Normal (400), Medium (500), Semibold (600), Bold (700)

### Spacing
- **Grid**: 8px base unit
- **Card Padding**: 24px
- **Section Gap**: 32px
- **Field Gap**: 12px

### Components
- 16+ reusable components
- All support bilingual EN/AR
- All support RTL/LTR layouts
- All have clear disabled states

---

## ✅ Validation Requirements

### Critical Items (15 total)
Must be complete before "Send to Patient":
1. Patient selected
2. Encounter selected
3. Consent selected
4. Template mapped
5. Anesthesia type selected
6-13. All disclosure fields (EN + AR)
14. PDF generated
15. Contact confirmed

### Warning Items
- Fasting instructions
- Preparation instructions
- Post-procedure instructions

### Overall Status
- **All Ready**: All critical + warning complete
- **Critical Ready**: All critical complete
- **Not Ready**: Critical items missing

---

## 🔒 No-Break Constraints

**CRITICAL - Do NOT change these**:

❌ Do NOT change workflow sequence  
❌ Do NOT change API endpoints or payloads  
❌ Do NOT remove critical validation items  
❌ Do NOT allow inactive or unapproved consents  
❌ Do NOT skip anesthesia review requirement  
❌ Do NOT add unsupported AI/legal/billing features  
❌ Do NOT make Arabic optional for critical fields  

✅ You MAY add UI-only enhancements  
✅ You MAY add additional warning-level validations  
✅ You MAY add confirmation dialogs  
✅ You MAY add template/helper UI features  

---

## 🌍 Bilingual Support

### Arabic RTL Layout
- Complete mirror of English LTR layout
- Sidebar on right (instead of left)
- Validation panel on left (instead of right)
- Text right-aligned
- Directional icons flipped

### Critical Field Pairs
- All critical disclosure fields require BOTH EN + AR
- EN field shown first (top)
- AR field shown second (below)
- Both validated before allowing progress

### Language Toggle
- Header-level toggle (EN | AR)
- Switches entire interface
- Persists across workflow
- Independent of document language selection

---

## 📱 Responsive Breakpoints

- **Desktop**: 1440px (primary target)
- **Tablet**: 1024px (validation panel becomes collapsible)
- **Mobile**: 390px (status tracking view only, no authoring)

**Note**: Physician authoring workflow is desktop/tablet only. Mobile supports viewing status and notifications only.

---

## ♿ Accessibility (WCAG 2.1 AA)

### Requirements
- ✓ Color contrast: 4.5:1 (normal text), 3:1 (large text)
- ✓ Keyboard navigation: Full support
- ✓ Focus visible: 2px ring on all interactive elements
- ✓ Screen readers: ARIA labels on all components
- ✓ Touch targets: Minimum 44px × 44px
- ✓ Error messages: Announced immediately

### Testing
- aXe DevTools audit
- Lighthouse accessibility score ≥ 95
- Keyboard-only navigation test
- Screen reader test (NVDA/JAWS)

---

## 🛠 Technology Stack Recommendations

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS v4 or CSS-in-JS with design tokens
- **State**: Context API or Redux
- **Routing**: React Router v6+
- **API**: Axios with interceptors

### Component Library
- Build custom components following specifications
- Or adapt Radix UI / Headless UI with design tokens
- Avoid complete UI kits (Material UI, Ant Design) - won't match specifications

### Testing
- **Unit**: Jest + React Testing Library
- **E2E**: Playwright or Cypress
- **Visual Regression**: Percy or Chromatic
- **Accessibility**: aXe, Pa11y

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Design token system setup
- [ ] Base component library
- [ ] App shell and layout
- [ ] Workflow stepper
- [ ] Validation panel

### Phase 2: Core Screens (Week 3-4)
- [ ] Dashboard
- [ ] Patient Search
- [ ] Encounter Selection
- [ ] Consent Selection
- [ ] Anesthesia Decision

### Phase 3: Authoring (Week 5-6)
- [ ] Dynamic Disclosure (bilingual)
- [ ] Patient Education Preview
- [ ] Patient Preview Simulation
- [ ] Validation integration

### Phase 4: Completion (Week 7-8)
- [ ] Draft PDF Review
- [ ] Send Secure Link
- [ ] Status Tracking
- [ ] Dashboard Update

### Phase 5: Polish (Week 9-10)
- [ ] Arabic RTL layouts
- [ ] Accessibility audit
- [ ] Error handling
- [ ] Performance optimization
- [ ] Testing

### Phase 6: Integration (Week 11-12)
- [ ] Backend API integration
- [ ] Real data testing
- [ ] User acceptance testing
- [ ] Bug fixes
- [ ] Production deployment

---

## 📄 Document Structure

```
DESIGN_HANDOFF/
├── README.md                        (this file)
├── 00_DEVELOPER_HANDOFF.md          ⭐ Start here
├── 01_PROTOTYPE_MAP.md              Complete workflow navigation
├── 02_SCREEN_SPECIFICATIONS.md      All 13 screen layouts
├── 03_COMPONENT_LIBRARY.md          16+ reusable components
├── 04_DESIGN_TOKENS.md              Design system tokens
└── 05_API_UI_MAPPING.md             Backend integration
```

---

## 🎓 How to Use This Package

### As a Designer (Figma)
1. Read `00_DEVELOPER_HANDOFF.md` for overview
2. Use `01_PROTOTYPE_MAP.md` for workflow structure
3. Use `02_SCREEN_SPECIFICATIONS.md` for exact layouts
4. Use `03_COMPONENT_LIBRARY.md` for component variants
5. Use `04_DESIGN_TOKENS.md` for styles and colors
6. Create Figma frames matching these specifications
7. Build component library in Figma
8. Create clickable prototype following workflow map

### As a Frontend Engineer
1. Read `00_DEVELOPER_HANDOFF.md` for overview
2. Set up design tokens from `04_DESIGN_TOKENS.md`
3. Build components from `03_COMPONENT_LIBRARY.md`
4. Implement screens from `02_SCREEN_SPECIFICATIONS.md`
5. Follow workflow from `01_PROTOTYPE_MAP.md`
6. Integrate APIs from `05_API_UI_MAPPING.md`
7. Test all states and validations
8. Verify accessibility requirements

### As a Backend Engineer
1. Read `05_API_UI_MAPPING.md` for API requirements
2. Verify all endpoint contracts match
3. Ensure payload structures are correct
4. Implement proper error responses
5. Support all validation requirements
6. Provide real-time status updates (for Status Tracking)

### As a Product Manager
1. Read `00_DEVELOPER_HANDOFF.md` for overview
2. Review `01_PROTOTYPE_MAP.md` for workflow
3. Verify `05_API_UI_MAPPING.md` matches current system
4. Check No-Break Constraints section
5. Review 10/10 UX Rules for quality criteria
6. Use Implementation Checklist for planning

---

## ⚠ Important Notes

### This is NOT
- ❌ A coded prototype (it's design specifications)
- ❌ A Figma file (it's specs to create Figma files)
- ❌ A new product (it's a redesign of existing system)
- ❌ A backend change (all APIs stay the same)

### This IS
- ✅ Complete UI/UX design specifications
- ✅ Component library specifications
- ✅ Screen layout and interaction specs
- ✅ Design token system
- ✅ Implementation guidelines
- ✅ A roadmap to 10/10 enterprise quality

---

## 🎯 Success Criteria

**10/10 Quality Achieved When**:

1. ✅ Every disabled action explains WHY it's disabled
2. ✅ Every critical requirement is visible in validation panel
3. ✅ Patient/encounter/consent context always visible
4. ✅ Physician feels they're completing a checklist, not writing legal doc
5. ✅ PDF and evidence readiness always clear
6. ✅ Arabic RTL = English LTR quality (no broken layouts)
7. ✅ No fake AI/legal/clinical actions (only real API-backed actions)
8. ✅ No hidden validation issues (all shown in panel)
9. ✅ Clear next action always visible
10. ✅ Implementation feasible with current backend

---

## 📞 Support

**Questions about this package?**
- Design questions → Reference specifications in this package
- Technical questions → Reference API documentation
- Clarifications → Contact product team

**Found an issue?**
- Specification unclear → Request clarification with specific section reference
- Missing information → Identify which screen/component needs more detail
- Conflicting information → Note the conflict location for resolution

---

## 📝 Version History

- **v1.0** (8 June 2026) - Initial design handoff package
  - Complete 13-screen specifications
  - 16+ component library specs
  - Design token system
  - API-UI mapping
  - Implementation guidelines

---

**End of README**

**Next Step**: Open `00_DEVELOPER_HANDOFF.md` to begin
