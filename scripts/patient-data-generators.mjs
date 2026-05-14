/**
 * WathiqCare Online — MRN & Patient Data Generation Utilities
 * 
 * Provides reusable utilities for generating synthetic patient data
 * for testing and UAT purposes.
 * 
 * All data generated is completely synthetic and for testing only.
 */

import { randomInt } from 'crypto';

/**
 * MRN Generator
 * Generates medical record numbers in format: IMC-YYYY-XXXXX
 */
export class MrnGenerator {
  constructor(hospitalCode = 'IMC', startYear = new Date().getFullYear()) {
    this.hospitalCode = hospitalCode;
    this.year = startYear;
    this.sequence = 1000;
  }

  /**
   * Generate next sequential MRN
   * @returns {string} MRN in format: IMC-2026-01001
   */
  next() {
    const seq = String(this.sequence).padStart(5, '0');
    this.sequence++;
    return `${this.hospitalCode}-${this.year}-${seq}`;
  }

  /**
   * Generate MRN at specific index
   * @param {number} index
   * @returns {string} MRN
   */
  atIndex(index) {
    const seq = String(1000 + index).padStart(5, '0');
    return `${this.hospitalCode}-${this.year}-${seq}`;
  }

  /**
   * Generate random MRN (not sequential)
   * @returns {string} MRN
   */
  random() {
    const seq = String(randomInt(1000, 99999)).padStart(5, '0');
    return `${this.hospitalCode}-${this.year}-${seq}`;
  }

  /**
   * Batch generate MRNs
   * @param {number} count
   * @returns {string[]} Array of MRNs
   */
  batch(count) {
    const mrns = [];
    for (let i = 0; i < count; i++) {
      mrns.push(this.next());
    }
    return mrns;
  }

  /**
   * Parse MRN to extract components
   * @param {string} mrn
   * @returns {object} Parsed MRN { code, year, sequence }
   */
  static parse(mrn) {
    const match = mrn.match(/^([A-Z]+)-(\d{4})-(\d{5})$/);
    if (!match) {
      throw new Error(`Invalid MRN format: ${mrn}`);
    }
    return {
      code: match[1],
      year: parseInt(match[2]),
      sequence: parseInt(match[3]),
    };
  }
}

/**
 * Saudi National ID Generator
 * Generates fake but realistic Saudi National IDs
 * Format: 1YYMMNNDDDCC (1 = Saudi, YY = year, MM = month, NN = day, DDD = seq, CC = check)
 */
export class SaudiNationalIdGenerator {
  /**
   * Generate a single Saudi National ID
   * @returns {string} 10-digit Saudi ID
   */
  static generate() {
    const year = String(randomInt(40, 100)).padStart(2, '0');
    const month = String(randomInt(1, 13)).padStart(2, '0');
    const day = String(randomInt(1, 29)).padStart(2, '0');
    const sequence = String(randomInt(0, 1000)).padStart(3, '0');
    const check = String(randomInt(0, 100)).padStart(2, '0');

    return `1${year}${month}${day}${sequence}${check}`;
  }

  /**
   * Generate batch of IDs
   * @param {number} count
   * @returns {string[]} Array of Saudi IDs
   */
  static batch(count) {
    const ids = [];
    for (let i = 0; i < count; i++) {
      ids.push(this.generate());
    }
    return ids;
  }

  /**
   * Validate Saudi ID format
   * @param {string} id
   * @returns {boolean}
   */
  static isValid(id) {
    return /^1\d{9}$/.test(id);
  }
}

/**
 * Arabic Name Database for synthetic patient names
 */
