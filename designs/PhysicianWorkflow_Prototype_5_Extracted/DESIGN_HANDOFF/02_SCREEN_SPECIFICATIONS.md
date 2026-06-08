# WathiqCare Physician Workflow - Screen Specifications

## Screen 1: Home / Physician Dashboard

### Frame Specifications
- **Desktop**: 1440px × 900px
- **Tablet**: 1024px × 768px
- **Background**: #F4F7FB (soft clinical gray)

### Layout Structure
```
┌────────────────────────────────────────────────────────────────┐
│ Header: WathiqCare Logo | Physician Profile | Notifications    │
├────────────────────────────────────────────────────────────────┤
│ Main Content Area (padding: 32px)                              │
│                                                                 │
│ ┌─────────────────┬─────────────────┬─────────────────┐       │
│ │ Pending (3)     │ Drafts (5)      │ Sent/Awaiting(8)│       │
│ │ Widget Card     │ Widget Card     │ Widget Card     │       │
│ └─────────────────┴─────────────────┴─────────────────┘       │
│                                                                 │
│ ┌─────────────────────────────────────────────────────┐       │
│ │ 🚨 Critical Alerts                                   │       │
│ │ • 2 consents missing patient-specific risks          │       │
│ │ • 1 consent missing Arabic translation               │       │
│ └─────────────────────────────────────────────────────┘       │
│                                                                 │
│ [Start New Consent] ← Primary action button                    │
│                                                                 │
│ ┌─────────────────────────────────────────────────────┐       │
│ │ Recent Activity Timeline                             │       │
│ │ • Sent consent to Ahmed Al-Mansouri - 16:45          │       │
│ │ • Completed consent for Fatima Al-Harbi - 14:20      │       │
│ └─────────────────────────────────────────────────────┘       │
└────────────────────────────────────────────────────────────────┘
```

### Components
1. **Header Bar**
   - Height: 64px
   - Background: #FFFFFF
   - Border bottom: 1px solid #E5E7EB
   - Logo: 40px × 40px
   - Physician avatar: 36px circle
   - Notification bell: 20px icon with badge

2. **Widget Cards** (3 across)
   - Width: Each ~30% with gap: 24px
   - Height: 180px
   - Background: #FFFFFF
   - Border: 1px solid #D8DCE3
   - Radius: 12px
   - Padding: 24px
   - Shadow: 0 1px 3px rgba(0,0,0,0.1)
   - Title: font-size 14px, font-weight 600, color #6B7280
   - Count: font-size 32px, font-weight 700, color #002B5C
   - List preview: max 3 items, font-size 13px

3. **Critical Alerts Banner**
   - Background: #FEF3C7 (amber-50)
   - Border: 1px solid #F59E0B
   - Border-left: 4px solid #F59E0B
   - Padding: 16px 20px
   - Icon: AlertTriangle, 20px, #F59E0B
   - Text: font-size 13px, color #92400E

4. **Start New Consent Button**
   - Width: 240px
   - Height: 48px
   - Background: #002B5C
   - Color: #FFFFFF
   - Font-size: 15px
   - Font-weight: 600
   - Radius: 8px
   - Hover: background #001F45
   - Icon: Plus, 18px

5. **Recent Activity Timeline**
   - Background: #FFFFFF
   - Padding: 24px
   - Border: 1px solid #D8DCE3
   - Radius: 12px
   - Timeline dots: 8px circles, #4B9CD3
   - Timeline line: 2px, #E5E7EB
   - Item spacing: 16px between

### States
- **Loading**: Skeleton loaders for widget cards
- **Empty**: "No pending consents" message
- **Error**: Red alert banner at top

### Arabic RTL Adaptations
- Flip entire layout horizontally
- Logo stays left (brand consistency)
- Navigation icons mirror
- Timeline line on right side of dots

---

## Screen 2: Patient Search

### Frame Specifications
- **Desktop**: 1440px × 900px (content area within workflow shell)
- **Tablet**: 1024px × 768px
- **Background**: #F4F7FB

