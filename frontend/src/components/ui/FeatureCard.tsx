import { type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
  href?: string;
  gradient?: string;
};

export default function FeatureCard({ 
  icon, 
  title, 
  description, 
  badge,
  href,
  gradient = "from-slate-50 to-slate-100"
}: FeatureCardProps) {
  const content = (
    <>
      <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} border border-slate-200/80 shadow-sm`}>
        {icon}
      </div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {badge && (
          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{description}</p>
      {href && (
        <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-slate-900">
          <span>Learn more</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="group block rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
      >
        {content}
      </a>
    );
  }

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      {content}
    </article>
  );
}
