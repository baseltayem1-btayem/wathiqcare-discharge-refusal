import type React from "react";

export default function SignWorkflowResponsiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="patient-enterprise-workflow">
      {children}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .patient-enterprise-workflow {
              width: 100%;
              min-height: 100vh;
              background:
                radial-gradient(circle at top left, rgba(75, 156, 211, 0.10), transparent 32%),
                radial-gradient(circle at top right, rgba(201, 161, 59, 0.08), transparent 28%),
                linear-gradient(180deg, #f7fbff 0%, #eef4fa 100%);
              color: #002b5c;
            }

            .patient-enterprise-workflow,
            .patient-enterprise-workflow * {
              box-sizing: border-box;
            }

            .patient-enterprise-workflow [class*="min-h-screen"] {
              min-height: 100vh !important;
              width: 100% !important;
              display: flex !important;
              align-items: flex-start !important;
              justify-content: center !important;
              padding: 32px 20px !important;
            }

            .patient-enterprise-workflow main,
            .patient-enterprise-workflow section,
            .patient-enterprise-workflow article,
            .patient-enterprise-workflow form {
              width: 100% !important;
              max-width: none !important;
            }

            .patient-enterprise-workflow [class*="scale-"],
            .patient-enterprise-workflow [style*="scale"],
            .patient-enterprise-workflow [style*="zoom"] {
              transform: none !important;
              zoom: 1 !important;
            }

            .patient-enterprise-workflow [class*="max-w-sm"],
            .patient-enterprise-workflow [class*="max-w-md"],
            .patient-enterprise-workflow [class*="max-w-lg"],
            .patient-enterprise-workflow [class*="max-w-xl"],
            .patient-enterprise-workflow [class*="max-w-2xl"],
            .patient-enterprise-workflow [class*="max-w-3xl"],
            .patient-enterprise-workflow [class*="max-w-[320"],
            .patient-enterprise-workflow [class*="max-w-[360"],
            .patient-enterprise-workflow [class*="max-w-[380"],
            .patient-enterprise-workflow [class*="max-w-[400"],
            .patient-enterprise-workflow [class*="max-w-[420"],
            .patient-enterprise-workflow [class*="max-w-[480"],
            .patient-enterprise-workflow [class*="max-w-[520"],
            .patient-enterprise-workflow [class*="max-w-[600"],
            .patient-enterprise-workflow [class*="w-[320"],
            .patient-enterprise-workflow [class*="w-[360"],
            .patient-enterprise-workflow [class*="w-[380"],
            .patient-enterprise-workflow [class*="w-[400"],
            .patient-enterprise-workflow [class*="w-[420"],
            .patient-enterprise-workflow [class*="w-[480"],
            .patient-enterprise-workflow [class*="w-[520"],
            .patient-enterprise-workflow [class*="w-[600"] {
              width: min(94vw, 1040px) !important;
              max-width: min(94vw, 1040px) !important;
            }

            .patient-enterprise-workflow input,
            .patient-enterprise-workflow textarea,
            .patient-enterprise-workflow select,
            .patient-enterprise-workflow button {
              max-width: 100% !important;
            }

            .patient-enterprise-workflow button {
              min-height: 48px;
              font-weight: 700;
            }

            .patient-enterprise-workflow img {
              max-width: 100%;
              height: auto;
              object-fit: contain;
            }

            @media (max-width: 767px) {
              .patient-enterprise-workflow [class*="min-h-screen"] {
                padding: 16px 10px !important;
              }

              .patient-enterprise-workflow [class*="max-w-"],
              .patient-enterprise-workflow [class*="w-["] {
                width: 100% !important;
                max-width: 100% !important;
              }

              .patient-enterprise-workflow button {
                width: 100% !important;
              }
            }

            @media (min-width: 768px) and (max-width: 1199px) {
              .patient-enterprise-workflow [class*="min-h-screen"] {
                padding: 28px 20px !important;
              }

              .patient-enterprise-workflow [class*="max-w-"],
              .patient-enterprise-workflow [class*="w-["] {
                width: min(94vw, 820px) !important;
                max-width: min(94vw, 820px) !important;
              }
            }

            @media (min-width: 1200px) {
              .patient-enterprise-workflow [class*="min-h-screen"] {
                padding: 36px 32px !important;
              }

              .patient-enterprise-workflow [class*="max-w-"],
              .patient-enterprise-workflow [class*="w-["] {
                width: min(92vw, 1040px) !important;
                max-width: min(92vw, 1040px) !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