### Layout Structure
```
┌────────────────────────────────────────────────────────────────┐
│ Workflow Stepper: [1. Patient Search] 2. Encounter ... 8. Send│
├────────────────────────────────────────────────────────────────┤
│ Main Content (70%) │ Validation Panel (30%)                    │
│                     │                                            │
│ Page Title          │ Readiness Checklist                       │
│ "Patient Search"    │ □ Patient selected                        │
│                     │ □ Encounter selected                      │
│ ┌─────────────────┐│ ...                                       │
│ │ 🔍 Search Input ││                                           │
│ │ [Search] Button ││                                           │
│ └─────────────────┘│                                           │
│                     │                                            │
│ ⚠️ PHI Protection   │                                           │
│                     │                                            │
│ ┌─────────────────┐│                                           │
│ │ Patient Card 1  ││                                           │
│ │ Ahmed Al-...    ││                                           │
│ │ MRN-2024-001234 ││                                           │
│ │ [Selected ✓]    ││                                           │
│ └─────────────────┘│                                           │
│                     │                                            │
│ ┌─────────────────┐│                                           │
│ │ Patient Card 2  ││                                           │
│ └─────────────────┘│                                           │
│                     │                                            │
│ [Back] [Continue]   │                                           │
└────────────────────────────────────────────────────────────────┘
```

### Components

1. **Workflow Stepper** (top, full width)
   - Height: 60px
   - Background: #FFFFFF
   - Border-bottom: 1px solid #D8DCE3
   - 8 step indicators, connected by chevrons
   - Active step: blue background #002B5C
   - Completed: green check #10B981
   - Pending: gray #9CA3AF

2. **Page Title**
   - Font-size: 24px
   - Font-weight: 700
   - Color: #002B5C
   - Margin-bottom: 8px

3. **Search Input Group**
   - Width: 100% (max 600px)
   - Input height: 44px
   - Border: 1px solid #D8DCE3
   - Radius: 8px
   - Icon: Search, 20px, #6B7280, positioned left 12px
   - Padding-left: 44px
   - Font-size: 14px
   - Placeholder: "Enter MRN, patient name, or case ID..."
   - Focus: border #002B5C, ring 2px #002B5C20

4. **Search Button**
   - Width: 140px
   - Height: 44px
   - Background: #002B5C
   - Color: #FFFFFF
   - Font-size: 14px
   - Font-weight: 600
   - Radius: 8px
   - Margin-left: 12px
   - Disabled: background #D8DCE3, cursor not-allowed

5. **PHI Protection Banner**
   - Background: #FEF3C7
   - Border: 1px solid #F59E0B
   - Padding: 12px 16px
   - Icon: Shield, 18px, #F59E0B
   - Text: "Handle patient data with confidentiality"
   - Font-size: 13px
   - Color: #92400E
   - Margin: 16px 0

6. **Patient Card**
   - Background: #FFFFFF
   - Border: 1px solid #D8DCE3
   - Radius: 12px
   - Padding: 20px
   - Margin-bottom: 16px
   - Hover: border #9CA3AF, shadow increased
   - Selected state:
     - Border: 2px solid #002B5C
     - Background: #EFF6FF (blue-50)
     - Badge: "Selected", #002B5C background, white text

7. **Patient Card Content**
   ```
   ┌─────────────────────────────────────────────┐
   │ [Avatar] Name: Ahmed Al-Mansouri            │
   │ 48px     أحمد المنصوري                      │
   │ circle   MRN: MRN-2024-001234               │
   │          DOB: 15 Mar 1975 | Gender: Male    │
   │          Case: CASE-2024-5678               │
   │          Contact: +966 50 123 4567          │
   │                              [Selected ✓]   │
   └─────────────────────────────────────────────┘
   ```
   - Avatar: 48px circle, background #002B5C10, User icon #002B5C
   - Name EN: font-size 16px, font-weight 600, color #2F2F2F
   - Name AR: font-size 14px, color #6B7280
   - MRN: font-size 13px, color #6B7280, icon FileText 14px
   - Demographics: font-size 12px, color #6B7280, icons 12px
   - Grid: 2 columns on desktop, 1 on mobile

### States

**Loading State**
- Spinner centered, 40px
- Text: "Searching patients..."
- Background: #FFFFFF card

**Empty State**
- Icon: UserX, 64px, #D8DCE3
- Title: "No patients found"
- Subtitle: "Try a different search term..."
- Font-size: 14px, color #6B7280
- Centered vertically and horizontally

