#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/docs/test_documents"
mkdir -p "$OUT_DIR"

TOKEN=$(curl -sS -H 'content-type: application/json' \
  -d '{"email":"admin@wathiqcare.online","password":"WCare@2026"}' \
  http://127.0.0.1:8001/auth/login \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j.access_token||"")}catch{process.stdout.write("")}})')

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: perf login failed"
  exit 1
fi

UVICORN_PID=$(pgrep -f "uvicorn backend.main:app" | head -n 1 || true)
RSS_BEFORE=0
if [[ -n "$UVICORN_PID" ]]; then
  RSS_BEFORE=$(ps -o rss= -p "$UVICORN_PID" | awk '{print $1}')
fi

CASE_IDS_FILE="$OUT_DIR/perf_case_ids.txt"
: > "$CASE_IDS_FILE"

for i in $(seq 1 100); do
  MRN="PERF-MRN-$(date +%s)-$i"
  RES=$(curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
    -d "{\"patient_mrn\":\"$MRN\",\"patient_name\":\"Perf Patient $i\",\"refusal_reason\":\"Performance validation\",\"signer_name\":\"Perf Signer\",\"signer_role\":\"Patient\",\"signature_text\":\"perf\"}" \
    http://127.0.0.1:8001/api/discharge/refusal)
  echo "$RES" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d); if(j.discharge_case_id) process.stdout.write(j.discharge_case_id+"\n")}catch{}})' >> "$CASE_IDS_FILE"
done

DOC_SUCCESS=0
while IFS= read -r CASE_ID; do
  [[ -z "$CASE_ID" ]] && continue
  PAYLOAD='{"payload":{"patient_name":"Perf Patient","patient_id_number":"1234567890","medical_record_number":"PERF","room_number":"P-1","attending_physician":"Dr Perf","refusal_reason":"Performance validation","discussion_summary":"Perf path","social_administrative_interventions":"Perf ops"}}'
  curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "$PAYLOAD" "http://127.0.0.1:8001/api/cases/$CASE_ID/discharge-refusal-workflow/start" > /dev/null || true
  curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "$PAYLOAD" "http://127.0.0.1:8001/api/cases/$CASE_ID/discharge-refusal-workflow/record-initial-communication" > /dev/null || true
  curl -sS -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "$PAYLOAD" "http://127.0.0.1:8001/api/cases/$CASE_ID/discharge-refusal-workflow/refer-social-services" > /dev/null || true
  R1=$(curl -sS -o /tmp/perf_doc1.json -w "%{http_code}" -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "$PAYLOAD" "http://127.0.0.1:8001/api/cases/$CASE_ID/discharge-refusal-workflow/generate-refusal-form" || true)
  R2=$(curl -sS -o /tmp/perf_doc2.json -w "%{http_code}" -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "$PAYLOAD" "http://127.0.0.1:8001/api/cases/$CASE_ID/discharge-refusal-workflow/generate-financial-notice" || true)
  [[ "$R1" == "200" ]] && DOC_SUCCESS=$((DOC_SUCCESS+1))
  [[ "$R2" == "200" ]] && DOC_SUCCESS=$((DOC_SUCCESS+1))
done < "$CASE_IDS_FILE"

LAT_FILE="$OUT_DIR/perf_latency_samples.txt"
seq 1 20 | xargs -I{} -P20 sh -c 'curl -sS -o /dev/null -w "%{time_total}\n" -H "authorization: Bearer '$TOKEN'" http://127.0.0.1:8001/api/discharge/cases' > "$LAT_FILE"

AVG_LAT=$(awk '{sum+=$1; n++} END {if(n>0) printf "%.4f", sum/n; else print "0"}' "$LAT_FILE")
MAX_LAT=$(awk 'BEGIN{m=0}{if($1>m)m=$1}END{printf "%.4f",m}' "$LAT_FILE")

RSS_AFTER=0
if [[ -n "$UVICORN_PID" ]]; then
  RSS_AFTER=$(ps -o rss= -p "$UVICORN_PID" | awk '{print $1}')
fi

cat > "$OUT_DIR/performance_probe_result.json" <<JSON
{
  "cases_created": $(wc -l < "$CASE_IDS_FILE" | tr -d ' '),
  "documents_generated_success": $DOC_SUCCESS,
  "target_documents": 300,
  "concurrent_users_tested": 20,
  "api_avg_latency_seconds": $AVG_LAT,
  "api_max_latency_seconds": $MAX_LAT,
  "uvicorn_rss_kb_before": $RSS_BEFORE,
  "uvicorn_rss_kb_after": $RSS_AFTER
}
JSON

echo "performance_probe_complete"
