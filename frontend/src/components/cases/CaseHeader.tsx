"use client";

type CaseHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function CaseHeader({ title, subtitle }: CaseHeaderProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
    </section>
  );
}