**Error State**
- Background: #FEE2E2 (red-50)
- Border: 1px solid #EF4444
- Icon: AlertCircle, 20px, #EF4444
- Text: "Search failed. Please try again."
- Retry button
- Padding: 16px 20px

**Success State** (Results shown)
- Results count: "2 patients found"
- Font-size: 14px, color #6B7280
- Position: above first card

### Arabic RTL
- Search icon position: right 12px
- Input padding-right: 44px
- Card content: right-aligned
- Avatar: right side
- Text direction: RTL
- Selected badge: left side

---

## Screen 3: Encounter Selection

### Frame Specifications
- **Desktop**: 1440px × 900px
- **Background**: #F4F7FB

### Layout Structure
```
┌────────────────────────────────────────────────────────────────┐
│ Stepper: 1. Patient ✓ [2. Encounter] 3. Consent ... 8. Send   │
├────────────────────────────────────────────────────────────────┤
│ Main Content (70%)       │ Validation Panel (30%)              │
│                          │                                      │
│ Patient Summary Bar      │ Readiness Checklist                 │
│ Ahmed Al-Mansouri        │ ✓ Patient selected                  │
│ MRN-2024-001234          │ □ Encounter selected                │
│                          │ □ Consent selected                  │
│ Page Title               │ ...                                 │
│ "Select Encounter"       │                                      │
│                          │                                      │
│ ┌──────────────────────┐│                                     │
│ │ Encounter Card 1     ││                                     │
│ │ ENC-2024-456789      ││                                     │
│ │ General Surgery      ││                                     │
│ │ [Synced ✓] TrakCare  ││                                     │
│ │ [SELECTED]           ││                                     │
│ └──────────────────────┘│                                     │
│                          │                                      │
│ ┌──────────────────────┐│                                     │
│ │ Encounter Card 2     ││                                     │
│ │ [Sync Pending ⚠]    ││                                     │
│ │ [Sync from TrakCare] ││                                     │
│ └──────────────────────┘│                                     │
└────────────────────────────────────────────────────────────────┘
```

### Components

1. **Patient Summary Bar** (sticky)
   - Height: 56px
   - Background: #FFFFFF
   - Border-bottom: 1px solid #E5E7EB
   - Padding: 12px 24px
   - Font-size: 14px
   - Patient name: font-weight 600, color #2F2F2F
   - MRN: font-weight 400, color #6B7280
   - Icon: User, 20px, #4B9CD3

2. **Encounter Card**
   - Width: 48% (2 columns, gap 24px)
   - Background: #FFFFFF
   - Border: 1px solid #D8DCE3
   - Radius: 12px
   - Padding: 24px
   - Margin-bottom: 20px
   - Selected: border 2px #002B5C, background #EFF6FF

3. **Encounter Card Content**
   ```
   ┌──────────────────────────────────────────────┐
   │ Encounter #: ENC-2024-456789                  │
   │ Case #: CASE-2024-5678                        │
   │                                                │
   │ 📅 Admission: 28 May 2024                     │
   │ 🏥 Department: General Surgery                │
   │                                                │
   │ 👨‍⚕️ Dr. Khalid Al-Qahtani, MD                │
   │    License: SCFHS-12345                       │
   │    Specialty: General Surgery - FACS          │
   │                                                │
   │ 🩺 Diagnosis:                                 │
   │    Cholelithiasis with chronic cholecystitis  │
   │                                                │
   │ 🔬 Planned Procedure:                         │
   │    Laparoscopic Cholecystectomy               │
   │                                                │
   │ [Synced ✓] [TrakCare]                        │
   │                         [SELECTED ✓]          │
   └──────────────────────────────────────────────┘
   ```
   - Section spacing: 12px between
   - Labels: font-size 12px, font-weight 600, color #6B7280
   - Values: font-size 14px, color #2F2F2F
   - Icons: 16px, color #6B7280

4. **Sync Status Badge**
   - Synced: background #D1FAE5, color #065F46, border #10B981
   - Pending: background #FEF3C7, color #92400E, border #F59E0B
   - Failed: background #FEE2E2, color #991B1B, border #EF4444
   - Manual: background #E5E7EB, color #374151, border #9CA3AF
   - Height: 24px
   - Padding: 4px 10px
   - Font-size: 11px
   - Font-weight: 600
   - Radius: 12px

