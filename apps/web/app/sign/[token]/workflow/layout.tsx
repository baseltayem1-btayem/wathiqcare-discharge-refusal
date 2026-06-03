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

            .patient-workflow-responsive-root,
            .patient-workflow-responsive-root * {
              box-sizing: border-box;
            }

            .patient-workflow-responsive-root main,
            .patient-workflow-responsive-root section,
            .patient-workflow-responsive-root article,
            .patient-workflow-responsive-root form {
              max-width: none !important;
            }

            .patient-workflow-responsive-root img,
            .patient-workflow-responsive-root svg {
              max-width: 100%;
              height: auto;
            }

            .patient-workflow-responsive-root button,
            .patient-workflow-responsive-root input,
            .patient-workflow-responsive-root textarea,
            .patient-workflow-responsive-root select {
              max-width: 100%;
            }

            @media (max-width: 767px) {
              .patient-workflow-responsive-root {
                padding-inline: 10px;
              }

              .patient-workflow-responsive-root [class*="max-w-"],
              .patient-workflow-responsive-root [class*="w-["] {
                width: 100% !important;
                max-width: 100% !important;
              }

              .patient-workflow-responsive-root [class*="px-"],
              .patient-workflow-responsive-root [class*="p-"] {
                max-width: 100% !important;
              }
            }

            @media (min-width: 768px) and (max-width: 1199px) {
              .patient-workflow-responsive-root {
                padding-inline: 24px;
              }

              .patient-workflow-responsive-root [class*="max-w-sm"],
              .patient-workflow-responsive-root [class*="max-w-md"],
              .patient-workflow-responsive-root [class*="max-w-lg"],
              .patient-workflow-responsive-root [class*="max-w-xl"],
              .patient-workflow-responsive-root [class*="max-w-2xl"],
              .patient-workflow-responsive-root [class*="w-[320"],
              .patient-workflow-responsive-root [class*="w-[360"],
              .patient-workflow-responsive-root [class*="w-[380"],
              .patient-workflow-responsive-root [class*="w-[400"],
              .patient-workflow-responsive-root [class*="w-[420"],
              .patient-workflow-responsive-root [class*="w-[480"],
              .patient-workflow-responsive-root [class*="max-w-[320"],
              .patient-workflow-responsive-root [class*="max-w-[360"],
              .patient-workflow-responsive-root [class*="max-w-[380"],
              .patient-workflow-responsive-root [class*="max-w-[400"],
              .patient-workflow-responsive-root [class*="max-w-[420"],
              .patient-workflow-responsive-root [class*="max-w-[480"] {
                width: min(94vw, 760px) !important;
                max-width: min(94vw, 760px) !important;
              }
            }

            @media (min-width: 1200px) {
              .patient-workflow-responsive-root {
                padding-inline: 32px;
              }

              .patient-workflow-responsive-root [class*="max-w-sm"],
              .patient-workflow-responsive-root [class*="max-w-md"],
              .patient-workflow-responsive-root [class*="max-w-lg"],
              .patient-workflow-responsive-root [class*="max-w-xl"],
              .patient-workflow-responsive-root [class*="max-w-2xl"],
              .patient-workflow-responsive-root [class*="max-w-3xl"],
              .patient-workflow-responsive-root [class*="w-[320"],
              .patient-workflow-responsive-root [class*="w-[360"],
              .patient-workflow-responsive-root [class*="w-[380"],
              .patient-workflow-responsive-root [class*="w-[400"],
              .patient-workflow-responsive-root [class*="w-[420"],
              .patient-workflow-responsive-root [class*="w-[480"],
              .patient-workflow-responsive-root [class*="w-[520"],
              .patient-workflow-responsive-root [class*="max-w-[320"],
              .patient-workflow-responsive-root [class*="max-w-[360"],
              .patient-workflow-responsive-root [class*="max-w-[380"],
              .patient-workflow-responsive-root [class*="max-w-[400"],
              .patient-workflow-responsive-root [class*="max-w-[420"],
              .patient-workflow-responsive-root [class*="max-w-[480"],
              .patient-workflow-responsive-root [class*="max-w-[520"] {
                width: min(92vw, 960px) !important;
                max-width: min(92vw, 960px) !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
