#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/docs/test_documents"
mkdir -p "$OUT_DIR"

TS="$(date +%Y%m%d%H%M%S)"

TOKEN=$(curl -sS -H 'content-type: application/json' \
  -d '{"email":"admin@wathiqcare.online","password":"WCare@2026"}' \
  http://127.0.0.1:8001/auth/login \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j.access_token||"")}catch{process.stdout.write("")}})')

if [[ -z "$TOKEN" ]]; then
  TOKEN=$(curl -sS -H 'content-type: application/json' \
    -d '{"email":"admin@wathiqcare.online","password":"WCare@2026"}' \
    http://127.0.0.1:3000/api/auth/login \
    | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j.access_token||"")}catch{process.stdout.write("")}})')
fi

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: backend login failed"
  exit 1
fi

MRN="SL-MRN-$TS"

curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d "{\"patient_mrn\":\"$MRN\",\"patient_name\":\"Soft Launch Patient\",\"refusal_reason\":\"Operational soft launch workflow validation\",\"signer_name\":\"Soft Launch Signer\",\"signer_role\":\"Patient\",\"signature_text\":\"Signed during internal soft launch\"}" \
  http://127.0.0.1:8001/api/discharge/refusal > "$OUT_DIR/phase2_create_case.json"

CASE_ID=$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(j.discharge_case_id||"")' "$OUT_DIR/phase2_create_case.json")

if [[ -z "$CASE_ID" ]]; then
  echo "ERROR: case creation failed"
  cat "$OUT_DIR/phase2_create_case.json"
  exit 1
fi

PAYLOAD=$(cat <<JSON
{"payload":{"patient_name":"Soft Launch Patient","patient_id_number":"1029384756","medical_record_number":"$MRN","room_number":"A-101","attending_physician":"Dr Soft Launch","refusal_reason":"Operational soft launch workflow validation","discussion_summary":"Patient counseling completed","social_administrative_interventions":"Patient affairs and legal notified"}}
JSON
)

curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "$PAYLOAD" \
  http://127.0.0.1:8001/api/cases/$CASE_ID/discharge-refusal-workflow/start > "$OUT_DIR/phase2_workflow_start.json"

curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "$PAYLOAD" \
  http://127.0.0.1:8001/api/cases/$CASE_ID/discharge-refusal-workflow/record-initial-communication > "$OUT_DIR/phase2_initial_communication.json"

curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "$PAYLOAD" \
  http://127.0.0.1:8001/api/cases/$CASE_ID/discharge-refusal-workflow/refer-social-services > "$OUT_DIR/phase2_social_services.json"

curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "$PAYLOAD" \
  http://127.0.0.1:8001/api/cases/$CASE_ID/discharge-refusal-workflow/generate-refusal-form > "$OUT_DIR/phase4_refusal_form_generation.json"

curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "$PAYLOAD" \
  http://127.0.0.1:8001/api/cases/$CASE_ID/discharge-refusal-workflow/generate-financial-notice > "$OUT_DIR/phase4_financial_notice_generation.json"

curl -sS -H "authorization: Bearer $TOKEN" \
  http://127.0.0.1:8001/api/discharge/cases/$CASE_ID/acknowledgment/methods > "$OUT_DIR/phase3_methods.json"

curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"document_type":"discharge_refusal_form","method":"sms_otp","payload":{"phone_number":"+966500000001","signer_role":"Patient"}}' \
  http://127.0.0.1:8001/api/discharge/cases/$CASE_ID/acknowledgment/start > "$OUT_DIR/phase3_sms_start.json"

SESSION_SMS=$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(j.session_id||"")' "$OUT_DIR/phase3_sms_start.json")
OTP_SMS=$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write((j.provider_result&&j.provider_result.otp_debug_code)||"")' "$OUT_DIR/phase3_sms_start.json")

curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d "{\"payload\":{\"otp_code\":\"$OTP_SMS\"}}" \
  http://127.0.0.1:8001/api/discharge/cases/$CASE_ID/acknowledgment/$SESSION_SMS/verify > "$OUT_DIR/phase3_sms_verify.json"

curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"document_type":"financial_responsibility_notice","method":"tablet_signature","payload":{"signature_payload":"data:image/png;base64,U09GVF9MUF9TSUdOQVRVUkU=","witness_name":"Nurse Witness","signer_role":"Nurse"}}' \
  http://127.0.0.1:8001/api/discharge/cases/$CASE_ID/acknowledgment/start > "$OUT_DIR/phase3_tablet_start.json"

SESSION_TAB=$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(j.session_id||"")' "$OUT_DIR/phase3_tablet_start.json")

curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"payload":{"signature_payload":"data:image/png;base64,U09GVF9MUF9TSUdOQVRVUkVfVkVSSUZJRUQ=","witness_name":"Nurse Witness"}}' \
  http://127.0.0.1:8001/api/discharge/cases/$CASE_ID/acknowledgment/$SESSION_TAB/verify > "$OUT_DIR/phase3_tablet_verify.json"

curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"document_type":"home_healthcare_agreement","method":"nafath","payload":{"signer_role":"Legal Officer"}}' \
  http://127.0.0.1:8001/api/discharge/cases/$CASE_ID/acknowledgment/start > "$OUT_DIR/phase3_nafath_start.json"

SESSION_NAF=$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(j.session_id||"")' "$OUT_DIR/phase3_nafath_start.json")

curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"payload":{"nafath_status":"approved"}}' \
  http://127.0.0.1:8001/api/discharge/cases/$CASE_ID/acknowledgment/$SESSION_NAF/verify > "$OUT_DIR/phase3_nafath_verify.json"

curl -sS -H "authorization: Bearer $TOKEN" -X POST \
  http://127.0.0.1:8001/api/discharge/evidence-bundle/$CASE_ID > "$OUT_DIR/phase5_archive_bundle.json"

curl -sS -H "authorization: Bearer $TOKEN" \
  http://127.0.0.1:8001/api/discharge/cases/$CASE_ID > "$OUT_DIR/phase2_case_detail.json"

curl -sS -H "authorization: Bearer $TOKEN" \
  http://127.0.0.1:8001/api/cases/$CASE_ID/discharge-refusal-workflow > "$OUT_DIR/phase2_workflow_snapshot.json"

node -e 'const fs=require("fs");const path=require("path");const out=process.argv[1];const caseId=process.argv[2];const b=JSON.parse(fs.readFileSync(path.join(out,"phase5_archive_bundle.json"),"utf8"));const m={case_id:caseId,bundle_file:b.bundle_file||null};fs.writeFileSync(path.join(out,"phase_run_manifest.json"),JSON.stringify(m,null,2));' "$OUT_DIR" "$CASE_ID"

echo "workflow_validation_complete case_id=$CASE_ID"