5. **Source Badge**
   - TrakCare: background #DBEAFE, color #1E40AF, border #3B82F6
   - Manual: background #E5E7EB, color #374151, border #9CA3AF
   - Height: 24px
   - Padding: 4px 10px
   - Font-size: 11px
   - Radius: 12px
   - Margin-left: 8px

6. **Sync Button** (conditional)
   - Width: auto
   - Height: 36px
   - Background: #FFFFFF
   - Border: 1px solid #D8DCE3
   - Color: #4B9CD3
   - Font-size: 13px
   - Font-weight: 600
   - Radius: 6px
   - Icon: RefreshCw, 14px
   - Hover: background #F8FAFC
   - Loading: spinner replaces icon

### States
- **Loading Encounters**: Skeleton cards (3 visible)
- **Empty**: "No encounters found for this patient"
- **Sync In Progress**: Spinner on card, button disabled
- **Sync Success**: Green check animation
- **Sync Failed**: Red X, retry button

---

## Screen 5: Anesthesia Decision

### Frame Specifications
- **Desktop**: 1440px × 900px
- **Tablet**: 1024px × 768px
- **Background**: #F4F7FB

### Layout Structure
```
┌────────────────────────────────────────────────────────────────┐
│ Stepper: 1-4 ✓ [5. Anesthesia] 6-8 ...                        │
├────────────────────────────────────────────────────────────────┤
│ Main Content (70%)       │ Validation Panel (30%)              │
│                          │                                      │
│ Page Title               │ ✓ Patient selected                  │
│ "Anesthesia Decision"    │ ✓ Encounter selected                │
│ Subtitle: "Select type"  │ ✓ Consent selected                  │
│                          │ □ Anesthesia type selected          │
│ ┌──────┬──────┬──────┐  │ ...                                 │
│ │ None │Local │Region││  │                                     │
│ │      │      │      ││  │                                     │
│ └──────┴──────┴──────┘  │                                     │
│ ┌──────┬──────┐         │                                     │
│ │GENERAL│ MAC │         │                                     │
│ │[SELECTED]   │         │                                     │
│ └──────┴──────┘         │                                     │
│                          │                                      │
│ ⚠️ Anesthesiologist     │                                     │
│ review will be required  │                                     │
└────────────────────────────────────────────────────────────────┘
```

### Components

1. **Anesthesia Option Card** (5 cards in 3+2 grid)
   - Width: 32% (3 cards), 48% (2 cards)
   - Height: 200px
   - Background: #FFFFFF
   - Border: 1px solid #D8DCE3
   - Radius: 12px
   - Padding: 24px
   - Gap: 24px
   - Cursor: pointer
   - Hover: border #9CA3AF, shadow 0 4px 6px rgba(0,0,0,0.1)
   - Selected: 
     - Border: 3px solid #002B5C
     - Background: #EFF6FF
     - Shadow: 0 0 0 4px #002B5C20

2. **Card Content Structure**
   ```
   ┌─────────────────────────────┐
   │     [Icon 48px]              │
   │                              │
   │  General Anesthesia          │
   │  التخدير العام               │
   │                              │
   │  Patient completely          │
   │  unconscious during          │
   │  procedure                   │
   │                              │
   │  [Review Required ⚠]        │
   └─────────────────────────────┘
   ```
   - Icon: 48px, centered, color based on type
   - Title EN: font-size 16px, font-weight 700, color #2F2F2F, centered
   - Title AR: font-size 14px, color #6B7280, centered, margin-top 4px
   - Description: font-size 13px, color #6B7280, centered, margin-top 12px, line-height 1.5
   - Badge: margin-top auto (bottom of card)

3. **Icons by Type**
   - No Anesthesia: CircleSlash, #9CA3AF
   - Local: Syringe, #4B9CD3
   - Regional: Activity (spine), #F59E0B
   - General: Moon, #EF4444
   - Sedation/MAC: Moon (half), #F59E0B

4. **Review Badge Variants**
   - No Review: (badge not shown)
   - Review Optional: background #DBEAFE, color #1E40AF, border #3B82F6
   - Review Required: background #FEF3C7, color #92400E, border #F59E0B
   - High Priority Review: background #FEE2E2, color #991B1B, border #EF4444
   - Height: 28px
   - Padding: 6px 12px
   - Font-size: 12px
   - Font-weight: 600
   - Radius: 14px
   - Full width, centered text