export const SAUDI_NAMES = {
  firstNames: [
    'محمد', 'أحمد', 'علي', 'فاطمة', 'عائشة', 'خالد', 'سارة', 'نور',
    'زيد', 'ليلى', 'عمر', 'نادية', 'إبراهيم', 'هناء', 'ياسر', 'دينا',
    'نجيب', 'شمس', 'طارق', 'رقية', 'كمال', 'جميلة', 'رضا', 'مريم',
    'ناصر', 'بدرية', 'سالم', 'إلهام', 'حسن', 'وفاء',
  ],

  lastNames: [
    'آل سعود', 'الدوسري', 'الحمادي', 'الشمري', 'الراشد', 'الغامدي',
    'الشهري', 'الخثلان', 'الجابري', 'القحطاني', 'الأسمري', 'الشرقاوي',
    'الزهراني', 'العنزي', 'المطيري', 'الرويلي', 'الحويطي', 'البلوي',
    'السهلي', 'العريفي', 'الظفيري', 'الفلاح', 'الهاجري', 'الحربي',
    'الجمعة', 'السويلم', 'الخريجي', 'الدخيل',
  ],

  nameTranslation: {
    'محمد': 'Mohammad', 'أحمد': 'Ahmed', 'علي': 'Ali', 'فاطمة': 'Fatima',
    'عائشة': 'Aisha', 'خالد': 'Khalid', 'سارة': 'Sarah', 'نور': 'Noor',
    'زيد': 'Zayd', 'ليلى': 'Layla', 'عمر': 'Umar', 'نادية': 'Nadia',
    'إبراهيم': 'Ibrahim', 'هناء': 'Hana', 'ياسر': 'Yasir', 'دينا': 'Dina',
    'نجيب': 'Najib', 'شمس': 'Shams', 'طارق': 'Tariq', 'رقية': 'Raqia',
    'كمال': 'Kamal', 'جميلة': 'Jamila', 'رضا': 'Reda', 'مريم': 'Maryam',
    'ناصر': 'Nasser', 'بدرية': 'Badriya', 'سالم': 'Salem', 'إلهام': 'Ilham',
    'حسن': 'Hassan', 'وفاء': 'Wafa',
  },
};

/**
 * Patient Name Generator
 * Creates realistic but completely synthetic Saudi patient names
 */
export class PatientNameGenerator {
  /**
   * Generate a single patient name
   * @returns {string} Patient name in English (e.g., "Mohammad Al-Dosari")
   */
  static generate() {
    const firstName = SAUDI_NAMES.firstNames[
      randomInt(0, SAUDI_NAMES.firstNames.length)
    ];
    const lastName = SAUDI_NAMES.lastNames[
      randomInt(0, SAUDI_NAMES.lastNames.length)
    ];

    const firstNameEn = SAUDI_NAMES.nameTranslation[firstName] || firstName;
    const lastNameTransliterated = lastName.replace('آل ', 'Al-');

    return `${firstNameEn} ${lastNameTransliterated}`;
  }

  /**
   * Generate batch of names
   * @param {number} count
   * @returns {string[]} Array of patient names
   */
  static batch(count) {
    const names = new Set();
    while (names.size < count) {
      names.add(this.generate());
    }
    return Array.from(names);
  }

  /**
   * Generate name with guarantee of uniqueness in batch
   * @param {number} count
   * @returns {string[]} Array of unique patient names
   */
  static uniqueBatch(count) {
    const names = new Set();
    const maxAttempts = count * 10;
    let attempts = 0;

    while (names.size < count && attempts < maxAttempts) {
      names.add(this.generate());
      attempts++;
    }

    if (names.size < count) {
      console.warn(`Could only generate ${names.size} unique names (requested ${count})`);
    }

    return Array.from(names).slice(0, count);
  }
}

/**
 * Medical Data Generator
 * Provides realistic medical scenarios for test cases
 */
export const MEDICAL_DATA = {
  departments: [
    'Internal Medicine',
    'Cardiology',
    'Pediatrics',
    'Orthopedics',
    'Surgery',
    'Neurology',
    'Oncology',
    'Urology',
    'ENT',
    'Ophthalmology',
    'Psychiatry',
    'Dermatology',
    'Rheumatology',
  ],

  diagnoses: [
    'Hypertension',
    'Type 2 Diabetes',
    'Acute Coronary Syndrome',
    'Community-Acquired Pneumonia',
    'Acute Heart Failure',
    'Acute Kidney Injury',
    'Sepsis',
    'Deep Vein Thrombosis',
    'Pulmonary Embolism',
    'Acute Stroke',
    'Fractured Femur',
    'Appendicitis',
    'Biliary Colic',
    'Acute Pancreatitis',
    'Acute Gastroenteritis',
  ],

  procedures: [
    'CT Scan',
    'MRI',
    'Echocardiogram',
    'Endoscopy',
    'Laparoscopy',
    'X-ray',
    'Ultrasound',
    'Angiography',
    'Biopsy',
    'Catheterization',
  ],

  treatments: [
    'Antibiotics',
    'Antihypertensives',
    'Anticoagulants',
    'Pain Management',
    'Physical Therapy',
    'Insulin',
    'Chemotherapy',
    'Radiation',
  ],
};

