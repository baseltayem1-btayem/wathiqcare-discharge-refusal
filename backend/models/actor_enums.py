import enum

class ActorType(enum.Enum):
    PATIENT = "patient"
    GUARDIAN = "guardian"
    WITNESS = "witness"
    DOCTOR = "doctor"

class ActorEventType(enum.Enum):
    SIGNATURE = "signature"
    CONSENT_ACKNOWLEDGEMENT = "consent_acknowledgement"
    REFUSAL_ACKNOWLEDGEMENT = "refusal_acknowledgement"
    WITNESS_CONFIRMATION = "witness_confirmation"
    PHYSICIAN_CONFIRMATION = "physician_confirmation"
