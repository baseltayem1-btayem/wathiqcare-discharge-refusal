import type {
  DynamicConsentAlternativeItem,
  DynamicConsentRiskItem,
  DynamicConsentSection,
  DynamicConsentTemplateDefinition,
} from "@/modules/consent-engine/engine/types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPatientEducationSection(section: DynamicConsentSection): string {
  return `
    <section class="dc-section dc-layer-${section.layer} dc-kind-patient-education">
      <header>
        <h2>${escapeHtml(section.titleEn)}</h2>
        <h3 dir="rtl">${escapeHtml(section.titleAr)}</h3>
      </header>
      <div class="dc-pe-summary">
        <p>${escapeHtml(section.bodyEn)}</p>
        <p dir="rtl">${escapeHtml(section.bodyAr)}</p>
      </div>
    </section>
  `;
}

function renderFaqSection(section: DynamicConsentSection): string {
  const items = section.meta?.faqItems ?? [];
  const accordion = items
    .map(
      (item) => `
      <details class="dc-faq-item" data-faq-id="${escapeHtml(item.id)}">
        <summary>
          <span>${escapeHtml(item.en.question)}</span>
          <span dir="rtl">${escapeHtml(item.ar.question)}</span>
        </summary>
        <div class="dc-faq-answer">
          <p>${escapeHtml(item.en.answer)}</p>
          <p dir="rtl">${escapeHtml(item.ar.answer)}</p>
        </div>
      </details>
    `,
    )
    .join("\n");
  return `
    <section class="dc-section dc-layer-${section.layer} dc-kind-faq">
      <header>
        <h2>${escapeHtml(section.titleEn)}</h2>
        <h3 dir="rtl">${escapeHtml(section.titleAr)}</h3>
      </header>
      <div class="dc-faq-list">${accordion}</div>
    </section>
  `;
}

function renderUnderstandingCheckSection(section: DynamicConsentSection): string {
  const questions = section.meta?.understandingQuestions ?? [];
  const scoring = section.meta?.scoring;
  const items = questions
    .map((q) => {
      const options = Object.entries(q.en.options)
        .map(
          ([key, label]) => `
        <label class="dc-uq-option">
          <input type="radio" name="uq-${escapeHtml(q.id)}" value="${escapeHtml(key)}" data-correct="${escapeHtml(q.correctOption)}" />
          <span>${escapeHtml(key)}. ${escapeHtml(label)}</span>
          <span dir="rtl">${escapeHtml(key)}. ${escapeHtml(q.ar.options[key] ?? "")}</span>
        </label>
      `,
        )
        .join("\n");
      return `
        <fieldset class="dc-uq-item" data-uq-id="${escapeHtml(q.id)}" data-weight="${q.weight}">
          <legend>
            <span>${escapeHtml(q.en.question)}</span>
            <span dir="rtl">${escapeHtml(q.ar.question)}</span>
          </legend>
          <div class="dc-uq-options">${options}</div>
        </fieldset>
      `;
    })
    .join("\n");
  const scoringMeta = scoring
    ? `<p class="dc-uq-scoring">Passing score: ${scoring.passingScore}% &mdash; Max: ${scoring.maxScore} pts</p>`
    : "";
  return `
    <section class="dc-section dc-layer-${section.layer} dc-kind-understanding-check">
      <header>
        <h2>${escapeHtml(section.titleEn)}</h2>
        <h3 dir="rtl">${escapeHtml(section.titleAr)}</h3>
      </header>
      ${scoringMeta}
      <form class="dc-uq-form" data-uq-form>${items}</form>
    </section>
  `;
}

function renderSection(section: DynamicConsentSection): string {
  if (section.kind === "patient-education") {
    return renderPatientEducationSection(section);
  }
  if (section.kind === "faq") {
    return renderFaqSection(section);
  }
  if (section.kind === "understanding-check") {
    return renderUnderstandingCheckSection(section);
  }
  return `
    <section class="dc-section dc-layer-${section.layer}">
      <header>
        <h2>${escapeHtml(section.titleEn)}</h2>
        <h3 dir="rtl">${escapeHtml(section.titleAr)}</h3>
      </header>
      <div class="dc-copy-grid">
        <p>${escapeHtml(section.bodyEn)}</p>
        <p dir="rtl">${escapeHtml(section.bodyAr)}</p>
      </div>
    </section>
  `;
}

function renderRisk(risk: DynamicConsentRiskItem): string {
  return `
    <li>
      <strong>${escapeHtml(risk.titleEn)}</strong>
      <span>(${escapeHtml(risk.severity)})</span>
      <p>${escapeHtml(risk.descriptionEn)}</p>
      <p dir="rtl">${escapeHtml(risk.descriptionAr)}</p>
    </li>
  `;
}

function renderAlternative(item: DynamicConsentAlternativeItem): string {
  return `
    <li>
      <p>${escapeHtml(item.textEn)}</p>
      <p dir="rtl">${escapeHtml(item.textAr)}</p>
    </li>
  `;
}

export function renderDynamicConsentHtml(input: {
  template: DynamicConsentTemplateDefinition;
  sections: DynamicConsentSection[];
  risks: DynamicConsentRiskItem[];
  alternatives: DynamicConsentAlternativeItem[];
  generatedAt: string;
}): string {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(input.template.displayNameEn)}</title>
      <style>
        body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; background: #f5f7fb; color: #0f172a; }
        main { max-width: 1100px; margin: 0 auto; padding: 32px; }
        .dc-shell { background: #ffffff; border: 1px solid #dbe2ea; border-radius: 24px; padding: 28px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); }
        .dc-header { display: grid; gap: 8px; margin-bottom: 24px; }
        .dc-meta { color: #475569; font-size: 14px; }
        .dc-section { border-top: 1px solid #e2e8f0; padding-top: 18px; margin-top: 18px; }
        .dc-copy-grid { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }
        .dc-risk-list, .dc-alt-list { display: grid; gap: 12px; padding-left: 20px; }
      </style>
    </head>
    <body>
      <main>
        <div class="dc-shell">
          <header class="dc-header">
            <div class="dc-meta">Experimental Dynamic Consent Engine</div>
            <h1>${escapeHtml(input.template.displayNameEn)}</h1>
            <h2 dir="rtl">${escapeHtml(input.template.displayNameAr)}</h2>
            <div class="dc-meta">Generated at ${escapeHtml(input.generatedAt)}</div>
          </header>
          ${input.sections.map((item) => renderSection(item)).join("\n")}
          <section class="dc-section">
            <header>
              <h2>Risks</h2>
              <h3 dir="rtl">المخاطر</h3>
            </header>
            <ul class="dc-risk-list">${input.risks.map((item) => renderRisk(item)).join("\n")}</ul>
          </section>
          <section class="dc-section">
            <header>
              <h2>Alternatives</h2>
              <h3 dir="rtl">البدائل</h3>
            </header>
            <ul class="dc-alt-list">${input.alternatives.map((item) => renderAlternative(item)).join("\n")}</ul>
          </section>
        </div>
      </main>
    </body>
  </html>`;
}