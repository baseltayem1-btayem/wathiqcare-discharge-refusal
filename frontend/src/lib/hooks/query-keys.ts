export const queryKeys = {
    auth: {
        me: ["auth", "me"] as const,
    },

    users: {
        all: ["users"] as const,
        list: ["users", "list"] as const,
    },

    cases: {
        all: ["cases"] as const,
        list: (filters: Record<string, unknown>) => ["cases", "list", filters] as const,
        detail: (caseId: string) => ["cases", "detail", caseId] as const,
        timeline: (caseId: string) => ["cases", "timeline", caseId] as const,
    },

    discharge: {
        decision: (caseId: string) => ["discharge", "decision", caseId] as const,
        plan: (caseId: string) => ["discharge", "plan", caseId] as const,
        planItems: (caseId: string) => ["discharge", "planItems", caseId] as const,
    },

    refusal: {
        reasonCategories: ["refusal", "reasonCategories"] as const,
        events: (caseId: string) => ["refusal", "events", caseId] as const,
        acknowledgments: (caseId: string) => ["refusal", "acknowledgments", caseId] as const,
    },

    workflow: {
        transitions: (caseId: string) => ["workflow", "transitions", caseId] as const,
    },

    tasks: {
        list: (filters: Record<string, unknown>) => ["tasks", "list", filters] as const,
    },

    documents: {
        byCase: (caseId: string) => ["documents", "case", caseId] as const,
    },

    legal: {
        notes: (caseId: string) => ["legal", "notes", caseId] as const,
        caseAudit: (caseId: string) => ["legal", "caseAudit", caseId] as const,
    },

    audit: {
        logs: (filters: Record<string, unknown>) => ["audit", "logs", filters] as const,
    },

    reports: {
        dashboard: ["reports", "dashboard"] as const,
        casesSummary: ["reports", "casesSummary"] as const,
        tasksOverdue: ["reports", "tasksOverdue"] as const,
        legalEscalations: ["reports", "legalEscalations"] as const,
    },

    reference: {
        facilities: ["reference", "facilities"] as const,
        departments: (facilityId?: string) => ["reference", "departments", facilityId || "all"] as const,
        patients: (search: string) => ["reference", "patients", search] as const,
        patient: (id: string) => ["reference", "patient", id] as const,
        encounters: ["reference", "encounters"] as const,
        encounter: (id: string) => ["reference", "encounter", id] as const,
    },
};
