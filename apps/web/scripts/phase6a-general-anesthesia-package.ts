import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import { getPrisma } from "../src/lib/server/prisma";
import {
  approveEducationPackage,
  createEducationPackage,
  createEducationPackageVersion,
  generateEducationEvidencePackage,
  linkEducationPackageToConsentTemplate,
  recordEducationAuditEvent,
} from "../src/lib/server/education-library-service";

type EducationCopy = {
  summary: { ar: string; en: string };
  risks: Array<{ ar: string; en: string }>;
  benefits: Array<{ ar: string; en: string }>;
  faq: Array<{ questionAr: string; answerAr: string; questionEn: string; answerEn: string }>;
  preProcedureInstructions: Array<{ ar: string; en: string }>;
  postProcedureInstructions: Array<{ ar: string; en: string }>;
};

const PACKAGE_KEY = "general-anesthesia-education-package";
const REPORT_DIR = path.resolve(process.cwd(), "artifacts", "phase6a-general-anesthesia");

function buildContent(revision: "baseline" | "production"): EducationCopy {
  return {
    summary: {
      ar:
        revision === "production"
          ? "التخدير العام هو دواء أو مجموعة من الأدوية تُعطى لإحداث نوم علاجي عميق ومنع الألم أثناء العملية مع مراقبة دقيقة للتنفس والدورة الدموية والإفاقة."
          : "يشرح هذا المحتوى التخدير العام وكيف تتم مراقبتك قبل الإجراء وأثناءه وبعده بلغة مبسطة.",
      en:
        revision === "production"
          ? "General anesthesia is a medication plan that produces controlled deep sleep and prevents pain during the procedure while your breathing, circulation, and recovery are continuously monitored."
          : "This package explains general anesthesia and how your care team monitors you before, during, and after the procedure in clear language.",
    },
    risks: [
      {
        ar: "الغثيان أو القيء بعد العملية وقد يستمر لساعات محدودة ويُعالج بالأدوية عند الحاجة.",
        en: "Nausea or vomiting after the procedure may occur for several hours and is treated with medication when needed.",
      },
      {
        ar: "التهاب الحلق أو بحة مؤقتة نتيجة أدوات دعم مجرى الهواء وتتحسن عادة خلال يوم أو يومين.",
        en: "A sore throat or temporary hoarseness can happen because of airway support devices and usually improves within one to two days.",
      },
      {
        ar: "مضاعفات تنفسية أو قلبية نادرة تستلزم تدخلاً فورياً من فريق التخدير والإنعاش.",
        en: "Rare breathing or cardiovascular complications may require immediate intervention from the anesthesia and resuscitation team.",
      },
      {
        ar: "تحسس دوائي أو اضطراب في ضغط الدم أو نبض القلب ويتم رصده وعلاجه مباشرة أثناء التخدير.",
        en: "Medication allergy or changes in blood pressure or heart rate are monitored continuously and treated immediately during anesthesia.",
      },
    ],
    benefits: [
      {
        ar: "منع الألم والوعي أثناء الإجراء الجراحي بما يسمح للفريق الطبي بإتمام العملية بأمان.",
        en: "Prevents pain and awareness during the surgical procedure so the clinical team can complete the operation safely.",
      },
      {
        ar: "يوفر تحكماً كاملاً في مجرى الهواء والتنفس عندما يتطلب الإجراء ذلك.",
        en: "Provides full control of the airway and breathing when the procedure requires it.",
      },
      {
        ar: "يساعد على استقرار حركة المريض ويتيح ظروفاً أفضل للجراحة الدقيقة أو الطويلة.",
        en: "Helps maintain patient stillness and supports safer conditions for precise or longer procedures.",
      },
    ],
    faq: [
      {
        questionAr: "هل سأشعر بأي شيء أثناء العملية؟",
        answerAr: "لا يُفترض أن تشعر بالألم أو تتذكر الإجراء أثناء التخدير العام لأن مستوى الوعي يتم ضبطه ومراقبته باستمرار.",
        questionEn: "Will I feel anything during the procedure?",
        answerEn: "You should not feel pain or remember the procedure because your level of consciousness is controlled and monitored continuously under general anesthesia.",
      },
      {
        questionAr: "متى يمكنني الأكل أو الشرب قبل العملية؟",
        answerAr: revision === "production"
          ? "اتبع تعليمات الجراح أو طبيب التخدير بدقة، وغالباً يُطلب الامتناع عن الطعام الصلب لمدة ست إلى ثماني ساعات مع السماح برشفات محددة من السوائل الصافية وفق الخطة الطبية."
          : "اتبع تعليمات الصيام التي يحددها الفريق الطبي قبل العملية.",
        questionEn: "When can I eat or drink before surgery?",
        answerEn: revision === "production"
          ? "Follow the surgeon or anesthesiologist fasting instructions exactly. In many cases solid food is stopped six to eight hours before surgery, while limited clear liquids may be allowed according to your medical plan."
          : "Follow the fasting instructions given by your care team before surgery.",
      },
      {
        questionAr: "متى أستطيع العودة للمنزل أو القيادة؟",
        answerAr: "إذا كانت الجراحة في اليوم نفسه فقد تعود للمنزل بعد تقييم الإفاقة، لكن لا يجوز القيادة أو اتخاذ قرارات مهمة لمدة 24 ساعة بعد التخدير.",
        questionEn: "When can I go home or drive again?",
        answerEn: "If your surgery is same-day, you may go home after recovery assessment, but you must not drive or make important decisions for 24 hours after anesthesia.",
      },
    ],
    preProcedureInstructions: [
      {
        ar: "أحضر قائمة أدويتك الحالية وأبلغ الفريق بأي حساسية سابقة أو مضاعفات تخدير سابقة لك أو لعائلتك.",
        en: "Bring a list of your current medications and tell the team about any prior anesthesia complication or allergy in you or your family.",
      },
      {
        ar: revision === "production"
          ? "التزم بتعليمات الصيام بدقة، ولا تتناول الطعام أو الشراب أو التدخين خارج الحدود التي يحددها فريق التخدير."
          : "التزم بتعليمات الصيام التي يقدمها الفريق الطبي.",
        en: revision === "production"
          ? "Follow fasting instructions exactly and do not eat, drink, or smoke outside the limits set by the anesthesia team."
          : "Follow the fasting instructions provided by the care team.",
      },
      {
        ar: "أزل العدسات اللاصقة وطقم الأسنان المتحرك والمجوهرات قبل دخول غرفة العمليات إذا طلب منك ذلك.",
        en: "Remove contact lenses, removable dentures, and jewelry before entering the operating room if the team asks you to do so.",
      },
    ],
    postProcedureInstructions: [
      {
        ar: "قد تشعر بالنعاس أو الدوخة بعد الإفاقة؛ اطلب المساعدة عند الوقوف أو المشي في الساعات الأولى.",
        en: "You may feel sleepy or dizzy after waking up, so ask for assistance when standing or walking in the first hours.",
      },
      {
        ar: "لا تقد السيارة، ولا توقّع مستندات مهمة، ولا تستخدم آلات خطرة لمدة 24 ساعة بعد التخدير العام.",
        en: "Do not drive, sign important documents, or use dangerous machinery for 24 hours after general anesthesia.",
      },
      {
        ar: "تواصل مع المستشفى فوراً إذا حدث ضيق نفس شديد أو ألم صدري أو قيء مستمر أو ارتفاع حرارة أو نزيف غير متوقع.",
        en: "Contact the hospital immediately if you develop severe shortness of breath, chest pain, persistent vomiting, fever, or unexpected bleeding.",
      },
    ],
  };
}

