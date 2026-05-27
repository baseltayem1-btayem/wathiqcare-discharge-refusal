import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { getPrisma } from "../src/lib/server/prisma";
import {
  approveEducationPackage,
  createEducationPackageVersion,
  generateEducationEvidencePackage,
  linkEducationPackageToConsentTemplate,
  recordEducationAuditEvent,
} from "../src/lib/server/education-library-service";

type AssetCategory = "main-education-image" | "procedure-illustration" | "risks-complications-illustration" | "education-video";

type AssetType = "IMAGE" | "VIDEO";

type OfficialAssetDefinition = {
  assetKey: string;
  assetType: AssetType;
  title: string;
  assetCategory: AssetCategory;
  sourceName: string;
  sourceUrl: string;
  sourceUri: string;
  thumbnailUri?: string;
  licenseType: string;
  attributionText: string;
  copyrightStatus: string;
};

type PackageAssetSpec = {
  packageKey: string;
  titleEn: string;
  titleAr: string;
  procedureCode: string;
  assets: OfficialAssetDefinition[];
};

type ValidationPackageResult = {
  packageKey: string;
  packageId: string;
  versionId: string;
  versionLabel: string;
  assetIds: string[];
  assetCount: number;
  imageSources: Array<{ assetKey: string; sourceName: string; sourceUrl: string; licenseType: string }>;
  videoSource: { assetKey: string; sourceName: string; sourceUrl: string; embedUrl: string; licenseType: string } | null;
  assetHashes: Array<{ assetKey: string; contentHash: string | null; metadataAssetHash: string | null }>;
  assetManifest: Array<{
    assetKey: string;
    assetType: string;
    assetCategory: string;
    sourceName: string;
    sourceUrl: string;
    licenseType: string;
    copyrightStatus: string;
  }>;
  auditCounts: Record<string, number>;
  evidencePackageIds: string[];
  evidenceAssetCounts: number[];
  validation: {
    packageFound: boolean;
    versionApproved: boolean;
    assetsLinked: boolean;
    assetsVersioned: boolean;
    evidenceIncludesAssets: boolean;
    metadataComplete: boolean;
    approvedSourcesOnly: boolean;
  };
};

const REPORT_DIR = path.resolve(process.cwd(), "artifacts", "phase6c-controlled-assets");
const VERSION_LABEL = "phase6c-official-sources-v1";
const REVIEWED_AT = "2026-05-25T00:00:00.000Z";
const YOUTUBE_STANDARD_LICENSE = "YOUTUBE_STANDARD_LICENSE";
const APPROVED_IMAGE_HOSTS = new Set(["medlineplus.gov", "www.cdc.gov", "cdc.gov", "www.nih.gov", "nih.gov", "openverse.org", "commons.wikimedia.org"]);
const APPROVED_VIDEO_HOSTS = new Set(["youtube.com", "www.youtube.com", "medlineplus.gov"]);

function buildWikimediaFileUrl(pathname: string): string {
  return `https://upload.wikimedia.org/wikipedia/commons/${pathname}`;
}

function createImageAsset(input: {
  assetKey: string;
  title: string;
  assetCategory: Exclude<AssetCategory, "education-video">;
  sourceName: string;
  sourceUrl: string;
  sourceUri: string;
  licenseType: string;
  attributionText: string;
  copyrightStatus: string;
  thumbnailUri?: string;
}): OfficialAssetDefinition {
  return {
    assetKey: input.assetKey,
    assetType: "IMAGE",
    title: input.title,
    assetCategory: input.assetCategory,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    sourceUri: input.sourceUri,
    thumbnailUri: input.thumbnailUri || input.sourceUri,
    licenseType: input.licenseType,
    attributionText: input.attributionText,
    copyrightStatus: input.copyrightStatus,
  };
}

function createVideoAsset(input: {
  assetKey: string;
  title: string;
  sourceName: string;
  watchUrl: string;
  embedUrl: string;
  thumbnailUri: string;
  attributionText: string;
}): OfficialAssetDefinition {
  return {
    assetKey: input.assetKey,
    assetType: "VIDEO",
    title: input.title,
    assetCategory: "education-video",
    sourceName: input.sourceName,
    sourceUrl: input.watchUrl,
    sourceUri: input.embedUrl,
    thumbnailUri: input.thumbnailUri,
    licenseType: YOUTUBE_STANDARD_LICENSE,
    attributionText: input.attributionText,
    copyrightStatus: "embedded-external-reference",
  };
}

