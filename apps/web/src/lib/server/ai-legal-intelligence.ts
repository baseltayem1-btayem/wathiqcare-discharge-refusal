import type { CaseStatus, LegalWorkflowResult } from "@/lib/server/legal-workflow-engine";

export type AiRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";

export type AiLegalIntelligenceInput = {
  caseId: string;
  workflow: LegalWorkflowResult;
  context: {
    hasDocuments: boolean;
    hasLegalPackage: boolean;
    isClosed: boolean;
    documentCount: number;
  };
};

export type AiAssessment = {
  riskLevel: AiRiskLevel;
  clinicalDocumentationGaps: string[];
  legalDocumentationGaps: string[];
  recommendedNextSteps: string[];
  requiresClinicianReview: boolean;
  requiresLegalReview: boolean;
  patientCommunicationDraft: string | null;
  disclaimer: string;
};

export type AiLegalIntelligenceResult = {
  caseId: string;
  workflowStatus: CaseStatus;
  aiAssessment: AiAssessment;
  source: "ai-assisted";
  auditSourceLabel: "AI-assisted; human review required.";
  generatedAt: string;
};

const AI_DISCLAIMER = "AI-generated support only; not a substitute for clinician or legal judgment.";

function fallbackAssessment(): AiAssessment {
  return {
    riskLevel: "UNKNOWN",
    clinicalDocumentationGaps: [],
    legalDocumentationGaps: [],
    recommendedNextSteps: ["Escalate to clinician and legal reviewer for manual assessment."],
    requiresClinicianReview: true,
    requiresLegalReview: true,
    patientCommunicationDraft: null,
    disclaimer: AI_DISCLAIMER,
  };
}

function parseAiAssessment(value: unknown): AiAssessment | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<AiAssessment>;
  const risk = String(candidate.riskLevel || "").toUpperCase();
  const riskLevel: AiRiskLevel =
    risk === "LOW" || risk === "MEDIUM" || risk === "HIGH" || risk === "CRITICAL"
      ? (risk as AiRiskLevel)
      : "UNKNOWN";

  const toStringArray = (input: unknown): string[] =>
    Array.isArray(input) ? input.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];

  const assessment: AiAssessment = {
    riskLevel,
    clinicalDocumentationGaps: toStringArray(candidate.clinicalDocumentationGaps),
    legalDocumentationGaps: toStringArray(candidate.legalDocumentationGaps),
    recommendedNextSteps: toStringArray(candidate.recommendedNextSteps),
    requiresClinicianReview: true,
    requiresLegalReview: true,
    patientCommunicationDraft: null,
    disclaimer: AI_DISCLAIMER,
  };

  return assessment;
}

async function fetchChatGptAssessment(input: AiLegalIntelligenceInput): Promise<AiAssessment | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const promptPayload = {
    workflowStatus: input.workflow.status,
    nextActionKey: input.workflow.nextAction.key,
    signals: {
      hasDocuments: input.context.hasDocuments,
      hasLegalPackage: input.context.hasLegalPackage,
      isClosed: input.context.isClosed,
      documentCount: input.context.documentCount,
    },
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a healthcare legal workflow assistant. Provide risk and documentation insights only. Never provide final medical, discharge, legal, or regulatory decisions. Always require clinician and legal review.",
        },
        {
          role: "user",
          content:
            `Analyze this de-identified workflow summary and return JSON only with fields: riskLevel, clinicalDocumentationGaps, legalDocumentationGaps, recommendedNextSteps. Input: ${JSON.stringify(promptPayload)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  const parsed = JSON.parse(content) as unknown;
  return parseAiAssessment(parsed);
}

export async function generateAiLegalIntelligence(
  input: AiLegalIntelligenceInput,
): Promise<AiLegalIntelligenceResult> {
  let assessment = fallbackAssessment();

  try {
    const aiAssessment = await fetchChatGptAssessment(input);
    if (aiAssessment) {
      assessment = {
        ...aiAssessment,
        requiresClinicianReview: true,
        requiresLegalReview: true,
        patientCommunicationDraft: null,
        disclaimer: AI_DISCLAIMER,
      };
    } else {
      assessment = fallbackAssessment();
    }
  } catch {
    assessment = fallbackAssessment();
  }

  if (assessment.recommendedNextSteps.length === 0) {
    assessment.recommendedNextSteps = [input.workflow.nextAction.label];
  }

  return {
    caseId: input.caseId,
    workflowStatus: input.workflow.status,
    aiAssessment: assessment,
    source: "ai-assisted",
    auditSourceLabel: "AI-assisted; human review required.",
    generatedAt: new Date().toISOString(),
  };
}