/**
 * Medical Scenario Generator
 */
export class MedicalScenarioGenerator {
  static getDepartment() {
    return MEDICAL_DATA.departments[
      randomInt(0, MEDICAL_DATA.departments.length)
    ];
  }

  static getDiagnosis() {
    return MEDICAL_DATA.diagnoses[randomInt(0, MEDICAL_DATA.diagnoses.length)];
  }

  static getProcedure() {
    return MEDICAL_DATA.procedures[randomInt(0, MEDICAL_DATA.procedures.length)];
  }

  static getTreatment() {
    return MEDICAL_DATA.treatments[randomInt(0, MEDICAL_DATA.treatments.length)];
  }

  static generateScenario() {
    return {
      department: this.getDepartment(),
      diagnosis: this.getDiagnosis(),
      procedure: this.getProcedure(),
      treatment: this.getTreatment(),
      admissionDate: new Date(
        Date.now() - randomInt(1, 30) * 24 * 60 * 60 * 1000
      ),
    };
  }
}

/**
 * Room Number Generator
 * Generates realistic hospital room numbers
 */
export class RoomNumberGenerator {
  /**
   * Generate room number (format: FLOOR-ROOM)
   * @returns {string} Room number (e.g., "3-15")
   */
  static generate() {
    const floor = randomInt(1, 6);
    const room = String(randomInt(1, 30)).padStart(2, '0');
    return `${floor}-${room}`;
  }

  /**
   * Generate batch of room numbers
   * @param {number} count
   * @returns {string[]}
   */
  static batch(count) {
    const rooms = [];
    for (let i = 0; i < count; i++) {
      rooms.push(this.generate());
    }
    return rooms;
  }
}

/**
 * Case Number Generator
 * Generates case numbers in format: CASE-YYYY-XXXXX
 */
export class CaseNumberGenerator {
  constructor(startYear = new Date().getFullYear()) {
    this.year = startYear;
    this.sequence = 1;
  }

  next() {
    const seq = String(this.sequence).padStart(4, '0');
    this.sequence++;
    return `CASE-${this.year}-${seq}`;
  }

  atIndex(index) {
    const seq = String(index + 1).padStart(4, '0');
    return `CASE-${this.year}-${seq}`;
  }

  batch(count) {
    const cases = [];
    for (let i = 0; i < count; i++) {
      cases.push(this.next());
    }
    return cases;
  }
}

/**
 * Complete Patient Record Generator
 * Generates a complete synthetic patient record
 */
export class PatientRecordGenerator {
  static generate(index, tenantId) {
    const mrnGen = new MrnGenerator();
    const nameGen = new PatientNameGenerator();
    const idGen = new SaudiNationalIdGenerator();
    const roomGen = new RoomNumberGenerator();
    const caseGen = new CaseNumberGenerator();
    const medicalGen = new MedicalScenarioGenerator();

    const patientName = nameGen.generate();
    const scenario = medicalGen.generateScenario();

    return {
      tenantId,
      caseNumber: caseGen.atIndex(index),
      patientName,
      patientIdNumber: idGen.generate(),
      medicalRecordNo: mrnGen.atIndex(index),
      roomNumber: roomGen.generate(),
      department: scenario.department,
      diagnosis: scenario.diagnosis,
      admissionDate: scenario.admissionDate.toISOString(),
      metadata: {
        uatTestData: true,
        dataClassification: 'TESTING_ONLY',
        department: scenario.department,
        diagnosis: scenario.diagnosis,
        admissionDate: scenario.admissionDate.toISOString(),
        dataGeneratedFor: 'UAT Testing - WathiqCare Pilot',
        dataGeneratedAt: new Date().toISOString(),
        note: 'This is synthetic test data. Not a real patient record.',
      },
    };
  }

  static batch(count, tenantId) {
    const records = [];
    for (let i = 0; i < count; i++) {
      records.push(this.generate(i, tenantId));
    }
    return records;
  }
}

export default {
  MrnGenerator,
  SaudiNationalIdGenerator,
  PatientNameGenerator,
  MedicalScenarioGenerator,
  RoomNumberGenerator,
  CaseNumberGenerator,
  PatientRecordGenerator,
  SAUDI_NAMES,
  MEDICAL_DATA,
};
