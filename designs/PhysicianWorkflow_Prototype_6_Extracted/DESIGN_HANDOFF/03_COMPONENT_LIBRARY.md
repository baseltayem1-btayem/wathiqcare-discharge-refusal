# WathiqCare Physician Workflow - Component Library Specification

## Component Inventory

### 1. App Shell / Enterprise Layout

**Purpose**: Main application wrapper providing consistent navigation, header, and layout structure

**Structure**:
```
┌────────────────────────────────────────────────────────┐
│ Header (height: 64px)                                  │
├─────────────┬──────────────────────────────────────────┤
│ Sidebar     │ Main Content Area                        │
│ (240px)     │                                          │
│             │                                          │
│             │                                          │
│             │                                          │
└─────────────┴──────────────────────────────────────────┘
```

**Props**:
- `currentScreen`: string - Active navigation item
- `physicianName`: string - Logged-in physician
- `physicianRole`: string - Role/specialty
- `alertCount`: number - Notification count
- `lang`: 'en' | 'ar' - Current language

**Visual States**:
- Default
- Collapsed sidebar (tablet)
- RTL layout (Arabic)

**Colors**:
- Sidebar background: #002B5C (Royal Blue)
- Header background: #FFFFFF
- Header border: #E5E7EB
- Active nav item: rgba(255,255,255,0.12) background, #C9A13B left border

**Typography**:
- Logo: font-size 14px, font-weight 700
- Nav items: font-size 14px, font-weight 500
- Physician name: font-size 12px, font-weight 600

**Spacing**:
- Header padding: 16px 24px
- Sidebar padding: 16px
- Nav item padding: 12px 16px
- Gap between nav items: 4px

---

### 2. Workflow Stepper

**Purpose**: Shows 8-step workflow progress and allows navigation to completed steps

**Structure**:
```
[1. Patient] → [2. Encounter] → [3. Consent] → ... → [8. Send]
   ✓ Blue        Current           Pending             Pending
```

**Props**:
- `currentStep`: 1-8 - Active step number
- `completedSteps`: number[] - Array of completed step numbers
- `stepLabels`: { en: string, ar: string }[] - Step names
- `onStepClick`: (step: number) => void - Navigation handler
- `lang`: 'en' | 'ar'

**Visual States**:
- **Completed**: green background #10B981, white checkmark icon
- **Current**: blue background #002B5C, white number, border-bottom 2px
- **Pending**: gray background #F3F4F6, gray text #9CA3AF
- **Disabled**: gray, cursor not-allowed

**Dimensions**:
- Height: 60px
- Step indicator: 32px circle
- Font-size: 13px
- Connector chevron: 16px

**Colors**:
- Completed: background #10B981, text #FFFFFF
- Current: background #002B5C, text #FFFFFF, border-bottom #002B5C
- Pending: background #F3F4F6, text #9CA3AF

**Accessibility**:
- Keyboard navigable
- ARIA labels for screen readers
- Focus visible state: 2px ring #002B5C

---

### 3. Patient Card

**Purpose**: Displays patient information in search results and selection screens

**Structure**:
```
┌──────────────────────────────────────────────┐
│ [Avatar] Ahmed Al-Mansouri        [Selected] │
│          أحمد المنصوري                       │
│          📋 MRN-2024-001234                  │
│          📅 15 Mar 1975 | ♂ Male             │
│          📁 CASE-2024-5678                   │
│          📞 +966 50 123 4567                 │
└──────────────────────────────────────────────┘
```

**Props**:
- `patient`: Patient object
  - `id`: string
  - `mrn`: string
  - `name`: string
  - `nameAr`: string
  - `dateOfBirth`: string
  - `gender`: 'M' | 'F' | 'Other'
  - `caseId`: string (optional)
  - `contact`: string (optional)
- `selected`: boolean
- `onClick`: () => void
- `lang`: 'en' | 'ar'

