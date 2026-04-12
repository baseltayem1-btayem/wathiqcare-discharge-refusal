from backend.core.database import engine, Base
from backend.models.tenant import Tenant
from backend.models.user import User
from backend.models.patient import Patient
from backend.models.discharge_case import DischargeCase
from backend.models.audit_log import AuditLog
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.models.workflow_document import DischargeWorkflowDocument
from backend.models.workflow_case_documentation import DischargeWorkflowCaseDocumentation
from backend.models.integration_connector import IntegrationConnector
from backend.models.integration_alert_log import IntegrationAlertLog
from backend.models.integration_run import IntegrationRun, IntegrationRunItem, IntegrationError
from backend.models.integration_sla_breach import IntegrationSLABreach
from backend.models.dashboard_alert import DashboardAlert
from backend.models.notification_delivery_attempt import NotificationDeliveryAttempt
from backend.models.sms_dispatch_record import SmsDispatchRecord
from backend.models.alert_acknowledgment import AlertAcknowledgment
from backend.models.tenant_notification_setting import TenantNotificationSetting
from backend.models.discharge_legal_workflow import (
	DischargeDecisionDocument,
	DischargeDecisionEvent,
	EscalationEvent,
	EvidencePackage,
	FinancialLiabilityAcknowledgmentInstance,
	FinancialLiabilityAcknowledgmentTemplate,
	HomeHealthcareAgreementInstance,
	HomeHealthcareAgreementTemplate,
	LegalUndertakingInstance,
	LegalUndertakingTemplate,
	MedicalEquipmentLeaseInstance,
	MedicalEquipmentLeaseTemplate,
	PatientNoticePresentation,
	PatientResponse,
	PromissoryNoteInstance,
	PromissoryNoteTemplate,
	SignatureArtifact,
	SignerIdentity,
)


def init_database() -> None:
	Base.metadata.create_all(bind=engine)
