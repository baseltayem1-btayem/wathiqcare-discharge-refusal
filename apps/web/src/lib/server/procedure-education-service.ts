import "server-only";

import { ProcedureEducationAssetType } from "@prisma/client";
import { getPrisma } from "@/lib/server/prisma";

export type ProcedureEducationCardRecord = {
  id: string;
  procedureCode: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string | null;
  summaryEn: string | null;
  status: string;
  versionLabel: string;
  sectionCount: number;
  languages: string[];
  assetCounts: {
    images: number;
    infographics: number;
    videos: number;
    pdfs: number;
  };
  updatedAt: Date;
};

export async function listProcedureEducation(): Promise<ProcedureEducationCardRecord[]> {
  const rows = await getPrisma().procedureEducation.findMany({
    orderBy: [{ updatedAt: "desc" }, { titleEn: "asc" }],
    include: {
      currentVersion: {
        select: {
          versionLabel: true,
        },
      },
      assets: {
        select: {
          assetType: true,
          metadata: true,
        },
      },
      sections: {
        select: {
          id: true,
        },
      },
      localizations: {
        select: {
          language: true,
        },
      },
    },
  });

  return rows.map((row) => {
    const imageAssets = row.assets.filter((asset) => asset.assetType === ProcedureEducationAssetType.IMAGE);
    const infographics = imageAssets.filter((asset) => {
      const metadata = asset.metadata as { architectureType?: string } | null;
      return metadata?.architectureType === "infographic";
    }).length;
    const images = imageAssets.length - infographics;
    const videos = row.assets.filter((asset) => asset.assetType === ProcedureEducationAssetType.VIDEO).length;
    const pdfs = row.assets.filter((asset) => asset.assetType === ProcedureEducationAssetType.PDF).length;
    const languages = Array.from(new Set(row.localizations.map((localization) => localization.language))).sort();

    return {
      id: row.id,
      procedureCode: row.procedureCode,
      titleAr: row.titleAr,
      titleEn: row.titleEn,
      summaryAr: row.summaryAr,
      summaryEn: row.summaryEn,
      status: row.status,
      versionLabel: row.currentVersion?.versionLabel ?? "v1.0",
      sectionCount: row.sections.length,
      languages,
      assetCounts: { images, infographics, videos, pdfs },
      updatedAt: row.updatedAt,
    };
  });
}

export async function getProcedureEducationById(id: string): Promise<ProcedureEducationCardRecord | null> {
  const row = await getPrisma().procedureEducation.findUnique({
    where: { id },
    include: {
      currentVersion: {
        select: {
          versionLabel: true,
        },
      },
      assets: {
        select: {
          assetType: true,
          metadata: true,
        },
      },
      sections: {
        select: {
          id: true,
        },
      },
      localizations: {
        select: {
          language: true,
        },
      },
    },
  });

  if (!row) {
    return null;
  }

  const imageAssets = row.assets.filter((asset) => asset.assetType === ProcedureEducationAssetType.IMAGE);
  const infographics = imageAssets.filter((asset) => {
    const metadata = asset.metadata as { architectureType?: string } | null;
    return metadata?.architectureType === "infographic";
  }).length;
  const images = imageAssets.length - infographics;
  const videos = row.assets.filter((asset) => asset.assetType === ProcedureEducationAssetType.VIDEO).length;
  const pdfs = row.assets.filter((asset) => asset.assetType === ProcedureEducationAssetType.PDF).length;
  const languages = Array.from(new Set(row.localizations.map((localization) => localization.language))).sort();

  return {
    id: row.id,
    procedureCode: row.procedureCode,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    summaryAr: row.summaryAr,
    summaryEn: row.summaryEn,
    status: row.status,
    versionLabel: row.currentVersion?.versionLabel ?? "v1.0",
    sectionCount: row.sections.length,
    languages,
    assetCounts: { images, infographics, videos, pdfs },
    updatedAt: row.updatedAt,
  };
}