5. **Review Requirement Panel** (appears when review required type selected)
   - Background: #FEF3C7
   - Border: 1px solid #F59E0B
   - Border-left: 4px solid #F59E0B
   - Padding: 16px 20px
   - Radius: 8px
   - Icon: AlertTriangle, 20px, #F59E0B
   - Text: "Anesthesiologist review will be required before sending to patient"
   - Font-size: 14px
   - Color: #92400E
   - Margin-top: 24px

### States
- **Not Selected**: All cards default state
- **Selected**: One card with blue border + badge
- **Disabled**: Grayed out, cursor not-allowed (if prerequisites not met)

### Arabic RTL
- Card content: centered (same for both)
- Arabic title: larger font-size (16px) than English subtitle
- Review panel: text right-aligned
- Icon position: flip if directional

---

## Screen 6: Dynamic Physician Disclosure

### Frame Specifications
- **Desktop**: 1440px × 900px
- **Content Area**: 70% main, 30% validation panel
- **Background**: #F4F7FB

### Layout Structure
```
┌────────────────────────────────────────────────────────────────┐
│ Stepper: 1-5 ✓ [6. Disclosure] 7-8 ...                        │
├────────────────────────────────────────────────────────────────┤
│ Main Content (scroll)    │ Validation Panel (sticky)           │
│                          │                                      │
│ Page Title               │ Completeness Validation             │
│ "Physician Disclosure"   │ ✓ Patient selected                  │
│                          │ ✓ Encounter selected                │
│ Section 1:               │ ✓ Consent selected                  │
│ Procedure Description    │ ✓ Anesthesia selected               │
│ ┌────────────────────┐  │ ✗ Procedure description EN (CRITICAL)│
│ │ EN Textarea        │  │ ✗ Procedure description AR (CRITICAL)│
│ │ 245/2000 chars     │  │ ⚠ Patient-specific risks (WARNING)  │
│ │ 👁 📄 📦 🕒        │  │ ...                                  │
│ └────────────────────┘  │                                      │
│ ┌────────────────────┐  │ Overall: Critical Items Pending      │
│ │ AR Textarea        │  │                                      │
│ │ 0/2000 chars       │  │ [Jump to First Critical]             │
│ │ 👁 📄 📦 🕒        │  │                                      │
│ └────────────────────┘  │                                      │
│                          │                                      │
│ Section 2:               │                                      │
│ Patient-Specific Risks   │                                      │
│ ... (repeat pattern)     │                                      │
│                          │                                      │
│ [Save Draft] [Continue]  │                                      │
└────────────────────────────────────────────────────────────────┘
```

### Components

1. **Section Header**
   - Font-size: 16px
   - Font-weight: 700
   - Color: #002B5C
   - Margin-bottom: 16px
   - Margin-top: 32px (after first section)
   - Optional: Critical badge if field is required
   - Border-left: 3px solid #002B5C
   - Padding-left: 12px

2. **Bilingual Field Pair**
   ```
   ┌─────────────────────────────────────┐
   │ English Field                        │
   │ ┌─────────────────────────────────┐ │
   │ │ Textarea content...              │ │
   │ │                                  │ │
   │ │                                  │ │
   │ └─────────────────────────────────┘ │
   │ 245/2000 characters                  │
   │ 👁 Appears in patient view           │
   │ 📄 Appears in PDF                    │
   │ 📦 Included in evidence package      │
   │ 🕒 Tracked in audit trail            │
   └─────────────────────────────────────┘
   
   ┌─────────────────────────────────────┐
   │ Arabic Field / الحقل العربي          │
   │ ┌─────────────────────────────────┐ │
   │ │ محتوى النص...                   │ │
   │ │                                  │ │
   │ │                                  │ │
   │ └─────────────────────────────────┘ │
   │ 0/2000 حرف                           │
   │ 👁 📄 📦 🕒                          │
   └─────────────────────────────────────┘
   ```
   - Gap between EN/AR: 16px
   - Each field: full width of main content area

3. **Textarea**
   - Width: 100%
   - Min-height: 120px
   - Max-height: 300px (scrollable)
   - Background: #FFFFFF
   - Border: 1px solid #D8DCE3
   - Radius: 8px
   - Padding: 12px 16px
   - Font-size: 14px
   - Line-height: 1.6
   - Focus: border #002B5C, ring 2px #002B5C20
   - Resize: vertical

