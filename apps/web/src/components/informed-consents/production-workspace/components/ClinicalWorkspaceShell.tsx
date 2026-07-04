"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Container, Grid, Stack } from "@/components/design-system";

interface ClinicalWorkspaceShellProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  contextBar: ReactNode;
  actionRail: ReactNode;
  children: ReactNode;
  sidebar: ReactNode;
  showPrototypeBanner?: boolean;
  showPreviewBadge?: boolean;
}

export function ClinicalWorkspaceShell({
  title,
  subtitle,
  eyebrow = "Clinical Workspace",
  contextBar,
  actionRail,
  children,
  sidebar,
  showPrototypeBanner = false,
  showPreviewBadge = true,
}: ClinicalWorkspaceShellProps) {
  return (
    <div className="workspace-root">
      {showPrototypeBanner && (
        <div className="workspace-prototype-banner">
          <span>Prototype — Clinical Workspace 2.0. Not for clinical use.</span>
        </div>
      )}

      {/* Top header */}
      <header className="workspace-header">
        <Container as="div" size="full" className="!px-0">
          <Stack direction="row" align="start" justify="between" wrap className="gap-4">
            <div>
              <div className="workspace-header__eyebrow">{eyebrow}</div>
              <h1 className="workspace-header__title">{title}</h1>
              <p className="workspace-header__subtitle">{subtitle}</p>
            </div>
            {showPreviewBadge && (
              <div className="workspace-header__badge">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Decision-support preview</span>
              </div>
            )}
          </Stack>
        </Container>
      </header>

      {/* Context bar */}
      {contextBar}

      {/* Action rail */}
      {actionRail}

      {/* Main content */}
      <main className="workspace-main">
        <Container as="div" size="full" className="!px-0">
          <Grid cols={1} gap={6} responsive={{ lg: 3 }}>
            <div className="lg:col-span-2 space-y-6">{children}</div>
            <div className="space-y-6">{sidebar}</div>
          </Grid>
        </Container>
      </main>
    </div>
  );
}