**Visual States**:
- **Default**: border 1px #D8DCE3, background #FFFFFF
- **Hover**: border 1px #9CA3AF, shadow 0 2px 4px rgba(0,0,0,0.1)
- **Selected**: border 2px #002B5C, background #EFF6FF, "Selected" badge

**Dimensions**:
- Width: 100% (responsive)
- Min-height: 160px
- Padding: 20px
- Border-radius: 12px
- Avatar: 48px circle

**Colors**:
- Default border: #D8DCE3
- Selected border: #002B5C
- Selected background: #EFF6FF
- Name: #2F2F2F
- Labels: #6B7280
- Icons: #6B7280

**Typography**:
- Name (EN): font-size 16px, font-weight 600
- Name (AR): font-size 14px, font-weight 400
- MRN: font-size 13px, monospace
- Demographics: font-size 12px

**Accessibility**:
- Clickable entire card
- Keyboard focus visible
- ARIA role="button"
- ARIA-selected for selected state

---

### 4. Encounter Card

**Purpose**: Displays encounter information with sync status and TrakCare source

**Props**:
- `encounter`: Encounter object
  - `id`: string
  - `encounterNumber`: string
  - `caseNumber`: string
  - `admissionDate`: string
  - `department`: string
  - `attendingPhysician`: string
  - `physicianLicense`: string
  - `physicianSpecialty`: string
  - `diagnosis`: string
  - `plannedProcedure`: string
  - `syncStatus`: 'synced' | 'pending' | 'manual' | 'failed'
  - `source`: 'TrakCare' | 'Manual'
- `selected`: boolean
- `onSelect`: () => void
- `onSync`: () => void (optional, if sync available)
- `lang`: 'en' | 'ar'

**Visual States**:
- Default
- Hover
- Selected
- Sync in progress
- Sync failed

**Components Within**:
- Sync Status Badge
- Source Badge
- Sync Button (conditional)

**Dimensions**:
- Width: 48% (2-column grid)
- Padding: 24px
- Border-radius: 12px
- Section spacing: 12px

---

### 5. Consent / IMC Library Card

**Purpose**: Displays IMC-approved consent templates with mapping status

**Props**:
- `consent`: IMCLibraryItem object
  - `id`: string
  - `titleEn`: string
  - `titleAr`: string
  - `templateType`: string
  - `version`: string
  - `language`: 'en' | 'ar' | 'bilingual'
  - `status`: 'active' | 'inactive'
  - `imcApproved`: boolean
  - `mappingAvailable`: boolean
  - `summary`: string
- `selected`: boolean
- `onClick`: () => void
- `lang`: 'en' | 'ar'

**Visual States**:
- Active + Mapped: green indicators
- Active + Missing Mapping: red warning
- Inactive: grayed out, not clickable
- Selected: blue border

**Components Within**:
- IMC Approved Badge (gold)
- Status Chip (active/inactive)
- Mapping Status Indicator
- Version Badge
- Language Badge

**Dimensions**:
- Width: 100% (single column) or 48% (2-column)
- Padding: 24px
- Border-radius: 12px

**Critical Warning** (if mapping missing):
- Background: #FEE2E2
- Border: 2px solid #EF4444
- Text: "Runtime template mapping required"

---

### 6. Anesthesia Option Card

**Purpose**: Selectable anesthesia type with review requirement indication

**Props**:
- `type`: 'none' | 'local' | 'regional' | 'general' | 'sedation'
- `titleEn`: string
- `titleAr`: string
- `description`: string
- `reviewRequired`: boolean
- `reviewPriority`: 'none' | 'optional' | 'required' | 'high-priority'
- `selected`: boolean
- `onClick`: () => void
- `lang`: 'en' | 'ar'

**Structure**:
```
┌─────────────────────────┐
│    [Icon 48px]           │
│                          │
│ General Anesthesia       │
│ التخدير العام            │
│                          │
│ Patient completely       │
│ unconscious during       │
│ procedure                │
│                          │
│ [Review Required ⚠]     │
└─────────────────────────┘
```

