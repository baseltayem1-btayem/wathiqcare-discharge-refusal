# 35 — IMC Surgery Doctors Integration

## Source

Official IMC public doctors directory: `https://www.imc.med.sa/ar/doctors`  
Fetched: 2026-06-29  
Filter: General Surgery physicians (`الجراحة العامة` / `General Surgery`)

## Integrated physicians

All data — Arabic names, designations, specialties, departments, photos, and profile links — are taken verbatim from the IMC source. English names are derived from the official IMC profile URL slugs where an English profile page is not published.

| # | Name (EN) | Name (AR) | Designation | Specialty (EN) | Department (EN) | Profile |
|---|-----------|-----------|-------------|----------------|-----------------|---------|
| 1 | Abdulaziz M. Saleem | عبد العزيز سليم | MBBS, MSc, FRCSC | General Surgery & Colorectal Surgery Consultant | Department of Surgery | [Link](https://www.imc.med.sa/ar/abdulaziz-m-saleem) |
| 2 | Abrar Youssef Nawawi | ابرار يوسف نواوي | MBBS | General Surgery, Hepato-Pancreato-Biliary & Transplant Consultant | General Surgery Department | [Link](https://www.imc.med.sa/ar/abrar-youssef-nawawi) |
| 3 | Ahmad Jan Mohammed | أحمد جان | MBBS, MRCS, FRCS, FMBS, MIS | General Surgery & Bariatric Surgery Consultant | Department of Surgery | [Link](https://www.imc.med.sa/ar/ahmad-jan-mohammed) |
| 4 | Bashaer S. Albayhani | بشاير البيحاني | MBBS, SBGS | General Surgery Senior Resident | Department of Surgery | [Link](https://www.imc.med.sa/ar/bashaer-s-albayhani) |
| 5 | Deena Hadedeya | دينا حديديه | MBBS | Breast & Endocrine Tumors Surgery & General Surgery Consultant | Department of Surgery | [Link](https://www.imc.med.sa/ar/deena-hadedeya) |
| 6 | Fahd Ali Binjoobah | فهد علي بن جوبح | MBBS | General Surgery Specialist | Department of Surgery | [Link](https://www.imc.med.sa/ar/fahd-binjoobah) |

## Implementation

- File: `apps/web/src/components/informed-consents/production-workspace/lib/imc-doctors.ts`
- Export: `IMC_GENERAL_SURGERY_PHYSICIANS: ImcPhysician[]`
- Matching: `findImcGeneralSurgeryPhysician(name)` normalizes and matches against English name, Arabic name, and profile slug
- Display: `CanvaSidebarProfile` renders the matched physician's photo, Arabic/English name, specialty, department, and IMC profile link
- Fallback: If the logged-in physician does not match any IMC General Surgery physician, the card shows initials and "Profile unavailable" — no fabricated data is displayed

## Verification

- No placeholder doctor names, photos, biographies, specialties, or departments are present in the workspace.
- All physician profile URLs point to official IMC `/ar/{slug}` pages.
- Photo URLs are the official IMC CDN paths.
- `SettingsPage` continues to display the authenticated user's context (`physician.name`, `specialty`, `licenseNumber`) but the sidebar physician card uses only the IMC-sourced physician record.

## Doctors excluded

Physicians in other surgical subspecialties (e.g., Vascular Surgery, Urology, ENT, Pediatric Surgery, Orthopedic Surgery) were not included because they are not General Surgery physicians per the source filter.
