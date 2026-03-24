from backend.core.database import engine, Base
from backend.models.tenant import Tenant
from backend.models.user import User
from backend.models.patient import Patient
from backend.models.discharge_case import DischargeCase
from backend.models.audit_log import AuditLog
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.models.workflow_document import DischargeWorkflowDocument
from backend.models.workflow_case_documentation import DischargeWorkflowCaseDocumentation

def init_database():
	"""Create all database tables (idempotent)."""
	try:
		Base.metadata.create_all(bind=engine)
		print("✓ Database tables initialized successfully")
		return True
	except Exception as e:
		print(f"✗ Database initialization error: {e}")
		raise


if __name__ == "__main__":
	init_database()
