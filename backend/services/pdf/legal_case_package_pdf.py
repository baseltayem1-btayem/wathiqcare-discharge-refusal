from fpdf import FPDF

def generate_legal_case_pdf(package):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    # Cover Page
    pdf.cell(0, 10, "Legal Case Package", ln=True, align='C')
    pdf.set_font("Arial", '', 12)
    pdf.cell(0, 10, f"Case ID: {package['case']['id']}", ln=True)
    pdf.cell(0, 10, f"Classification: {package['legal_classification']}", ln=True)
    pdf.cell(0, 10, f"Generated: {package['generated_at']}", ln=True)
    pdf.cell(0, 10, f"Version: {package['version']}", ln=True)
    pdf.add_page()
    # Clinical Summary
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 10, "Clinical Summary", ln=True)
    pdf.set_font("Arial", '', 12)
    pdf.multi_cell(0, 10, f"Diagnosis: {package['case']['diagnosis']}\nPhysician: {package['case']['physician']}")
    pdf.add_page()
    # Refusal Documentation
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 10, "Refusal Documentation", ln=True)
    pdf.set_font("Arial", '', 12)
    pdf.multi_cell(0, 10, f"Discharge Status: {package['case']['discharge_status']}")
    pdf.add_page()
    # Signatures
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 10, "Signatures", ln=True)
    pdf.set_font("Arial", '', 12)
    for sig in package['signatures']:
        pdf.cell(0, 10, f"{sig['role']}: {sig['name']} at {sig['signed_at']}", ln=True)
    pdf.add_page()
    # Timeline
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 10, "Timeline", ln=True)
    pdf.set_font("Arial", '', 12)
    for event in package['timeline']:
        pdf.cell(0, 10, f"{event['timestamp']} - {event['action']} by {event['actor']} ({event['role']})", ln=True)
    pdf.add_page()
    # Financial Summary (placeholder)
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 10, "Financial Summary", ln=True)
    pdf.set_font("Arial", '', 12)
    pdf.cell(0, 10, "No financial data available.", ln=True)
    pdf.add_page()
    # Attachments Index
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 10, "Attachments Index", ln=True)
    pdf.set_font("Arial", '', 12)
    for doc in package['documents']:
        pdf.cell(0, 10, f"{doc['type']}: {doc['url']}", ln=True)
    # Page numbers
    for i in range(1, pdf.page_no() + 1):
        pdf.page = i
        pdf.set_y(-15)
        pdf.set_font("Arial", 'I', 8)
        pdf.cell(0, 10, f"Page {i} / {pdf.page_no()}", 0, 0, 'C')
    # Output to bytes
    return pdf.output(dest='S').encode('latin1')