4. **Character Count**
   - Font-size: 12px
   - Color: #6B7280
   - Position: below textarea, right-aligned
   - Over limit: color #EF4444
   - Format: "245/2000 characters" or "245/2000 حرف"

5. **Indicator Icons** (4 icons in a row)
   - Size: 16px
   - Color: #6B7280
   - Gap: 12px
   - Position: below character count
   - Tooltip on hover explaining each
   - Eye: Patient view
   - File: PDF
   - Box: Evidence package
   - Clock: Audit trail

6. **Disclosure Sections** (in order)
   1. Procedure Description (CRITICAL)
   2. Reason for Procedure (CRITICAL)
   3. Patient-Specific Risks (CRITICAL)
   4. Expected Outcomes
   5. Alternatives Discussed (CRITICAL)
   6. Refusal Risks (CRITICAL)
   7. Special Warnings
   8. Preparation Instructions
   9. Post-Procedure Instructions
   10. Follow-up Notes

### Validation Panel (Right Side, Sticky)

**Dimensions**
- Width: 30% of viewport
- Min-width: 320px
- Background: #F8FAFC
- Border-left: 1px solid #E5E7EB
- Padding: 24px
- Position: sticky, top: 64px

**Header**
```
┌─────────────────────────────┐
│ Completeness Validation      │
│ 4 / 15 complete              │
│                              │
│ [Critical Items Pending]     │
│ Red badge                    │
└─────────────────────────────┘
```
- Title: font-size 14px, font-weight 700, color #2F2F2F
- Progress: font-size 12px, color #6B7280
- Badge: full width, varies by state

**Checklist Items**
```
✓ Patient identity confirmed
✓ Encounter selected
✓ Consent selected
✗ Procedure description (EN)  ← CRITICAL
✗ Procedure description (AR)  ← CRITICAL
⚠ Fasting instructions        ← WARNING
```
- Icon size: 18px
- Green check: #10B981
- Red X: #EF4444
- Yellow warning: #F59E0B
- Label font-size: 13px
- Critical tag: red, font-size 10px, uppercase
- Item spacing: 12px
- Clickable: jumps to field

**Overall Status Badge**
- Critical Items Pending: background #FEE2E2, color #991B1B
- Warnings Only: background #FEF3C7, color #92400E
- All Ready: background #D1FAE5, color #065F46
- Height: 32px
- Padding: 8px 12px
- Font-size: 13px
- Font-weight: 600
- Radius: 16px
- Margin-bottom: 16px

---

## Screen 10: Draft PDF Review

### Frame Specifications
- **Desktop**: 1440px × 900px
- **Background**: #F4F7FB

### Layout Structure
```
┌────────────────────────────────────────────────────────────────┐
│ Stepper: 1-9 ✓ [10. PDF Review] 11-12 ...                     │
├────────────────────────────────────────────────────────────────┤
│ Main Content (70%)       │ Validation Panel (30%)              │
│                          │                                      │
│ [PDF Generated ✓]        │ Evidence Readiness                  │
│ 28 May 2024, 14:35 SAT   │ ✓ Audit trail ready                 │
│ DOC-2024-789456          │ ✓ PDF ready                         │
│                          │ ✓ Signature readiness confirmed     │
│ [Open Draft PDF] ← Large │ ✓ Anesthesia metadata included      │
│                          │ ✓ Legal archive ready               │
│ ┌────────────────────┐  │                                      │
│ │ Patient Summary    │  │ [All Ready ✓]                       │
│ │ Ahmed Al-Mansouri  │  │                                      │
│ │ MRN-2024-001234    │  │                                      │
│ └────────────────────┘  │                                      │
│ ┌────────────────────┐  │                                      │
│ │ Encounter Summary  │  │                                      │
│ │ ENC-2024-456789    │  │                                      │
│ └────────────────────┘  │                                      │
│ ┌────────────────────┐  │                                      │
│ │ Consent Summary    │  │                                      │
│ │ Laparoscopic Chol. │  │                                      │
│ │ [IMC Approved ✓]   │  │                                      │
│ └────────────────────┘  │                                      │
│ ┌────────────────────┐  │                                      │
│ │ Anesthesia Summary │  │                                      │
│ │ General Anesthesia │  │                                      │
│ │ [Review Requested] │  │                                      │
│ │ Dr. Sarah Al-Otaibi│  │                                      │
│ └────────────────────┘  │                                      │
│                          │                                      │
│ Next: [Send to Patient]  │                                      │
│ (disabled if review pending)                                    │
└────────────────────────────────────────────────────────────────┘
```

