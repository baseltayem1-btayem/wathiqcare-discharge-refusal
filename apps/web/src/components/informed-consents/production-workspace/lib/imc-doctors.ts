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
    nameAr: "عبد العزيز سليم",
    nameEn: "Abdulaziz M. Saleem",
    designation: "MBBS, MSc, FRCSC",
    specialtyAr: "استشاري الجراحة العامة وجراحة القولون والمستقيم",
    specialtyEn: "General Surgery & Colorectal Surgery Consultant",
    departmentAr: "قسم الجراحة",
    departmentEn: "Department of Surgery",
    photoUrl: "https://www.imc.med.sa/sites/default/files/doctor_images/doctor-abdulaziz-m-saleem.jpg",
    profileUrl: "https://www.imc.med.sa/ar/abdulaziz-m-saleem",
  },
  {
    id: "abrar-youssef-nawawi",
    nameAr: "ابرار يوسف نواوي",
    nameEn: "Abrar Youssef Nawawi",
    designation: "MBBS",
    specialtyAr: "استشاري جراحة عامة جراحة اورام الكبد و البنكرياس و القنوات الصفراوية و تنظير القنوات الصفراوية و زراعة الاعضاء",
    specialtyEn: "General Surgery, Hepato-Pancreato-Biliary & Transplant Consultant",
    departmentAr: "قسم الجراحة العامة",
    departmentEn: "General Surgery Department",
    photoUrl: "https://www.imc.med.sa/sites/default/files/doctor_images/doctor-abrar-y-nawawi.jpg",
    profileUrl: "https://www.imc.med.sa/ar/abrar-youssef-nawawi",
  },
  {
    id: "ahmad-jan-mohammed",
    nameAr: "أحمد جان",
    nameEn: "Ahmad Jan Mohammed",
    designation: "MBBS, MRCS, FRCS, FMBS, MIS",
    specialtyAr: "استشاري الجراحة العامة وجراحة السمنة",
    specialtyEn: "General Surgery & Bariatric Surgery Consultant",
    departmentAr: "قسم الجراحة",
    departmentEn: "Department of Surgery",
    photoUrl: "https://www.imc.med.sa/sites/default/files/doctor_images/doctor-ahmad-jan.jpg",
    profileUrl: "https://www.imc.med.sa/ar/ahmad-jan-mohammed",
  },
  {
    id: "bashaer-s-albayhani",
    nameAr: "بشاير البيحاني",
    nameEn: "Bashaer S. Albayhani",
    designation: "MBBS, SBGS",
    specialtyAr: "نائبة أولى في الجراحة العامة",
    specialtyEn: "General Surgery Senior Resident",
    departmentAr: "قسم الجراحة",
    departmentEn: "Department of Surgery",
    photoUrl: "https://www.imc.med.sa/sites/default/files/2026-05/a24e451545429bfe4b3cb00d4c7eef3b1593673067_0.png",
    profileUrl: "https://www.imc.med.sa/ar/bashaer-s-albayhani",
  },
  {
    id: "deena-hadedeya",
    nameAr: "دينا حديديه",
    nameEn: "Deena Hadedeya",
    designation: "MBBS",
    specialtyAr: "استشاري جراحات اورام الثدي, الغدد الصماء و الجراحة العامة",
    specialtyEn: "Breast & Endocrine Tumors Surgery & General Surgery Consultant",
    departmentAr: "قسم الجراحة",
    departmentEn: "Department of Surgery",
    photoUrl: "https://www.imc.med.sa/sites/default/files/doctor_images/doctor-Deena-Hadedeya.jpeg",
    profileUrl: "https://www.imc.med.sa/ar/deena-hadedeya",
  },
  {
    id: "fahd-binjoobah",
    nameAr: "فهد علي بن جوبح",
    nameEn: "Fahd Ali Binjoobah",
    designation: "MBBS",
    specialtyAr: "أخصائي جراحة عامة",
    specialtyEn: "General Surgery Specialist",
    departmentAr: "قسم الجراحة",
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