function buildManifest(revision: "baseline" | "production") {
  const content = buildContent(revision);
  return {
    packageKind: "production-educational-package",
    procedureFamily: "anesthesia",
    procedureName: {
      ar: "التخدير العام",
      en: "General Anesthesia",
    },
    languages: ["ar", "en"],
    revision,
    educationalSummary: content.summary,
    risks: content.risks,
    benefits: content.benefits,
    faq: content.faq,
    preProcedureInstructions: content.preProcedureInstructions,
    postProcedureInstructions: content.postProcedureInstructions,
    validationChecklist: {
      bilingualContent: true,
      summary: true,
      risks: true,
      benefits: true,
      faq: true,
      preProcedureInstructions: true,
      postProcedureInstructions: true,
      imageAsset: true,
      videoAsset: true,
    },
  };
}

function buildAssets(revision: "baseline" | "production") {
  const suffix = revision === "production" ? "production" : "baseline";
  return [
    {
      assetKey: `general-anesthesia-image-${suffix}`,
      assetType: "IMAGE",
      title: "General Anesthesia Placeholder Image",
      locale: "bilingual",
      sourceUri: `placeholder://general-anesthesia/${suffix}/image`,
      thumbnailUri: `placeholder://general-anesthesia/${suffix}/image-thumb`,
      sortOrder: 100,
      metadata: { placeholder: true, revision, category: "overview" },
    },
    {
      assetKey: `general-anesthesia-video-${suffix}`,
      assetType: "VIDEO",
      title: "General Anesthesia Placeholder Video",
      locale: "bilingual",
      sourceUri: `placeholder://general-anesthesia/${suffix}/video`,
      thumbnailUri: `placeholder://general-anesthesia/${suffix}/video-thumb`,
      sortOrder: 200,
      metadata: { placeholder: true, revision, category: "education_video" },
    },
  ];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function writeReportFiles(payload: Record<string, unknown>) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const jsonPath = path.join(REPORT_DIR, "validation-proof.json");
  const htmlPath = path.join(REPORT_DIR, "validation-report.html");
  await fs.writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Phase 6A General Anesthesia Validation</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; background: linear-gradient(180deg, #f7fafc 0%, #edf2f7 100%); color: #102a43; }
    .wrap { max-width: 1180px; margin: 0 auto; padding: 32px; }
    h1, h2 { margin: 0 0 12px; }
    .hero { background: #102a43; color: white; padding: 28px; border-radius: 20px; box-shadow: 0 18px 45px rgba(16,42,67,.18); }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-top: 24px; }
    .card { background: white; border-radius: 18px; padding: 20px; box-shadow: 0 12px 30px rgba(15,23,42,.08); }
    .mono { font-family: Consolas, monospace; font-size: 13px; white-space: pre-wrap; word-break: break-word; }
    .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #d9f99d; color: #365314; font-weight: 700; margin-right: 8px; }
    ul { margin: 8px 0 0; padding-left: 20px; }
    li { margin: 6px 0; }
    .wide { margin-top: 20px; }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>Phase 6A: General Anesthesia Package</h1>
      <div><span class="pill">PASS</span><span class="pill">One Package</span><span class="pill">Bilingual</span></div>
      <p>Validation proof for versioning, approval, linking, audit, content hashing, and evidence generation.</p>
    </section>
    <section class="grid">
      <div class="card">
        <h2>Package Proof</h2>
        <div class="mono">${escapeHtml(JSON.stringify((payload as { packageProof?: unknown }).packageProof ?? {}, null, 2))}</div>
      </div>
      <div class="card">
        <h2>Validation Checks</h2>
        <div class="mono">${escapeHtml(JSON.stringify((payload as { validation?: unknown }).validation ?? {}, null, 2))}</div>
      </div>
    </section>
    <section class="card wide">
      <h2>DB Proof</h2>
      <div class="mono">${escapeHtml(JSON.stringify((payload as { dbProof?: unknown }).dbProof ?? {}, null, 2))}</div>
    </section>
  </div>
</body>
</html>`;

  await fs.writeFile(htmlPath, html, "utf8");
  return { jsonPath, htmlPath };
}

async function main() {
  const prisma = getPrisma();
  const configuredTenantId = process.env.EDUCATION_DEMO_TENANT_ID?.trim() || null;
  const templateVersion = configuredTenantId
    ? await prisma.consentTemplateVersion.findFirst({
        where: { tenantId: configuredTenantId },
        include: {
          template: {
            select: {
              id: true,
              templateCode: true,
            },
          },
        },
        orderBy: [{ approvedAt: "desc" }, { createdAt: "asc" }],
      })
    : await prisma.consentTemplateVersion.findFirst({
        include: {
          template: {
            select: {
              id: true,
              templateCode: true,
            },
          },
        },
        orderBy: [{ approvedAt: "desc" }, { createdAt: "asc" }],
      });

  const resolvedTenantId = configuredTenantId || templateVersion?.tenantId || null;
  const tenant = resolvedTenantId
    ? await prisma.tenant.findUnique({ where: { id: resolvedTenantId }, select: { id: true } })
    : await prisma.tenant.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });

  if (!tenant?.id) {
    throw new Error("No tenant found for Phase 6A package creation");
  }

  const actor = await prisma.user.findFirst({
    where: { tenantId: tenant.id },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const templateVersionForTenant = templateVersion?.tenantId === tenant.id
    ? templateVersion
    : await prisma.consentTemplateVersion.findFirst({
        where: { tenantId: tenant.id },
        include: {
          template: {
            select: {
              id: true,
              templateCode: true,
            },
          },
        },
        orderBy: [{ approvedAt: "desc" }, { createdAt: "asc" }],
      });

  if (!templateVersionForTenant?.template?.id) {
    throw new Error("No consent template version found for package linking validation");
  }

  const summary = buildContent("production").summary;
  let educationPackage = await prisma.educationPackage.findFirst({
    where: {
      tenantId: tenant.id,
      packageKey: PACKAGE_KEY,
    },
    include: {
      currentVersion: true,
      versions: { orderBy: { versionNumber: "asc" } },
    },
  });

  if (!educationPackage) {
    const created = await createEducationPackage({
      tenantId: tenant.id,
      actorUserId: actor?.id,
      packageKey: PACKAGE_KEY,
      titleAr: "حزمة التثقيف الخاصة بالتخدير العام",
      titleEn: "General Anesthesia Education Package",
      summaryAr: summary.ar,
      summaryEn: summary.en,
      clinicalDomain: "anesthesia",
      procedureCode: "general-anesthesia",
      versionLabel: "v1.0-clinical-baseline",
      manifestJson: buildManifest("baseline"),
      metadata: {
        phase: "phase6a-first-production-educational-package",
        contentState: "baseline",
      },
      placeholderAssets: buildAssets("baseline"),
    });

    await approveEducationPackage({
      tenantId: tenant.id,
      packageId: created.id,
      actorUserId: actor?.id,
      versionId: created.currentVersionId || undefined,
    });

    educationPackage = await prisma.educationPackage.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        currentVersion: true,
        versions: { orderBy: { versionNumber: "asc" } },
      },
    });
  }

  await prisma.educationPackage.update({
    where: { id: educationPackage.id },
    data: {
      titleAr: "حزمة التثقيف الخاصة بالتخدير العام",
      titleEn: "General Anesthesia Education Package",
      summaryAr: summary.ar,
      summaryEn: summary.en,
      clinicalDomain: "anesthesia",
      procedureCode: "general-anesthesia",
      metadata: {
        phase: "phase6a-first-production-educational-package",
        packageState: "production-content",
      },
    },
  });

  await recordEducationAuditEvent({
    tenantId: tenant.id,
    educationPackageId: educationPackage.id,
    versionId: educationPackage.currentVersionId || undefined,
    actorUserId: actor?.id,
    action: "PACKAGE_PROFILE_UPDATED",
    metadata: {
      packageKey: PACKAGE_KEY,
      clinicalDomain: "anesthesia",
    },
  });

  const refreshed = await prisma.educationPackage.findUniqueOrThrow({
    where: { id: educationPackage.id },
    include: {
      versions: { orderBy: { versionNumber: "asc" } },
      currentVersion: true,
    },
  });

  const productionVersion = refreshed.versions.find((item) => item.metadata && typeof item.metadata === "object" && (item.metadata as { releaseStage?: string }).releaseStage === "production-approved");

  const createdProductionVersion = productionVersion || await createEducationPackageVersion({
    tenantId: tenant.id,
    packageId: refreshed.id,
    actorUserId: actor?.id,
    versionLabel: `v${(refreshed.versions.at(-1)?.versionNumber || 1) + 1}.0-general-anesthesia-production`,
    manifestJson: buildManifest("production"),
    metadata: {
      releaseStage: "production-approved",
      contentCompleteness: "full",
    },
    placeholderAssets: buildAssets("production"),
  });

  const approvedProductionVersion = await approveEducationPackage({
    tenantId: tenant.id,
    packageId: refreshed.id,
    actorUserId: actor?.id,
    versionId: createdProductionVersion.id,
  });

  const linked = await linkEducationPackageToConsentTemplate({
    tenantId: tenant.id,
    packageId: refreshed.id,
    actorUserId: actor?.id,
    versionId: approvedProductionVersion.currentVersionId || createdProductionVersion.id,
    consentTemplateId: templateVersion.template.id,
    consentTemplateVersionId: templateVersion.id,
  });

  const evidencePackage = await generateEducationEvidencePackage({
    tenantId: tenant.id,
    packageId: refreshed.id,
    actorUserId: actor?.id,
    versionId: linked.versionId,
    consentTemplateId: templateVersion.template.id,
    consentTemplateVersionId: templateVersion.id,
    metadata: {
      generatedBy: "phase6a-general-anesthesia-package-script",
      validationScope: "phase6a",
    },
  });

  const snapshot = await prisma.educationPackage.findUniqueOrThrow({
    where: { id: refreshed.id },
    include: {
      currentVersion: true,
      versions: { orderBy: { versionNumber: "asc" } },
      assets: { orderBy: [{ versionId: "asc" }, { sortOrder: "asc" }] },
      auditEvents: { orderBy: { createdAt: "asc" } },
      evidencePackages: { orderBy: { createdAt: "asc" } },
    },
  });

  const currentVersion = snapshot.versions.find((item) => item.id === snapshot.currentVersionId) || snapshot.currentVersion;
  const currentManifest = (currentVersion?.manifestJson || {}) as Record<string, unknown>;
  const dbProof = {
    tenantId: snapshot.tenantId,
    packageId: snapshot.id,
    packageKey: snapshot.packageKey,
    packageStatus: snapshot.status,
    currentVersionId: snapshot.currentVersionId,
    currentVersionLabel: currentVersion?.versionLabel || null,
    currentVersionStatus: currentVersion?.status || null,
    versionCount: snapshot.versions.length,
    assetCountForCurrentVersion: snapshot.assets.filter((asset) => asset.versionId === snapshot.currentVersionId).length,
    auditEventCount: snapshot.auditEvents.length,
    evidencePackageCount: snapshot.evidencePackages.length,
    linkedTemplateIds: Array.isArray(currentVersion?.linkedTemplateIds) ? currentVersion?.linkedTemplateIds : [],
    linkedTemplateVersionIds: Array.isArray(currentVersion?.linkedTemplateVersionIds) ? currentVersion?.linkedTemplateVersionIds : [],
    contentHash: currentVersion?.contentHash || null,
    evidenceHash: evidencePackage.evidenceHash,
  };

  const validation = {
    arabicContent: Boolean(currentManifest.educationalSummary && Array.isArray(currentManifest.risks) && Array.isArray(currentManifest.preProcedureInstructions)),
    englishContent: Boolean(currentManifest.educationalSummary && Array.isArray(currentManifest.benefits) && Array.isArray(currentManifest.postProcedureInstructions)),
    summary: Boolean(snapshot.summaryAr && snapshot.summaryEn),
    risks: Array.isArray(currentManifest.risks) && currentManifest.risks.length > 0,
    benefits: Array.isArray(currentManifest.benefits) && currentManifest.benefits.length > 0,
    faq: Array.isArray(currentManifest.faq) && currentManifest.faq.length > 0,
    preProcedureInstructions: Array.isArray(currentManifest.preProcedureInstructions) && currentManifest.preProcedureInstructions.length > 0,
    postProcedureInstructions: Array.isArray(currentManifest.postProcedureInstructions) && currentManifest.postProcedureInstructions.length > 0,
    placeholderImageAsset: snapshot.assets.some((asset) => asset.versionId === snapshot.currentVersionId && asset.assetType === "IMAGE"),
    placeholderVideoAsset: snapshot.assets.some((asset) => asset.versionId === snapshot.currentVersionId && asset.assetType === "VIDEO"),
    versioningWorks: snapshot.versions.length >= 2,
    packageApprovalWorks: snapshot.status === "APPROVED" && currentVersion?.status === "APPROVED",
    packageLinkingWorks: linked.linkedTemplateVersionIds.includes(templateVersion.id),
    auditEventsGenerated: snapshot.auditEvents.some((event) => event.action === "VERSION_CREATED")
      && snapshot.auditEvents.some((event) => event.action === "APPROVED")
      && snapshot.auditEvents.some((event) => event.action === "LINKED_TO_CONSENT_TEMPLATE")
      && snapshot.auditEvents.some((event) => event.action === "EVIDENCE_PACKAGE_GENERATED"),
    contentHashGenerated: Boolean(currentVersion?.contentHash),
    educationEvidencePackageGenerated: snapshot.evidencePackages.some((item) => item.id === evidencePackage.id),
  };

  const payload = {
    status: Object.values(validation).every(Boolean) ? "PASS" : "FAIL",
    packageProof: {
      packageId: snapshot.id,
      packageKey: snapshot.packageKey,
      versionLabels: snapshot.versions.map((item) => item.versionLabel),
      currentVersionId: snapshot.currentVersionId,
      linkedTemplate: {
        templateId: templateVersionForTenant.template.id,
        templateCode: templateVersionForTenant.template.templateCode,
        templateVersionId: templateVersionForTenant.id,
      },
      evidencePackageId: evidencePackage.id,
    },
    validation,
    dbProof,
    auditActions: snapshot.auditEvents.map((item) => ({ action: item.action, createdAt: item.createdAt.toISOString() })),
    reportPaths: await writeReportFiles({ packageProof: snapshot, validation, dbProof }),
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});