const PACKAGE_SPECS: PackageAssetSpec[] = [
  {
    packageKey: "blood-transfusion-education-package",
    titleEn: "Blood Transfusion Education Package",
    titleAr: "حزمة التثقيف الخاصة بنقل الدم",
    procedureCode: "blood-transfusion",
    assets: [
      createImageAsset({
        assetKey: "blood-transfusion-main-education-image",
        title: "Blood Transfusion Main Educational Image",
        assetCategory: "main-education-image",
        sourceName: "Wikimedia Commons / Blausen Medical Communications",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Blausen_0086_Blood_Bag.png",
        sourceUri: buildWikimediaFileUrl("4/40/Blausen_0086_Blood_Bag.png"),
        licenseType: "CC_BY_3_0",
        attributionText: "BruceBlaus, via Wikimedia Commons",
        copyrightStatus: "licensed",
      }),
      createImageAsset({
        assetKey: "blood-transfusion-procedure-illustration",
        title: "Blood Transfusion Procedure Illustration",
        assetCategory: "procedure-illustration",
        sourceName: "Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Blood_transfusion_A.jpg",
        sourceUri: buildWikimediaFileUrl("6/63/Blood_transfusion_A.jpg"),
        licenseType: "CC0_1_0",
        attributionText: "26RIJNA2020, via Wikimedia Commons",
        copyrightStatus: "public-domain-dedicated",
      }),
      createImageAsset({
        assetKey: "blood-transfusion-risks-complications-illustration",
        title: "Blood Transfusion Risks and Compatibility Illustration",
        assetCategory: "risks-complications-illustration",
        sourceName: "Wikimedia Commons / U.S. Air Force",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:What%27s_Your_Type%3F_DVIDS236092.jpg",
        sourceUri: buildWikimediaFileUrl("b/b5/What%27s_Your_Type%3F_DVIDS236092.jpg"),
        licenseType: "PUBLIC_DOMAIN_US_GOVERNMENT",
        attributionText: "Master Sgt. Tracy DeMarco, via Wikimedia Commons",
        copyrightStatus: "public-domain",
      }),
      createVideoAsset({
        assetKey: "blood-transfusion-education-video",
        title: "Blood Transfusion Educational Video",
        sourceName: "Mayo Clinic",
        watchUrl: "https://www.youtube.com/watch?v=zIPtekPhhjY",
        embedUrl: "https://www.youtube.com/embed/zIPtekPhhjY",
        thumbnailUri: "https://i.ytimg.com/vi/zIPtekPhhjY/hqdefault.jpg",
        attributionText: "Mayo Clinic YouTube channel",
      }),
    ],
  },
  {
    packageKey: "endoscopy-education-package",
    titleEn: "Endoscopy Education Package",
    titleAr: "حزمة التثقيف الخاصة بالمنظار العلوي",
    procedureCode: "endoscopy",
    assets: [
      createImageAsset({
        assetKey: "endoscopy-main-education-image",
        title: "Endoscopy Main Educational Image",
        assetCategory: "main-education-image",
        sourceName: "Wikimedia Commons / National Cancer Institute",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Endoscopy_nci-vol-1982-300.jpg",
        sourceUri: buildWikimediaFileUrl("b/b5/Endoscopy_nci-vol-1982-300.jpg"),
        licenseType: "PUBLIC_DOMAIN_US_GOVERNMENT",
        attributionText: "Linda Bartlett (photographer), via Wikimedia Commons",
        copyrightStatus: "public-domain",
      }),
      createImageAsset({
        assetKey: "endoscopy-procedure-illustration",
        title: "Endoscopy Procedure Illustration",
        assetCategory: "procedure-illustration",
        sourceName: "Wikimedia Commons / Wellcome Collection",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Endoscopic_examination_of_a_patient%27s_gut_by_Dr_A.I._Morris,_Wellcome_L0029416.jpg",
        sourceUri: buildWikimediaFileUrl("3/38/Endoscopic_examination_of_a_patient%27s_gut_by_Dr_A.I._Morris%2C_Wellcome_L0029416.jpg"),
        licenseType: "CC_BY_4_0",
        attributionText: "Julia Midgley / Wellcome Collection, via Wikimedia Commons",
        copyrightStatus: "licensed",
      }),
      createImageAsset({
        assetKey: "endoscopy-risks-complications-illustration",
        title: "Endoscopy Preparation and Recovery Illustration",
        assetCategory: "risks-complications-illustration",
        sourceName: "Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Endoscopy_room.jpg",
        sourceUri: buildWikimediaFileUrl("d/d5/Endoscopy_room.jpg"),
        licenseType: "CC_BY_2_0",
        attributionText: "Gilo1969, via Wikimedia Commons",
        copyrightStatus: "licensed",
      }),
      createVideoAsset({
        assetKey: "endoscopy-education-video",
        title: "Endoscopy Educational Video",
        sourceName: "Johns Hopkins Medicine",
        watchUrl: "https://www.youtube.com/watch?v=juqqo7PQWEs",
        embedUrl: "https://www.youtube.com/embed/juqqo7PQWEs",
        thumbnailUri: "https://i.ytimg.com/vi/juqqo7PQWEs/hqdefault.jpg",
        attributionText: "Johns Hopkins Medicine YouTube channel",
      }),
    ],
  },
  {
    packageKey: "colonoscopy-education-package",
    titleEn: "Colonoscopy Education Package",
    titleAr: "حزمة التثقيف الخاصة بمنظار القولون",
    procedureCode: "colonoscopy",
    assets: [
      createImageAsset({
        assetKey: "colonoscopy-main-education-image",
        title: "Colonoscopy Main Educational Illustration",
        assetCategory: "main-education-image",
        sourceName: "Wikimedia Commons / Cancer Research UK",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Diagram_showing_a_colonoscopy_CRUK_060.svg",
        sourceUri: buildWikimediaFileUrl("b/b7/Diagram_showing_a_colonoscopy_CRUK_060.svg"),
        licenseType: "CC_BY_SA_4_0",
        attributionText: "Cancer Research UK, via Wikimedia Commons",
        copyrightStatus: "licensed",
      }),
      createImageAsset({
        assetKey: "colonoscopy-procedure-illustration",
        title: "Colonoscopy Preparation Illustration",
        assetCategory: "procedure-illustration",
        sourceName: "Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Drug_for_Whole_bowel_irrigation.jpg",
        sourceUri: buildWikimediaFileUrl("d/da/Drug_for_Whole_bowel_irrigation.jpg"),
        licenseType: "CC_BY_SA_4_0",
        attributionText: "melvil, via Wikimedia Commons",
        copyrightStatus: "licensed",
      }),
      createImageAsset({
        assetKey: "colonoscopy-risks-complications-illustration",
        title: "Colonoscopy Risks and Findings Illustration",
        assetCategory: "risks-complications-illustration",
        sourceName: "Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Erinevad_soolepol%C3%BC%C3%BCbid.svg",
        sourceUri: buildWikimediaFileUrl("2/21/Erinevad_soolepol%C3%BC%C3%BCbid.svg"),
        licenseType: "CC_BY_SA_4_0",
        attributionText: "Kkrigul, via Wikimedia Commons",
        copyrightStatus: "licensed",
      }),
      createVideoAsset({
        assetKey: "colonoscopy-education-video",
        title: "Colonoscopy Educational Video",
        sourceName: "Cleveland Clinic",
        watchUrl: "https://www.youtube.com/watch?v=_ylJsP-M6t8",
        embedUrl: "https://www.youtube.com/embed/_ylJsP-M6t8",
        thumbnailUri: "https://i.ytimg.com/vi/_ylJsP-M6t8/hqdefault.jpg",
        attributionText: "Cleveland Clinic YouTube channel",
      }),
    ],
  },
  {
    packageKey: "mri-contrast-education-package",
    titleEn: "MRI Contrast Education Package",
    titleAr: "حزمة التثقيف الخاصة بصبغة الرنين المغناطيسي",
    procedureCode: "mri-contrast",
    assets: [
      createImageAsset({
        assetKey: "mri-contrast-main-education-image",
        title: "MRI Main Educational Illustration",
        assetCategory: "main-education-image",
        sourceName: "Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:MRI_Scan_General_Illustration.jpg",
        sourceUri: buildWikimediaFileUrl("d/d8/MRI_Scan_General_Illustration.jpg"),
        licenseType: "CC_BY_SA_4_0",
        attributionText: "Ptrump16, via Wikimedia Commons",
        copyrightStatus: "licensed",
      }),
      createImageAsset({
        assetKey: "mri-contrast-procedure-illustration",
        title: "MRI Procedure Illustration",
        assetCategory: "procedure-illustration",
        sourceName: "Openverse / Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Patient_and_MRI_device.svg",
        sourceUri: buildWikimediaFileUrl("b/b1/Patient_and_MRI_device.svg"),
        licenseType: "CC0_1_0",
        attributionText: "oksmith, via Wikimedia Commons",
        copyrightStatus: "public-domain-dedicated",
      }),
      createImageAsset({
        assetKey: "mri-contrast-risks-complications-illustration",
        title: "MRI Reference Illustration",
        assetCategory: "risks-complications-illustration",
        sourceName: "Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:MRI_Head_Brain_Normal.jpg",
        sourceUri: buildWikimediaFileUrl("e/ef/MRI_Head_Brain_Normal.jpg"),
        licenseType: "CC_BY_SA_4_0",
        attributionText: "Ptrump16, via Wikimedia Commons",
        copyrightStatus: "licensed",
      }),
      createVideoAsset({
        assetKey: "mri-contrast-education-video",
        title: "MRI Educational Video",
        sourceName: "Mayo Clinic",
        watchUrl: "https://www.youtube.com/watch?v=3FU_P48BXA4",
        embedUrl: "https://www.youtube.com/embed/3FU_P48BXA4",
        thumbnailUri: "https://i.ytimg.com/vi/3FU_P48BXA4/hqdefault.jpg",
        attributionText: "Mayo Clinic YouTube channel",
      }),
    ],
  },
  {
    packageKey: "ct-contrast-education-package",
    titleEn: "CT Contrast Education Package",
    titleAr: "حزمة التثقيف الخاصة بصبغة الأشعة المقطعية",
    procedureCode: "ct-contrast",
    assets: [
      createImageAsset({
        assetKey: "ct-contrast-main-education-image",
        title: "CT Main Educational Illustration",
        assetCategory: "main-education-image",
        sourceName: "Wikimedia Commons / Blausen Medical Communications",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Blausen_0206_CATScan_02.png",
        sourceUri: buildWikimediaFileUrl("0/05/Blausen_0206_CATScan_02.png"),
        licenseType: "CC_BY_3_0",
        attributionText: "Blausen Medical Communications, Inc., via Wikimedia Commons",
        copyrightStatus: "licensed",
      }),
      createImageAsset({
        assetKey: "ct-contrast-procedure-illustration",
        title: "CT Procedure Illustration",
        assetCategory: "procedure-illustration",
        sourceName: "Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:CT_Abdomen_Scan.jpg",
        sourceUri: buildWikimediaFileUrl("0/08/CT_Abdomen_Scan.jpg"),
        licenseType: "CC_BY_4_0",
        attributionText: "Goleisureintl, via Wikimedia Commons",
        copyrightStatus: "licensed",
      }),
      createImageAsset({
        assetKey: "ct-contrast-risks-complications-illustration",
        title: "CT Contrast Illustration",
        assetCategory: "risks-complications-illustration",
        sourceName: "Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Contrast-Enhanced_CT_(CECT)_Abdomen_and_Pelvis_Scan.jpg",
        sourceUri: buildWikimediaFileUrl("0/0c/Contrast-Enhanced_CT_%28CECT%29_Abdomen_and_Pelvis_Scan.jpg"),
        licenseType: "CC_BY_4_0",
        attributionText: "Goleisureintl, via Wikimedia Commons",
        copyrightStatus: "licensed",
      }),
      createVideoAsset({
        assetKey: "ct-contrast-education-video",
        title: "CT Scan Educational Video",
        sourceName: "Cleveland Clinic",
        watchUrl: "https://www.youtube.com/watch?v=kxeGWGZIxco",
        embedUrl: "https://www.youtube.com/embed/kxeGWGZIxco",
        thumbnailUri: "https://i.ytimg.com/vi/kxeGWGZIxco/hqdefault.jpg",
        attributionText: "Cleveland Clinic YouTube channel",
      }),
    ],
  },
  {
    packageKey: "general-anesthesia-education-package",
    titleEn: "General Anesthesia Education Package",
    titleAr: "حزمة التثقيف الخاصة بالتخدير العام",
    procedureCode: "general-anesthesia",
    assets: [
      createImageAsset({
        assetKey: "general-anesthesia-main-education-image",
        title: "General Anesthesia Main Educational Illustration",
        assetCategory: "main-education-image",
        sourceName: "Wikimedia Commons / National Institute of Standards and Technology",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Anesthesia_(7003164721).jpg",
        sourceUri: buildWikimediaFileUrl("1/1f/Anesthesia_%287003164721%29.jpg"),
        licenseType: "PUBLIC_DOMAIN_US_GOVERNMENT",
        attributionText: "National Institute of Standards and Technology, via Wikimedia Commons",
        copyrightStatus: "public-domain",
      }),
      createImageAsset({
        assetKey: "general-anesthesia-procedure-illustration",
        title: "General Anesthesia Procedure Illustration",
        assetCategory: "procedure-illustration",
        sourceName: "Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Surveillance_de_l%27anesth%C3%A9sie_au_bloc_op%C3%A9ratoire.jpg",
        sourceUri: buildWikimediaFileUrl("4/49/Surveillance_de_l%27anesth%C3%A9sie_au_bloc_op%C3%A9ratoire.jpg"),
        licenseType: "CC_BY_SA_4_0",
        attributionText: "Hirondus, via Wikimedia Commons",
        copyrightStatus: "licensed",
      }),
      createImageAsset({
        assetKey: "general-anesthesia-risks-complications-illustration",
        title: "Anesthesia Risks and Alternatives Illustration",
        assetCategory: "risks-complications-illustration",
        sourceName: "Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Spinal_anesthesia_jp.svg",
        sourceUri: buildWikimediaFileUrl("e/e7/Spinal_anesthesia_jp.svg"),
        licenseType: "CC_BY_SA_3_0",
        attributionText: "User:Anka Friedrich, via Wikimedia Commons",
        copyrightStatus: "licensed",
      }),
      createVideoAsset({
        assetKey: "general-anesthesia-education-video",
        title: "General Anesthesia Educational Video",
        sourceName: "Mayo Clinic",
        watchUrl: "https://www.youtube.com/watch?v=H-_xpSFS5PQ",
        embedUrl: "https://www.youtube.com/embed/H-_xpSFS5PQ",
        thumbnailUri: "https://i.ytimg.com/vi/H-_xpSFS5PQ/hqdefault.jpg",
        attributionText: "Mayo Clinic YouTube channel",
      }),
    ],
  },
];

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function getBoolean(value: unknown): boolean {
  return value === true;
}