### Components

1. **PDF Generated Badge**
   - Background: #D1FAE5
   - Border: 1px solid #10B981
   - Color: #065F46
   - Height: 36px
   - Padding: 8px 16px
   - Font-size: 14px
   - Font-weight: 600
   - Radius: 18px
   - Icon: CheckCircle, 20px, #10B981
   - Display: inline-flex, items-center, gap 8px

2. **Timestamp & Document ID**
   - Font-size: 13px
   - Color: #6B7280
   - Margin-top: 8px
   - Format: "Generated on 28 May 2024 at 14:35 SAT"
   - Document ID: "DOC-2024-789456", monospace font

3. **Open Draft PDF Button** (primary action)
   - Width: 240px
   - Height: 52px
   - Background: #002B5C
   - Color: #FFFFFF
   - Font-size: 16px
   - Font-weight: 700
   - Radius: 10px
   - Icon: ExternalLink, 20px
   - Shadow: 0 4px 6px rgba(0,43,92,0.2)
   - Hover: background #001F45, shadow increased
   - Margin: 24px 0

4. **Summary Cards** (4 cards, stacked)
   - Width: 100%
   - Background: #FFFFFF
   - Border: 1px solid #D8DCE3
   - Radius: 12px
   - Padding: 20px
   - Margin-bottom: 16px
   - Shadow: 0 1px 3px rgba(0,0,0,0.05)

5. **Summary Card Header**
   - Font-size: 13px
   - Font-weight: 600
   - Color: #6B7280
   - Text-transform: uppercase
   - Letter-spacing: 0.05em
   - Border-bottom: 1px solid #F3F4F6
   - Padding-bottom: 12px
   - Margin-bottom: 12px

6. **Summary Card Content**
   - Font-size: 14px
   - Color: #2F2F2F
   - Line-height: 1.6
   - Key-value pairs:
     - Key: font-weight 600, color #6B7280
     - Value: font-weight 400, color #2F2F2F
     - Spacing: 8px between pairs

7. **IMC Approved Badge** (in Consent Summary)
   - Background: #FEF3C7
   - Border: 1px solid #C9A13B
   - Color: #92400E
   - Height: 24px
   - Padding: 4px 10px
   - Font-size: 11px
   - Font-weight: 700
   - Radius: 12px
   - Icon: Shield, 14px, #C9A13B

8. **Review Status Badge** (in Anesthesia Summary)
   - Requested: background #FEF3C7, color #92400E
   - In Progress: background #DBEAFE, color #1E40AF
   - Approved: background #D1FAE5, color #065F46
   - Height: 24px
   - Padding: 4px 10px
   - Font-size: 11px
   - Font-weight: 600
   - Radius: 12px

9. **Evidence Readiness Panel** (right sidebar)
   - Header: "Evidence Readiness"
   - Font-size: 14px, font-weight 700
   - Checklist items with green checks
   - Overall badge: "All Ready ✓"
   - Background: #D1FAE5
   - Color: #065F46

10. **Next Action Section**
    - Background: #EFF6FF
    - Border: 1px solid #3B82F6
    - Padding: 16px 20px
    - Radius: 8px
    - Icon: ArrowRight, 20px, #1E40AF
    - Text: "Next: Send to Patient"
    - Font-size: 14px
    - Font-weight: 600
    - Color: #1E40AF
    - If disabled: gray colors, tooltip explaining why

### States
- **PDF Not Generated**: Show "Generate Draft PDF" button instead
- **Generating**: Loading spinner, "Generating PDF..."
- **Generated**: Full review interface
- **Error**: Red alert with retry button
- **Review Pending**: Anesthesia summary shows pending state, "Send" disabled

---

**Remaining screens (4, 7, 8, 11, 12, 13) follow similar specification patterns with appropriate layouts, components, states, and RTL adaptations.**

---

**Document Version**: 1.0  
**Last Updated**: 8 June 2026  
**Purpose**: Detailed screen layout and component specifications for all 13 workflow screens
