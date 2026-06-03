import type React from "react";

export default function SignWorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top_left,rgba(75,156,211,0.12),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#edf4fb_100%)]">
      {children}
    </div>
  );
}
