export type AuthUserProfile = {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
    tenantId: string;
    isSuperAdmin?: boolean;
    roles: string[];
    permissions: string[];
};

export type LoginPayload = {
    email: string;
    password: string;
    tenantCode?: string;
};

export type LoginResult = {
    user: AuthUserProfile;
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
};

export type PagedResult<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
};

export type RefusalCase = {
    id: string;
    caseNumber: string;
    caseType: string;
    status: string;
    priority?: string | null;
    facilityId: string;
    departmentId: string;
    patientId: string;
    encounterId: string;
    currentStageCode?: string | null;
    escalatedToLegal?: boolean;
    summary?: string | null;
    createdAt: string;
    updatedAt: string;
    closedAt?: string | null;
};

export type RefusalCaseTimeline = {
    stageHistory: Array<Record<string, unknown>>;
    refusalEvents: Array<Record<string, unknown>>;
    acknowledgmentRequests: Array<Record<string, unknown>>;
    tasks: Array<Record<string, unknown>>;
    escalationEvents: Array<Record<string, unknown>>;
    audit: Array<Record<string, unknown>>;
};

export type Facility = {
    id: string;
    code: string;
    nameAr?: string | null;
    nameEn?: string | null;
};

export type Department = {
    id: string;
    code: string;
    facilityId: string;
    nameAr?: string | null;
    nameEn?: string | null;
};

export type Patient = {
    id: string;
    mrn: string;
    fullName: string;
    firstName?: string | null;
    lastName?: string | null;
    nationalId?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    primaryPhone?: string | null;
    email?: string | null;
};

export type Encounter = {
    id: string;
    patientId: string;
    encounterNumber: string;
    facilityId: string;
    departmentId?: string | null;
    attendingPhysicianName?: string | null;
    room?: string | null;
    bed?: string | null;
    status: string;
    admissionDate?: string | null;
};

export type DischargeDecision = {
    id: string;
    refusalCaseId: string;
    decisionStatus: string;
    dischargeMedicallyAppropriate: boolean;
    decisionDate: string;
    decisionTime: string;
    clinicalRemarks?: string | null;
    createdAt: string;
};

export type DischargePlan = {
    id: string;
    refusalCaseId: string;
    destination: string;
    instructionsProvided: boolean;
    notes?: string | null;
    createdAt: string;
};

export type DischargePlanItem = {
    id: string;
    dischargePlanId: string;
    itemType: string;
    status: string;
    required: boolean;
    notes?: string | null;
    dueAt?: string | null;
    completedAt?: string | null;
};

export type DischargePlanBundle = {
    plan: DischargePlan | null;
    items: DischargePlanItem[];
};

export type RefusalReasonCategory = {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
};

export type RefusalEvent = {
    id: string;
    refusalCaseId: string;
    reasonCategoryId: string;
    refusingPersonName: string;
    refusingPersonRelationship: string;
    detailedReason?: string | null;
    consequencesExplained: boolean;
    immediateEscalationRequired: boolean;
    refusalDate: string;
    refusalTime: string;
    createdAt: string;
};

export type AcknowledgmentRequest = {
    id: string;
    refusalCaseId: string;
    recipientType: string;
    recipientName: string;
    deliveryMethod: string;
    status: string;
    sentAt?: string | null;
    expiresAt?: string | null;
};

export type WorkflowTransition = {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    requiresComment?: boolean;
    requiresReason?: boolean;
    requiresDocument?: boolean;
};

export type WorkflowTransitionResult = {
    case: RefusalCase;
    taskId?: string | null;
};

export type Task = {
    id: string;
    refusalCaseId: string;
    taskType: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    assignedToUserId?: string | null;
    assignedToRoleId?: string | null;
    assignedToDepartmentId?: string | null;
    dueAt?: string | null;
    completedAt?: string | null;
    createdAt: string;
};

export type TaskComment = {
    id: string;
    taskId: string;
    comment: string;
    createdAt: string;
};

export type CaseDocumentsResult = {
    generatedDocuments: Array<Record<string, unknown>>;
    attachments: Array<Record<string, unknown>>;
};

export type LegalNote = {
    id: string;
    refusalCaseId: string;
    title?: string | null;
    content: string;
    visibilityScope: "LEGAL_ONLY" | "COMPLIANCE_ONLY" | "LEGAL_AND_COMPLIANCE";
    createdAt: string;
};

export type AuditLog = {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    actorEmail?: string | null;
    actorRoleSnapshot?: string | null;
    occurredAt: string;
    metadataJson?: Record<string, unknown> | null;
};

export type ReportsDashboard = {
    openCases: number;
    inProgressCases: number;
    escalatedCases: number;
    closedCases: number;
    overdueTasks: number;
};
