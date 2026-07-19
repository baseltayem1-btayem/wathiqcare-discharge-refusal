/**
 * Official IMC General Surgery physicians extracted from the IMC doctors source.
 * Source: https://www.imc.med.sa/ar/doctors (department filter: General Surgery)
 * Fetched: 2026-06-29
 *
 * These are the ONLY physician names, photos, specialties, departments, and profile links
 * that may be shown in the production workspace physician profile card.
 *
 * English names are derived from the official IMC profile URL slugs when an English
 * profile page is not published. Arabic names, designations, specialties, departments,
 * photos, and profile URLs are taken verbatim from the IMC public doctors directory.
 */

export interface ImcPhysician {
  id: string;
  nameAr: string;
  nameEn: string;
  designation: string;
  specialtyAr: string;
  specialtyEn: string;
  departmentAr: string;
  departmentEn: string;
  photoUrl: string;
  profileUrl: string;
}

export const IMC_GENERAL_SURGERY_PHYSICIANS: ImcPhysician[] = [
  {
    id: "abdulaziz-m-saleem",
    nameAr: "\u0639\u0628\u062f \u0627\u0644\u0639\u0632\u064a\u0632 \u0633\u0644\u064a\u0645",
    nameEn: "Abdulaziz M. Saleem",
    designation: "MBBS, MSc, FRCSC",
    specialtyAr: "\u0627\u0633\u062a\u0634\u0627\u0631\u064a \u0627\u0644\u062c\u0631\u0627\u062d\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0648\u062c\u0631\u0627\u062d\u0629 \u0627\u0644\u0642\u0648\u0644\u0648\u0646 \u0648\u0627\u0644\u0645\u0633\u062a\u0642\u064a\u0645",
    specialtyEn: "General Surgery & Colorectal Surgery Consultant",
    departmentAr: "\u0642\u0633\u0645 \u0627\u0644\u062c\u0631\u0627\u062d\u0629",
    departmentEn: "Department of Surgery",
    photoUrl: "https://www.imc.med.sa/sites/default/files/doctor_images/doctor-abdulaziz-m-saleem.jpg",
    profileUrl: "https://www.imc.med.sa/ar/abdulaziz-m-saleem",
  },
  {
    id: "abrar-youssef-nawawi",
    nameAr: "\u0627\u0628\u0631\u0627\u0631 \u064a\u0648\u0633\u0641 \u0646\u0648\u0627\u0648\u064a",
    nameEn: "Abrar Youssef Nawawi",
    designation: "MBBS",
    specialtyAr: "\u0627\u0633\u062a\u0634\u0627\u0631\u064a \u062c\u0631\u0627\u062d\u0629 \u0639\u0627\u0645\u0629 \u062c\u0631\u0627\u062d\u0629 \u0627\u0648\u0631\u0627\u0645 \u0627\u0644\u0643\u0628\u062f \u0648 \u0627\u0644\u0628\u0646\u0643\u0631\u064a\u0627\u0633 \u0648 \u0627\u0644\u0642\u0646\u0648\u0627\u062a \u0627\u0644\u0635\u0641\u0631\u0627\u0648\u064a\u0629 \u0648 \u062a\u0646\u0638\u064a\u0631 \u0627\u0644\u0642\u0646\u0648\u0627\u062a \u0627\u0644\u0635\u0641\u0631\u0627\u0648\u064a\u0629 \u0648 \u0632\u0631\u0627\u0639\u0629 \u0627\u0644\u0627\u0639\u0636\u0627\u0621",
    specialtyEn: "General Surgery, Hepato-Pancreato-Biliary & Transplant Consultant",
    departmentAr: "\u0642\u0633\u0645 \u0627\u0644\u062c\u0631\u0627\u062d\u0629 \u0627\u0644\u0639\u0627\u0645\u0629",
    departmentEn: "General Surgery Department",
    photoUrl: "https://www.imc.med.sa/sites/default/files/doctor_images/doctor-abrar-y-nawawi.jpg",
    profileUrl: "https://www.imc.med.sa/ar/abrar-youssef-nawawi",
  },
  {
    id: "ahmad-jan-mohammed",
    nameAr: "\u0623\u062d\u0645\u062f \u062c\u0627\u0646",
    nameEn: "Ahmad Jan Mohammed",
    designation: "MBBS, MRCS, FRCS, FMBS, MIS",
    specialtyAr: "\u0627\u0633\u062a\u0634\u0627\u0631\u064a \u0627\u0644\u062c\u0631\u0627\u062d\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0648\u062c\u0631\u0627\u062d\u0629 \u0627\u0644\u0633\u0645\u0646\u0629",
    specialtyEn: "General Surgery & Bariatric Surgery Consultant",
    departmentAr: "\u0642\u0633\u0645 \u0627\u0644\u062c\u0631\u0627\u062d\u0629",
    departmentEn: "Department of Surgery",
    photoUrl: "https://www.imc.med.sa/sites/default/files/doctor_images/doctor-ahmad-jan.jpg",
    profileUrl: "https://www.imc.med.sa/ar/ahmad-jan-mohammed",
  },
  {
    id: "bashaer-s-albayhani",
    nameAr: "\u0628\u0634\u0627\u064a\u0631 \u0627\u0644\u0628\u064a\u062d\u0627\u0646\u064a",
    nameEn: "Bashaer S. Albayhani",
    designation: "MBBS, SBGS",
    specialtyAr: "\u0646\u0627\u0626\u0628\u0629 \u0623\u0648\u0644\u0649 \u0641\u064a \u0627\u0644\u062c\u0631\u0627\u062d\u0629 \u0627\u0644\u0639\u0627\u0645\u0629",
    specialtyEn: "General Surgery Senior Resident",
    departmentAr: "\u0642\u0633\u0645 \u0627\u0644\u062c\u0631\u0627\u062d\u0629",
    departmentEn: "Department of Surgery",
    photoUrl: "https://www.imc.med.sa/sites/default/files/2026-05/a24e451545429bfe4b3cb00d4c7eef3b1593673067_0.png",
    profileUrl: "https://www.imc.med.sa/ar/bashaer-s-albayhani",
  },
  {
    id: "deena-hadedeya",
    nameAr: "\u062f\u064a\u0646\u0627 \u062d\u062f\u064a\u062f\u064a\u0647",
    nameEn: "Deena Hadedeya",
    designation: "MBBS",
    specialtyAr: "\u0627\u0633\u062a\u0634\u0627\u0631\u064a \u062c\u0631\u0627\u062d\u0627\u062a \u0627\u0648\u0631\u0627\u0645 \u0627\u0644\u062b\u062f\u064a, \u0627\u0644\u063a\u062f\u062f \u0627\u0644\u0635\u0645\u0627\u0621 \u0648 \u0627\u0644\u062c\u0631\u0627\u062d\u0629 \u0627\u0644\u0639\u0627\u0645\u0629",
    specialtyEn: "Breast & Endocrine Tumors Surgery & General Surgery Consultant",
    departmentAr: "\u0642\u0633\u0645 \u0627\u0644\u062c\u0631\u0627\u062d\u0629",
    departmentEn: "Department of Surgery",
    photoUrl: "https://www.imc.med.sa/sites/default/files/doctor_images/doctor-Deena-Hadedeya.jpeg",
    profileUrl: "https://www.imc.med.sa/ar/deena-hadedeya",
  },
  {
    id: "fahd-binjoobah",
    nameAr: "\u0641\u0647\u062f \u0639\u0644\u064a \u0628\u0646 \u062c\u0648\u0628\u062d",
    nameEn: "Fahd Ali Binjoobah",
    designation: "MBBS",
    specialtyAr: "\u0623\u062e\u0635\u0627\u0626\u064a \u062c\u0631\u0627\u062d\u0629 \u0639\u0627\u0645\u0629",
    specialtyEn: "General Surgery Specialist",
    departmentAr: "\u0642\u0633\u0645 \u0627\u0644\u062c\u0631\u0627\u062d\u0629",
    departmentEn: "Department of Surgery",
    photoUrl: "https://www.imc.med.sa/sites/default/files/2026-05/dr%20fahad%20a.%20bin%20joobah.jpg",
    profileUrl: "https://www.imc.med.sa/ar/fahd-binjoobah",
  },
];

const normalizedName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[\.\,\-\s]+/g, "")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "");

export function findImcGeneralSurgeryPhysician(
  name?: string | null,
): ImcPhysician | undefined {
  if (!name) return undefined;
  const target = normalizedName(name);
  return IMC_GENERAL_SURGERY_PHYSICIANS.find((p) => {
    const names = [p.nameEn, p.nameAr, p.id.replace(/-/g, "")];
    return names.some((n) => normalizedName(n).includes(target) || target.includes(normalizedName(n)));
  });
}

export function getFirstImcGeneralSurgeryPhysician(): ImcPhysician | undefined {
  return IMC_GENERAL_SURGERY_PHYSICIANS[0];
}
