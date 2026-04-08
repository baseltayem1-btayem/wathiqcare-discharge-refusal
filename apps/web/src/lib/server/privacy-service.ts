import { DataClassification } from "@prisma/client";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { dataClassificationPolicy, type DataClassificationKey } from "@/config/data-classification-policy";
import {
  dataResidencyPolicy,
  getDefaultResidencyRegion,
  isKsaRegion,
} from "@/config/data-residency-policy";

const prisma = getPrisma();

export function getDeploymentResidencyProfile() {
  const patientDataRegion = process.env.PATIENT_DATA_REGION || getDefaultResidencyRegion();
  const backupRegion = process.env.BACKUP_DATA_REGION || patientDataRegion;
  const analyticsRegion = process.env.ANALYTICS_REGION || patientDataRegion;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "http://localhost:3000";

  return {
    patientDataRegion,
    backupRegion,
    analyticsRegion,
    baseUrl,
  };
}

export function validateSaudiResidencyDeployment() {
  const profile = getDeploymentResidencyProfile();
  const blockers: string[] = [];

  if (!isKsaRegion(profile.patientDataRegion)) {
    blockers.push(`Patient data region must be KSA-hosted. Current: ${profile.patientDataRegion}`);
  }

  if (!isKsaRegion(profile.backupRegion)) {
    blockers.push(`Backup region must remain in KSA. Current: ${profile.backupRegion}`);
  }

  return {
    ...profile,
    compliant: blockers.length === 0,
    blockers,
  };
}

export async function ensureDefaultResidencyRules(tenantId: string) {
  const defaults = Object.entries(dataResidencyPolicy) as Array<
    [DataClassificationKey, (typeof dataResidencyPolicy)[DataClassificationKey]]
  >;

  await Promise.all(
    defaults.map(([dataType, rule]) =>
      prisma.dataResidencyRule.upsert({
        where: {
          tenantId_dataType: {
            tenantId,
            dataType: dataType as DataClassification,
          },
        },
        update: {
          residencyScope: rule.residency,
          hostingRegion: getDefaultResidencyRegion(),
          exportAllowed: rule.residency !== "KSA_ONLY",
          anonymizationRequired: rule.exportRequiresAnonymization,
          notes: rule.notes,
        },
        create: {
          tenantId,
          dataType: dataType as DataClassification,
          residencyScope: rule.residency,
          hostingRegion: getDefaultResidencyRegion(),
          exportAllowed: rule.residency !== "KSA_ONLY",
          anonymizationRequired: rule.exportRequiresAnonymization,
          notes: rule.notes,
        },
      }).catch(() => undefined),
    ),
  );
}

export async function assertDataResidencyCompliance(args: {
  tenantId: string;
  dataType: DataClassificationKey;
  operation: string;
  destinationRegion?: string | null;
  anonymized?: boolean;
}) {
  const deployment = validateSaudiResidencyDeployment();
  if (!deployment.compliant && args.dataType !== "ANALYTICS") {
    throw new ApiError(503, `Saudi data residency deployment check failed: ${deployment.blockers.join(" | ")}`);
  }

  const region = args.destinationRegion || getDefaultResidencyRegion();
  const rule = dataResidencyPolicy[args.dataType];
  const mustStayInKsa = rule.residency === "KSA_ONLY";

  if (mustStayInKsa && !isKsaRegion(region)) {
    throw new ApiError(409, `Operation ${args.operation} is blocked because ${args.dataType} must remain in KSA. Target region: ${region}`);
  }

  if (args.dataType === "ANALYTICS" && !isKsaRegion(region) && !args.anonymized) {
    throw new ApiError(409, `Operation ${args.operation} is blocked until analytics data is anonymized before non-KSA export.`);
  }
}

export async function getDataResidencyDashboard(tenantId: string) {
  await ensureDefaultResidencyRules(tenantId);

  const deployment = validateSaudiResidencyDeployment();
  const rules = await prisma.dataResidencyRule.findMany({
    where: { tenantId },
    orderBy: { dataType: "asc" },
  }).catch(() => []);
  const securitySettings = await prisma.tenantSecuritySetting.findUnique({ where: { tenantId } }).catch(() => null);

  const items = (Object.entries(dataClassificationPolicy) as Array<
    [DataClassificationKey, (typeof dataClassificationPolicy)[DataClassificationKey]]
  >).map(([key, classification]) => {
    const persistedRule = rules.find((rule) => rule.dataType === key);
    const residencyRule = dataResidencyPolicy[key];
    const hostingRegion = persistedRule?.hostingRegion || deployment.patientDataRegion;
    const compliant = residencyRule.residency !== "KSA_ONLY" || isKsaRegion(hostingRegion);

    return {
      dataType: key,
      label: classification.label,
      pdplCritical: classification.pdplCritical,
      residency: persistedRule?.residencyScope || residencyRule.residency,
      hostingRegion,
      exportAllowed: persistedRule?.exportAllowed ?? residencyRule.residency !== "KSA_ONLY",
      anonymizationRequired: persistedRule?.anonymizationRequired ?? residencyRule.exportRequiresAnonymization,
      compliant,
      notes: persistedRule?.notes || residencyRule.notes,
    };
  });

  return {
    deployment,
    securitySettings,
    items,
  };
}

export async function getPrivacyDashboard(tenantId: string) {
  const [residency, consentCount, dsrCount, pendingRetentionActions] = await Promise.all([
    getDataResidencyDashboard(tenantId),
    prisma.consentRecord.count({ where: { tenantId } }).catch(() => 0),
    prisma.dataSubjectRequest.count({ where: { tenantId } }).catch(() => 0),
    prisma.retentionAction.count({ where: { tenantId, status: "PENDING" } }).catch(() => 0),
  ]);

  return {
    residency,
    metrics: {
      consentCount,
      dsrCount,
      pendingRetentionActions,
    },
  };
}