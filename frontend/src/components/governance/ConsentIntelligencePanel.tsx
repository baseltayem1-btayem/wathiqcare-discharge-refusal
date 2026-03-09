type ConsentIntelligencePanelProps = {
  requiredConsents: string[];
  recommendedConsents: string[];
  missingConsents: string[];
  expiredConsents: string[];
};

export default function ConsentIntelligencePanel(props: ConsentIntelligencePanelProps) {
  const sections: Array<{ title: string; items: string[] }> = [
    { title: "Required Consents", items: props.requiredConsents },
    { title: "Recommended Consents", items: props.recommendedConsents },
    { title: "Missing Consents", items: props.missingConsents },
    { title: "Expired Consents", items: props.expiredConsents },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Consent Intelligence</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-800">{section.title}</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {section.items.length === 0 ? <li>-</li> : section.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