**Visual States**:
- Default: border 1px #D8DCE3
- Hover: border 1px #9CA3AF, shadow
- Selected: border 3px #002B5C, background #EFF6FF, shadow 0 0 0 4px #002B5C20

**Icon Colors**:
- None: #9CA3AF
- Local: #4B9CD3
- Regional: #F59E0B
- General: #EF4444
- Sedation: #F59E0B

**Review Badge Colors**:
- No Review: (not shown)
- Optional: background #DBEAFE, text #1E40AF
- Required: background #FEF3C7, text #92400E
- High Priority: background #FEE2E2, text #991B1B

**Dimensions**:
- Width: 32% (3-column) or 48% (2-column)
- Height: 200px
- Padding: 24px
- Border-radius: 12px

---

### 7. Disclosure Field Card (Bilingual)

**Purpose**: Paired EN/AR textarea fields with indicators

**Props**:
- `labelEn`: string
- `labelAr`: string
- `valueEn`: string
- `valueAr`: string
- `maxLength`: number
- `required`: boolean
- `onChangeEn`: (value: string) => void
- `onChangeAr`: (value: string) => void
- `indicators`: {
    patientView: boolean
    pdf: boolean
    evidence: boolean
    auditTrail: boolean
  }
- `validationState`: 'valid' | 'invalid' | 'warning'
- `lang`: 'en' | 'ar'

**Structure**:
```
┌──────────────────────────────────────┐
│ Procedure Description  [CRITICAL]     │
│ ┌──────────────────────────────────┐ │
│ │ English Field                     │ │
│ │ Minimally invasive removal...    │ │
│ │                                   │ │
│ └──────────────────────────────────┘ │
│ 245/2000 characters                   │
│ 👁 Patient view  📄 PDF               │
│ 📦 Evidence  🕒 Audit                 │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ وصف الإجراء  [إلزامي]                │
│ ┌──────────────────────────────────┐ │
│ │ Arabic Field                      │ │
│ │ إزالة طفيفة التوغل...             │ │
│ │                                   │ │
│ └──────────────────────────────────┘ │
│ 0/2000 حرف                            │
│ 👁 📄 📦 🕒                           │
└──────────────────────────────────────┘
```

**Visual States**:
- Default: border #D8DCE3
- Focus: border #002B5C, ring 2px #002B5C20
- Error: border #EF4444, background #FEE2E2
- Warning: border #F59E0B, background #FEF3C7

**Components**:
- Label with critical badge (if required)
- Textarea (auto-resize)
- Character count
- Indicator icons (4 icons)

**Dimensions**:
- Width: 100%
- Textarea min-height: 120px
- Textarea max-height: 300px
- Padding: 12px 16px
- Border-radius: 8px

---

### 8. Validation Badge

**Purpose**: Shows critical/warning/ready status throughout workflow

**Props**:
- `severity`: 'critical' | 'warning' | 'ready'
- `label`: string
- `size`: 'sm' | 'md' | 'lg'

**Visual Variants**:

**Critical**:
- Background: #FEE2E2
- Border: 1px solid #EF4444
- Text: #991B1B
- Icon: X or AlertCircle, #EF4444

**Warning**:
- Background: #FEF3C7
- Border: 1px solid #F59E0B
- Text: #92400E
- Icon: AlertTriangle, #F59E0B

**Ready**:
- Background: #D1FAE5
- Border: 1px solid #10B981
- Text: #065F46
- Icon: CheckCircle, #10B981

**Dimensions**:
- sm: height 20px, font-size 10px, padding 3px 8px
- md: height 24px, font-size 11px, padding 4px 10px
- lg: height 32px, font-size 13px, padding 8px 12px
- Border-radius: height / 2 (fully rounded)

---

### 9. IMC Approved Badge

**Purpose**: Indicates IMC-approved consent templates

**Props**:
- `size`: 'sm' | 'md'
- `lang`: 'en' | 'ar'

