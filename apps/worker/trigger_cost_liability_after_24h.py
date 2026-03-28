import os
import time
from datetime import datetime, timedelta, timezone
import requests

API_URL = os.environ.get("API_URL") or os.environ.get("NEXT_PUBLIC_API_URL")
if not API_URL:
    raise RuntimeError("API_URL or NEXT_PUBLIC_API_URL must be set in environment")

CHECK_INTERVAL_SECONDS = 60 * 10  # 10 دقائق

# نقطة النهاية التي تعيد الحالات التي تحتاج التحقق
CASES_ENDPOINT = f"{API_URL}/api/discharge/cases/pending-cost-liability"
TRIGGER_ENDPOINT = f"{API_URL}/api/discharge/cases/{{case_id}}/trigger-cost-liability"


def fetch_pending_cases():
    resp = requests.get(CASES_ENDPOINT)
    resp.raise_for_status()
    return resp.json()


def trigger_cost_liability(case_id):
    resp = requests.post(TRIGGER_ENDPOINT.format(case_id=case_id))
    resp.raise_for_status()
    return resp.json()


def main_loop():
    print("[Worker] بدء مراقبة الحالات لتفعيل المسؤولية المالية بعد 24 ساعة...")
    while True:
        try:
            cases = fetch_pending_cases()
            now = datetime.now(timezone.utc)
            for case in cases:
                decision_ts = case.get("discharge_decision_timestamp")
                if not decision_ts:
                    continue
                # توقيت UTC
                decision_time = datetime.fromisoformat(decision_ts)
                if now - decision_time >= timedelta(hours=24):
                    print(f"[Worker] تفعيل المسؤولية المالية للحالة: {case['id']}")
                    trigger_cost_liability(case['id'])
        except Exception as e:
            print(f"[Worker] خطأ: {e}")
        time.sleep(CHECK_INTERVAL_SECONDS)


if __name__ == "__main__":
    main_loop()
