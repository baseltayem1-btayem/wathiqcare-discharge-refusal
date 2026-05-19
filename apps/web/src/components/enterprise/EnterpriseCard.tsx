"use client";

import type { ReactNode } from "react";
import EnterpriseSectionHeader, {
  type EnterpriseSectionHeaderProps,
} from "./EnterpriseSectionHeader";

export type EnterpriseCardProps = {
  header?: EnterpriseSectionHeaderProps;
  children: ReactNode;
  padded?: boolean;
  testId?: string;
};

export default function EnterpriseCard({
  header,
  children,
  padded = true,
  testId,
}: EnterpriseCardProps) {
  return (
    <section
      className="wc-ent-card"
      style={{ border: "var(--wc-ent-border)" }}
      data-testid={testId ?? "enterprise-card"}
    >
      {header ? (
        <div className="px-3 pt-2">
          <EnterpriseSectionHeader {...header} />
        </div>
      ) : null}
      <div className={padded ? "p-3" : ""}>{children}</div>
    </section>
  );
}