**Visual**:
- Background: #FEF3C7
- Border: 1px solid #C9A13B (Luxury Gold)
- Text: #92400E
- Icon: Shield, #C9A13B
- Font-weight: 700

**Dimensions**:
- sm: height 20px, font-size 10px
- md: height 24px, font-size 11px
- Padding: 4px 10px
- Border-radius: 12px
- Icon size: 14px

**Text**:
- EN: "IMC Approved ✓"
- AR: "معتمد من IMC ✓"

---

### 10. Sync Status Badge

**Purpose**: Shows TrakCare sync status for encounters

**Props**:
- `status`: 'synced' | 'pending' | 'manual' | 'failed'
- `lang`: 'en' | 'ar'

**Visual Variants**:

**Synced**:
- Background: #D1FAE5
- Border: 1px solid #10B981
- Text: #065F46
- Icon: CheckCircle

**Pending**:
- Background: #FEF3C7
- Border: 1px solid #F59E0B
- Text: #92400E
- Icon: Clock

**Manual**:
- Background: #E5E7EB
- Border: 1px solid #9CA3AF
- Text: #374151
- Icon: Edit

**Failed**:
- Background: #FEE2E2
- Border: 1px solid #EF4444
- Text: #991B1B
- Icon: AlertCircle

**Dimensions**:
- Height: 24px
- Font-size: 11px
- Font-weight: 600
- Padding: 4px 10px
- Border-radius: 12px

---

### 11. Readiness Checklist Item

**Purpose**: Individual validation item in the readiness panel

**Props**:
- `id`: string
- `label`: string
- `labelAr`: string
- `complete`: boolean
- `severity`: 'critical' | 'warning' | 'ready'
- `section`: string (which workflow step)
- `onClick`: () => void (navigate to field)
- `lang`: 'en' | 'ar'

**Structure**:
```
✓ Procedure description (EN)
✗ Procedure description (AR)  [CRITICAL]
⚠ Fasting instructions        [WARNING]
```

**Visual States**:
- Complete: green check icon, normal text
- Critical missing: red X icon, critical badge
- Warning: yellow warning icon, warning badge
- Clickable: hover background #F3F4F6

**Dimensions**:
- Padding: 12px
- Icon size: 18px
- Font-size: 13px
- Badge font-size: 10px
- Gap: 12px between icon and text

**Colors**:
- Complete icon: #10B981
- Critical icon: #EF4444
- Warning icon: #F59E0B
- Text: #2F2F2F
- Critical badge: background #FEE2E2, text #991B1B
- Warning badge: background #FEF3C7, text #92400E

---

### 12. Primary Button

**Purpose**: Main action buttons throughout workflow

**Props**:
- `label`: string
- `state`: 'default' | 'loading' | 'disabled' | 'success' | 'error'
- `onClick`: () => void
- `icon`: React.Component (optional)
- `size`: 'sm' | 'md' | 'lg'

**Visual States**:

**Default**:
- Background: #002B5C
- Color: #FFFFFF
- Hover: background #001F45
- Active: background #001835

**Loading**:
- Background: #002B5C
- Spinner icon (animated)
- Cursor: not-allowed

**Disabled**:
- Background: #D8DCE3
- Color: #9CA3AF
- Cursor: not-allowed
- Tooltip: explains why disabled

**Success** (temporary state):
- Background: #10B981
- Check icon
- Color: #FFFFFF

**Error** (temporary state):
- Background: #EF4444
- Alert icon
- Color: #FFFFFF

**Dimensions**:
- sm: height 36px, font-size 13px, padding 8px 16px
- md: height 44px, font-size 14px, padding 10px 20px
- lg: height 52px, font-size 16px, padding 14px 28px
- Border-radius: 8px
- Font-weight: 600

**Spacing**:
- Icon-text gap: 8px
- Min-width: 120px

---

### 13. Secondary Button

**Purpose**: Secondary actions, back buttons, cancel

**Props**: Same as Primary Button

