from typing import List

from app.config import rules

ICD11_CODES = {
    "Z00.0": "General adult medical examination",
    "Z01.0": "Examination of eyes and vision",
    "Z03.0": "Observation for suspected tuberculosis",
    "J06.9": "Acute upper respiratory infection, unspecified",
    "I10": "Essential (primary) hypertension",
    "E11.9": "Type 2 diabetes mellitus without complications",
    "N18.9": "Chronic kidney disease, unspecified",
    "C34.9": "Malignant neoplasm of bronchus and lung, unspecified",
    "I21.9": "Acute myocardial infarction, unspecified",
    "K21.0": "Gastro-oesophageal reflux disease with oesophagitis",
    "M54.5": "Low back pain",
    "J45.9": "Asthma, unspecified",
    "F32.9": "Depressive episode, unspecified",
    "G40.9": "Epilepsy, unspecified",
    "I63.9": "Cerebral infarction, unspecified",
    "I50.9": "Heart failure, unspecified",
    "J18.9": "Pneumonia, unspecified organism",
    "A09": "Other and unspecified gastroenteritis and colitis",
    "K92.1": "Melaena",
    "L29.9": "Pruritus, unspecified",
    "H26.9": "Cataract, unspecified",
    "E78.5": "Hyperlipidaemia, unspecified",
    "D50.9": "Iron deficiency anaemia, unspecified",
    "K80.2": "Calculus of gallbladder without cholecystitis",
    "N20.0": "Calculus of kidney",
    "R51": "Headache",
    "R05": "Cough",
    "R50.9": "Fever, unspecified",
    "K29.7": "Gastritis, unspecified",
    "I84.9": "Haemorrhoids, unspecified",
    "E03.9": "Hypothyroidism, unspecified",
    "B24": "Unspecified human immunodeficiency virus disease",
    "A41.9": "Sepsis, unspecified organism",
    "XY9Z": "High-risk placeholder diagnosis",
    "S72.0": "Fracture of femoral neck",
    "T14.9": "Injury, unspecified",
    "Z51.1": "Encounter for antineoplastic chemotherapy",
    "Z99.2": "Dependence on renal dialysis",
    "K57.3": "Diverticular disease of large intestine",
    "C18.9": "Malignant neoplasm of colon, unspecified",
    "J96.0": "Acute respiratory failure",
    "N39.0": "Urinary tract infection",
    "E10.9": "Type 1 diabetes mellitus without complications",
    "I48.9": "Atrial fibrillation and flutter, unspecified",
    "M05.9": "Rheumatoid arthritis, unspecified",
    "G35": "Multiple sclerosis",
    "E11.65": "Type 2 diabetes mellitus with hyperglycemia",
    "K70.3": "Alcoholic cirrhosis of liver",
    "B20": "Human immunodeficiency virus disease resulting in infectious and parasitic diseases",
}

HIGH_RISK_CODES = set(rules.get("legal", {}).get("high_risk_icd11_codes", []))


class ValidationResult:
    def __init__(self, valid: bool, invalid_codes: List[str], descriptions: dict):
        self.valid = valid
        self.invalid_codes = invalid_codes
        self.descriptions = descriptions


def validate_codes(codes: List[str]) -> ValidationResult:
    invalid = [c for c in codes if c not in ICD11_CODES]
    descriptions = {c: ICD11_CODES[c] for c in codes if c in ICD11_CODES}
    return ValidationResult(valid=len(invalid) == 0, invalid_codes=invalid, descriptions=descriptions)


def get_code_description(code: str) -> str:
    return ICD11_CODES.get(code, "Unknown code")


def is_refusal_high_risk(codes: List[str]) -> bool:
    return bool(set(codes) & HIGH_RISK_CODES)
