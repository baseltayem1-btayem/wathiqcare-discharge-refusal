type RequiredConsentsPanelProps = {
  requiredConsents: string[];
};

export default function RequiredConsentsPanel({ requiredConsents }: RequiredConsentsPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Required Consents</h3>
      <ul className="mt-3 space-y-1 text-sm text-slate-700">
        {requiredConsents.length === 0 ? <li>-</li> : requiredConsents.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
