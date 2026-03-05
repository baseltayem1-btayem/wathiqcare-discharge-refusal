from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


OUTPUT_DIR = Path(__file__).resolve().parents[1] / "generated"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def generate_discharge_refusal_pdf(
    order_id: str,
    patient_id: str,
    physician_id: str,
    diagnosis: str,
    refusal_reason: str
):
    
    pdf_path = OUTPUT_DIR / f"refusal_{order_id}.pdf"

    c = canvas.Canvas(str(pdf_path), pagesize=A4)
    width, height = A4

    y = height - 60

    c.setFont("Helvetica-Bold", 16)
    c.drawString(60, y, "WathiqCare - Discharge Refusal Form")

    y -= 40

    c.setFont("Helvetica", 12)
    c.drawString(60, y, f"Order ID: {order_id}")
    y -= 20

    c.drawString(60, y, f"Patient ID: {patient_id}")
    y -= 20

    c.drawString(60, y, f"Physician ID: {physician_id}")
    y -= 20

    c.drawString(60, y, f"Diagnosis: {diagnosis}")
    y -= 20

    c.drawString(60, y, f"Refusal Reason: {refusal_reason}")
    y -= 20

    c.drawString(60, y, f"Generated At: {datetime.utcnow().isoformat()}")

    y -= 60

    c.drawString(60, y, "Patient/Guardian Signature: ________________________")

    y -= 40

    c.drawString(60, y, "Witness Signature: ________________________")

    y -= 40

    c.drawString(60, y, "Hospital Representative: ________________________")

    c.showPage()
    c.save()

    return str(pdf_path)
