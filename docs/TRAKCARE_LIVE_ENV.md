# TrakCare Live Integration Environment

Set these variables in production before enabling live TrakCare calls.

```
FF_ENABLE_TRAKCARE_LIVE=true
TRAKCARE_LIVE_ENABLED=true
TRAKCARE_API_BASE_URL=Pending Live Credentials
TRAKCARE_AUTH_MODE=oauth2_client_credentials
TRAKCARE_AUTH_URL=Pending Live Credentials
TRAKCARE_CLIENT_ID=Pending Live Credentials
TRAKCARE_CLIENT_SECRET=Pending Live Credentials
TRAKCARE_SCOPE=Pending Live Credentials
TRAKCARE_TIMEOUT_MS=8000
TRAKCARE_RETRY_COUNT=2
TRAKCARE_RATE_LIMIT_PER_MINUTE=60

# Optional path overrides
TRAKCARE_PATIENT_PATH=/patients
TRAKCARE_ENCOUNTER_PATH=/encounters
TRAKCARE_ALLERGY_PATH=/allergies
TRAKCARE_CONDITION_PATH=/conditions
TRAKCARE_MEDICATION_PATH=/medications
TRAKCARE_OBSERVATION_PATH=/observations
TRAKCARE_PRACTITIONER_PATH=/practitioners

# Optional auth modes
# TRAKCARE_AUTH_MODE=basic
# TRAKCARE_USERNAME=Pending Live Credentials
# TRAKCARE_PASSWORD=Pending Live Credentials

# TRAKCARE_AUTH_MODE=static_bearer
# TRAKCARE_STATIC_BEARER_TOKEN=Pending Live Credentials
```

Behavior:
- If live mode is not enabled, APIs return `PENDING_LIVE_CREDENTIALS` status.
- No mock data fallback is used in TrakCare routes.
- Credentials must be supplied through environment variables only.
