"use client";

type SkeletonBlockProps = {
  className: string;
};

function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

export function SkeletonHeader() {
  return (
    <div className="space-y-2">
      <SkeletonBlock className="h-7 w-56" />
      <SkeletonBlock className="h-4 w-80 max-w-full" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="space-y-3">
        <SkeletonBlock className="h-5 w-40" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-sm)]">
      <div className="min-w-[640px] p-4">
        <div className="mb-3 grid grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={`header-${index}`} className="h-3 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="grid grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((__, colIndex) => (
                <SkeletonBlock key={`cell-${rowIndex}-${colIndex}`} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