function buildAssetHash(input: {
  packageKey: string;
  assetKey: string;
  assetType: string;
  title: string;
  sourceUrl: string;
  sourceName: string;
  licenseType: string;
  attributionText: string;
  assetCategory: string;
  copyrightStatus: string;
}): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function buildVersionManifest(baseManifest: Record<string, unknown>, spec: PackageAssetSpec) {
  return {
    ...baseManifest,
    controlledAssetManifest: {
      phase: "phase6c-official-sources",
      packageKey: spec.packageKey,
      reviewedAt: REVIEWED_AT,
      assets: spec.assets.map((asset) => ({
        assetKey: asset.assetKey,
        assetType: asset.assetType,
        assetCategory: asset.assetCategory,
        sourceName: asset.sourceName,
        sourceUrl: asset.sourceUrl,
        licenseType: asset.licenseType,
        copyrightStatus: asset.copyrightStatus,
      })),
    },
  };
}

function hasRequiredAssetMetadata(metadata: Record<string, unknown>): boolean {
  return [
    getString(metadata.sourceName),
    getString(metadata.sourceUrl),
    getString(metadata.licenseType),
    getString(metadata.attributionText) || getString(metadata.attribution),
    getString(metadata.assetHash),
    getString(metadata.assetCategory),
    getString(metadata.copyrightStatus),
    getString(metadata.reviewedAt),
  ].every(Boolean) && getBoolean(metadata.isApproved);
}

