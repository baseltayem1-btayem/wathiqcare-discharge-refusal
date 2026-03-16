from backend.core.database import engine, Base
import backend.models  # noqa: F401
from backend.models.tenant import Tenant
from backend.models.user import User
from backend.models.patient import Patient
from backend.models.discharge_case import DischargeCase
from backend.models.audit_log import AuditLog
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.models.workflow_document import DischargeWorkflowDocument
from backend.models.workflow_case_documentation import DischargeWorkflowCaseDocumentation
from backend.models.department import Department
from backend.models.admission import Admission
from backend.models.document_template import DocumentTemplate
from backend.models.integration_config import IntegrationConfig
from backend.models.system_setting import SystemSetting
from backend.models.financial_liability_record import FinancialLiabilityRecord
from backend.models.financial_guarantee import FinancialGuarantee

Base.metadata.create_all(bind=engine)

print("Database tables created successfully")
