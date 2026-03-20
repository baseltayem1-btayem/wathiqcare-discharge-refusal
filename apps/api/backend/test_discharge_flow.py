from backend.core.discharge_service import create_discharge_refusal

def main():
    result = create_discharge_refusal(
        tenant_code="imc",
        user_email="admin@imc.local",
        patient_mrn="MRN-1001",
        patient_name="Test Patient One",
        refusal_reason="Patient refused discharge and requested to stay longer.",
        signer_name="Test Patient One",
        signer_role="patient",
        signature_text="Test Patient One",
    )

    print(result)


if __name__ == "__main__":
    main()