function buildControlledAssets(spec: PackageAssetSpec) {
  return spec.assets.map((asset, index) => {
    const assetHash = buildAssetHash({
      packageKey: spec.packageKey,
      assetKey: asset.assetKey,
      assetType: asset.assetType,
      title: asset.title,
      sourceUrl: asset.sourceUrl,
      sourceName: asset.sourceName,
      licenseType: asset.licenseType,
      attributionText: asset.attributionText,
      assetCategory: asset.assetCategory,
      copyrightStatus: asset.copyrightStatus,
    });

    return {
      assetKey: asset.assetKey,
      assetType: asset.assetType,
      title: asset.title,
      locale: "bilingual",
      sourceUri: asset.sourceUri,
      thumbnailUri: asset.thumbnailUri || asset.sourceUri,
      sortOrder: (index + 1) * 100,
      metadata: {
        phase: "phase6c-official-sources",
        sourceUrl: asset.sourceUrl,
        sourceName: asset.sourceName,
        licenseType: asset.licenseType,
        attribution: asset.attributionText,
        attributionText: asset.attributionText,
        assetHash,
        assetCategory: asset.assetCategory,
        copyrightStatus: asset.copyrightStatus,
        reviewedAt: REVIEWED_AT,
        isApproved: true,
        externalReferenceOnly: asset.assetType === "VIDEO",
        officialSourceOnly: true,
      },
    };
  });
}