**Visual**:
- Background: #FFFFFF
- Border: 1px solid #D8DCE3
- Color: #6B7280
- Hover: color #2F2F2F, border #9CA3AF
- Active: background #F3F4F6

**Disabled**:
- Border: #E5E7EB
- Color: #9CA3AF
- Cursor: not-allowed

---

### 14. Alert Banner

**Purpose**: Critical warnings, PHI protection notices, status messages

**Props**:
- `type`: 'critical' | 'warning' | 'info' | 'success'
- `title`: string
- `message`: string
- `dismissible`: boolean
- `onDismiss`: () => void
- `action`: { label: string, onClick: () => void } (optional)

**Visual Variants**:

**Critical**:
- Background: #FEE2E2
- Border: 1px solid #EF4444
- Border-left: 4px solid #EF4444
- Icon: AlertCircle, #EF4444
- Text: #991B1B

**Warning**:
- Background: #FEF3C7
- Border: 1px solid #F59E0B
- Border-left: 4px solid #F59E0B
- Icon: AlertTriangle, #F59E0B
- Text: #92400E

**Info**:
- Background: #DBEAFE
- Border: 1px solid #3B82F6
- Border-left: 4px solid #3B82F6
- Icon: Info, #3B82F6
- Text: #1E40AF

**Success**:
- Background: #D1FAE5
- Border: 1px solid #10B981
- Border-left: 4px solid #10B981
- Icon: CheckCircle, #10B981
- Text: #065F46

**Dimensions**:
- Padding: 16px 20px
- Border-radius: 8px
- Icon size: 20px
- Title font-size: 14px, font-weight 600
- Message font-size: 13px
- Action button: text button, underline on hover

---

### 15. Status Timeline Item

**Purpose**: Shows lifecycle events in status tracking

**Props**:
- `event`: string
- `timestamp`: string
- `actor`: string
- `status`: 'completed' | 'in-progress' | 'pending'
- `metadata`: object (optional additional data)

**Structure**:
```
● Draft Created                ✓
  28 May 2024, 10:15 AM
  Dr. Khalid Al-Qahtani
  
● Sent to Patient             ✓
  28 May 2024, 16:45 PM
  System
  
○ Evidence Package            ○
  Pending...
```

**Visual**:
- Completed: filled circle #10B981, checkmark
- In Progress: half-filled circle #4B9CD3, spinner
- Pending: empty circle #D8DCE3
- Connector line: 2px, #E5E7EB, vertical between nodes

**Dimensions**:
- Circle: 32px diameter
- Line thickness: 2px
- Event spacing: 24px between
- Padding-left: 48px (text offset from circle)
- Event font-size: 14px, font-weight 600
- Timestamp font-size: 12px, color #6B7280
- Actor font-size: 12px, color #6B7280

---

### 16. Evidence Package Indicator

**Purpose**: Shows evidence readiness status

**Props**:
- `ready`: boolean
- `items`: {
    auditTrail: boolean
    pdf: boolean
    signatureReady: boolean
    anesthesiaMetadata: boolean
    legalArchive: boolean
  }

**Structure**:
```
Evidence Readiness
✓ Audit trail ready
✓ PDF ready
✓ Signature readiness confirmed
✓ Anesthesia metadata included
✓ Legal archive ready

[All Ready ✓]
```

**Visual**:
- Header font-size: 14px, font-weight 700
- Item font-size: 13px
- Check icons: 16px, #10B981
- Overall badge: full width
- Ready: background #D1FAE5, text #065F46
- Not Ready: background #FEE2E2, text #991B1B

---

**Total Components: 16 core + additional variants**

**Implementation Notes**:
- All components must support bilingual EN/AR
- All components must support RTL layout
- All interactive components must have keyboard navigation
- All components must have clear disabled states
- All critical actions must have confirmation dialogs
- All form components must show validation states

---

**Document Version**: 1.0  
**Last Updated**: 8 June 2026  
**Purpose**: Reusable component library specifications for WathiqCare Physician Workflow
