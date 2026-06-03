import type React from "react";

export default function SignWorkflowResponsiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="patient-workflow-responsive-root">
      {children}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .patient-workflow-responsive-root {
              width: 100%;
              min-height: 100vh;
            }

            .patient-workflow-responsive-root main,
            .patient-workflow-responsive-root section {
              width: 100%;
              max-width: none;
            }

            .patient-workflow-responsive-root img,
            .patient-workflow-responsive-root svg {
              max-width: 100%;
              height: auto;
            }

            .patient-workflow-responsive-root button,
            .patient-workflow-responsive-root input {
              max-width: 100%;
            }

            @media (max-width: 767px) {
              .patient-workflow-responsive-root {
                padding-inline: 12px;
              }

              .patient-workflow-responsive-root [class*="max-w-sm"],
              .patient-workflow-responsive-root [class*="max-w-md"],
              .patient-workflow-responsive-root [class*="max-w-[320"],
              .patient-workflow-responsive-root [class*="max-w-[360"],
              .patient-workflow-responsive-root [class*="max-w-[380"],
              .patient-workflow-responsive-root [class*="max-w-[400"] {
                width: 100% !important;
                max-width: 100% !important;
              }
            }

            @media (min-width: 768px) and (max-width: 1023px) {
              .patient-workflow-responsive-root [class*="max-w-sm"],
              .patient-workflow-responsive-root [class*="max-w-md"],
              .patient-workflow-responsive-root [class*="max-w-lg"],
              .patient-workflow-responsive-root [class*="max-w-xl"],
              .patient-workflow-responsive-root [class*="max-w-[320"],
              .patient-workflow-responsive-root [class*="max-w-[360"],
              .patient-workflow-responsive-root [class*="max-w-[380"],
              .patient-workflow-responsive-root [class*="max-w-[400"] {
                width: min(92vw, 680px) !important;
                max-width: min(92vw, 680px) !important;
              }
            }

            @media (min-width: 1024px) {
              .patient-workflow-responsive-root [class*="max-w-sm"],
              .patient-workflow-responsive-root [class*="max-w-md"],
              .patient-workflow-responsive-root [class*="max-w-lg"],
              .patient-workflow-responsive-root [class*="max-w-xl"],
              .patient-workflow-responsive-root [class*="max-w-2xl"],
              .patient-workflow-responsive-root [class*="max-w-[320"],
              .patient-workflow-responsive-root [class*="max-w-[360"],
              .patient-workflow-responsive-root [class*="max-w-[380"],
              .patient-workflow-responsive-root [class*="max-w-[400"],
              .patient-workflow-responsive-root [class*="max-w-[480"] {
                width: min(92vw, 760px) !important;
                max-width: min(92vw, 760px) !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