async function ensureAssetAuditEvents(args: {
  tenantId: string;
  actorUserId?: string | null;
  packageId: string;
  versionId: string;
  assets: Array<{
    id: string;
    assetKey: string;
    assetType: string;
    title: string;
    contentHash: string | null;
    metadata: unknown;
  }>;
}) {
  const prisma = getPrisma();
  const existingCount = await prisma.educationAuditEvent.count({
    where: {
      tenantId: args.tenantId,
      educationPackageId: args.packageId,
      versionId: args.versionId,
      action: "ASSET_REGISTERED",
    },
  });

  if (existingCount >= args.assets.length) {
    return;
  }

  for (const asset of args.assets) {
    const metadata = asRecord(asset.metadata);
    await recordEducationAuditEvent({
      tenantId: args.tenantId,
      educationPackageId: args.packageId,
      versionId: args.versionId,
      actorUserId: args.actorUserId,
      action: "ASSET_REGISTERED",
      metadata: {
        assetId: asset.id,
        assetKey: asset.assetKey,
        assetType: asset.assetType,
        title: asset.title,
        assetHash: getString(metadata.assetHash),
        contentHash: asset.contentHash,
        assetCategory: getString(metadata.assetCategory),
        sourceUrl: getString(metadata.sourceUrl),
        sourceName: getString(metadata.sourceName),
        licenseType: getString(metadata.licenseType),
        attribution: getString(metadata.attributionText) || getString(metadata.attribution),
        attributionText: getString(metadata.attributionText) || getString(metadata.attribution),
        copyrightStatus: getString(metadata.copyrightStatus),
        reviewedAt: getString(metadata.reviewedAt),
        isApproved: getBoolean(metadata.isApproved),
      },
    });
  }
}

