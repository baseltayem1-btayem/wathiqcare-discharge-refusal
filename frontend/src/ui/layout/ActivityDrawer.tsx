"use client";

import { useState } from "react";
import { Activity, X } from "lucide-react";

const activityFeed = [
  "Consent package generated for Case #1048",
  "ROI request pending hospital signature",
  "Archive indexing retry succeeded",
];

export default function ActivityDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 z-30 rounded-full bg-[var(--ui-primary)] p-3 text-white shadow-xl ltr:right-5 rtl:left-5"
      >
        <Activity className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 bg-slate-950/35" onClick={() => setOpen(false)}>
          <aside
            className="absolute top-0 h-full w-full max-w-sm bg-white p-4 shadow-2xl ltr:right-0 rtl:left-0"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--ui-text)]">Activity Drawer</h2>
              <button type="button" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="space-y-2">
              {activityFeed.map((item) => (
                <li key={item} className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3 text-sm text-[var(--ui-text)]">
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : null}
    </>
  );
}