function sourceHost(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isApprovedSourceUrl(assetType: string, url: string): boolean {
  const host = sourceHost(url);
  if (!host) return false;
  if (assetType === "VIDEO") {
    return APPROVED_VIDEO_HOSTS.has(host);
  }
  return APPROVED_IMAGE_HOSTS.has(host);
}

function zipTemplateLinks(templateIds: string[], templateVersionIds: string[]) {
  const pairs: Array<{ consentTemplateId: string; consentTemplateVersionId: string }> = [];
  const count = Math.min(templateIds.length, templateVersionIds.length);
  for (let index = 0; index < count; index += 1) {
    const consentTemplateId = templateIds[index];
    const consentTemplateVersionId = templateVersionIds[index];
    if (consentTemplateId && consentTemplateVersionId) {
      pairs.push({ consentTemplateId, consentTemplateVersionId });
    }
  }
  return pairs;
}

async function writeReport(payload: Record<string, unknown>) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, "validation-proof.json");
  await fs.writeFile(reportPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return reportPath;
}

async function main() {
  const prisma = getPrisma();
  const tenantId = getString(process.env.EDUCATION_DEMO_TENANT_ID);

  if (!tenantId) {
    throw new Error("EDUCATION_DEMO_TENANT_ID is required for Phase 6C controlled asset seeding");
  }

  const actor = await prisma.user.findFirst({
    where: { tenantId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!actor?.id) {
    throw new Error(`No actor user found for tenant ${tenantId}`);
  }

  const results: ValidationPackageResult[] = [];

  for (const spec of PACKAGE_SPECS) {
    const educationPackage = await prisma.educationPackage.findFirst({
      where: { tenantId, packageKey: spec.packageKey },
      include: {
        currentVersion: true,
        versions: {
          orderBy: { versionNumber: "asc" },
          include: { assets: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (!educationPackage) {
      throw new Error(`Education package not found for packageKey=${spec.packageKey}`);
    }

    const sourceVersion = educationPackage.currentVersion || educationPackage.versions.at(-1) || null;
    if (!sourceVersion) {
      throw new Error(`No source version found for packageKey=${spec.packageKey}`);
    }

    const existingPhase6cVersion = educationPackage.versions.find((version) => version.versionLabel === VERSION_LABEL) || null;

    const workingVersion = existingPhase6cVersion || await createEducationPackageVersion({
      tenantId,
      packageId: educationPackage.id,
      actorUserId: actor.id,
      versionLabel: VERSION_LABEL,
      manifestJson: buildVersionManifest(asRecord(sourceVersion.manifestJson), spec),
      metadata: {
        phase: "phase6c-official-sources",
        controlledAssets: true,
        approvedSourcesOnly: true,
      },
      placeholderAssets: buildControlledAssets(spec),
    });

    const approvedPackage = await approveEducationPackage({
      tenantId,
      packageId: educationPackage.id,
      actorUserId: actor.id,
      versionId: workingVersion.id,
    });

    const linkPairs = zipTemplateLinks(
      getStringArray(sourceVersion.linkedTemplateIds),
      getStringArray(sourceVersion.linkedTemplateVersionIds),
    );

    const evidencePackageIds: string[] = [];

    for (const pair of linkPairs) {
      await linkEducationPackageToConsentTemplate({
        tenantId,
        packageId: educationPackage.id,
        actorUserId: actor.id,
        versionId: workingVersion.id,
        consentTemplateId: pair.consentTemplateId,
        consentTemplateVersionId: pair.consentTemplateVersionId,
      });

      const evidencePackage = await generateEducationEvidencePackage({
        tenantId,
        packageId: educationPackage.id,
        actorUserId: actor.id,
        versionId: workingVersion.id,
        consentTemplateId: pair.consentTemplateId,
        consentTemplateVersionId: pair.consentTemplateVersionId,
        metadata: {
          phase: "phase6c-official-sources",
          packageKey: spec.packageKey,
        },
      });
      evidencePackageIds.push(evidencePackage.id);
    }

    if (linkPairs.length === 0) {
      const evidencePackage = await generateEducationEvidencePackage({
        tenantId,
        packageId: educationPackage.id,
        actorUserId: actor.id,
        versionId: workingVersion.id,
        metadata: {
          phase: "phase6c-official-sources",
          packageKey: spec.packageKey,
        },
      });
      evidencePackageIds.push(evidencePackage.id);
    }

    const versionWithAssets = await prisma.educationVersion.findUniqueOrThrow({
      where: { id: workingVersion.id },
      include: { assets: { orderBy: { sortOrder: "asc" } } },
    });

    await ensureAssetAuditEvents({
      tenantId,
      actorUserId: actor.id,
      packageId: educationPackage.id,
      versionId: workingVersion.id,
      assets: versionWithAssets.assets,
    });

    const refreshedEvidencePackages = await prisma.educationEvidencePackage.findMany({
      where: {
        tenantId,
        educationPackageId: educationPackage.id,
        versionId: workingVersion.id,
        id: { in: evidencePackageIds },
      },
      orderBy: { createdAt: "asc" },
    });

    const auditEvents = await prisma.educationAuditEvent.findMany({
      where: {
        tenantId,
        educationPackageId: educationPackage.id,
        versionId: workingVersion.id,
      },
      orderBy: { createdAt: "asc" },
    });

    const auditCounts = auditEvents.reduce<Record<string, number>>((accumulator, event) => {
      accumulator[event.action] = (accumulator[event.action] || 0) + 1;
      return accumulator;
    }, {});

    const evidenceAssetCounts = refreshedEvidencePackages.map((evidencePackage) => {
      const metadata = asRecord(evidencePackage.metadata);
      const assets = Array.isArray(metadata.assets) ? metadata.assets : [];
      return assets.length;
    });

    const imageSources = versionWithAssets.assets
      .filter((asset) => asset.assetType === "IMAGE")
      .map((asset) => {
        const metadata = asRecord(asset.metadata);
        return {
          assetKey: asset.assetKey,
          sourceName: getString(metadata.sourceName),
          sourceUrl: getString(metadata.sourceUrl),
          licenseType: getString(metadata.licenseType),
        };
      });

    const videoAsset = versionWithAssets.assets.find((asset) => asset.assetType === "VIDEO") || null;
    const videoSource = videoAsset
      ? (() => {
          const metadata = asRecord(videoAsset.metadata);
          return {
            assetKey: videoAsset.assetKey,
            sourceName: getString(metadata.sourceName),
            sourceUrl: getString(metadata.sourceUrl),
            embedUrl: videoAsset.sourceUri || "",
            licenseType: getString(metadata.licenseType),
          };
        })()
      : null;

    const metadataComplete = versionWithAssets.assets.every((asset) => hasRequiredAssetMetadata(asRecord(asset.metadata)));
    const approvedSourcesOnly = versionWithAssets.assets.every((asset) => {
      const metadata = asRecord(asset.metadata);
      return isApprovedSourceUrl(asset.assetType, getString(metadata.sourceUrl));
    });

    results.push({
      packageKey: spec.packageKey,
      packageId: educationPackage.id,
      versionId: workingVersion.id,
      versionLabel: workingVersion.versionLabel,
      assetIds: versionWithAssets.assets.map((asset) => asset.id),
      assetCount: versionWithAssets.assets.length,
      imageSources,
      videoSource,
      assetHashes: versionWithAssets.assets.map((asset) => {
        const metadata = asRecord(asset.metadata);
        return {
          assetKey: asset.assetKey,
          contentHash: asset.contentHash,
          metadataAssetHash: getString(metadata.assetHash) || null,
        };
      }),
      assetManifest: versionWithAssets.assets.map((asset) => {
        const metadata = asRecord(asset.metadata);
        return {
          assetKey: asset.assetKey,
          assetType: asset.assetType,
          assetCategory: getString(metadata.assetCategory),
          sourceName: getString(metadata.sourceName),
          sourceUrl: getString(metadata.sourceUrl),
          licenseType: getString(metadata.licenseType),
          copyrightStatus: getString(metadata.copyrightStatus),
        };
      }),
      auditCounts,
      evidencePackageIds,
      evidenceAssetCounts,
      validation: {
        packageFound: true,
        versionApproved: approvedPackage.currentVersionId === workingVersion.id,
        assetsLinked:
          versionWithAssets.assets.length === 4
          && versionWithAssets.assets.filter((asset) => asset.assetType === "IMAGE").length === 3
          && versionWithAssets.assets.filter((asset) => asset.assetType === "VIDEO").length === 1,
        assetsVersioned: versionWithAssets.assets.every((asset) => asset.versionId === workingVersion.id),
        evidenceIncludesAssets: evidenceAssetCounts.every((count) => count === 4),
        metadataComplete,
        approvedSourcesOnly,
      },
    });
  }

  const overallPass = results.every((result) => Object.values(result.validation).every(Boolean));

  const payload = {
    status: overallPass ? "PASS" : "FAIL",
    tenantId,
    packageCount: results.length,
    results,
    totals: {
      assetCount: results.reduce((sum, result) => sum + result.assetCount, 0),
      auditCount: results.reduce((sum, result) => sum + Object.values(result.auditCounts).reduce((inner, count) => inner + count, 0), 0),
    },
  };

  const reportPath = await writeReport(payload);
  console.log(JSON.stringify({ ...payload, reportPath }, null, 2));
  process.exit(overallPass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});