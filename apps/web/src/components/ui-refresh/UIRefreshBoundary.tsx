"use client";

/**
 * UIRefreshBoundary
 * ------------------------------------------------------------
 * Wraps a subtree with the v1.1 design-token scope when
 * FEATURE_UI_REFRESH_V1_1 is enabled. When the flag is off
 * the wrapper renders a pass-through fragment, so the legacy
 * DOM (and therefore every existing behavioural test, OTP
 * flow, signing workflow, audit chain, evidence generator,
 * secure-link validator, and API contract) is unchanged.
 *
 * This component is intentionally presentation-only:
 *   - Does NOT touch state, props, or render order of children.
 *   - Does NOT alter the React tree shape when disabled.
 *   - Adds a single <div data-ui-refresh="v1.1"> when enabled.
 *
 * Token CSS is imported as a side-effect so the variables are
 * loaded once per route; selectors are scoped to the data
 * attribute and have no global effect.
 */

import type { ReactNode } from "react";
import {
  FEATURE_UI_REFRESH_V1_1,
  UI_REFRESH_ATTR_VALUE,
} from "@/lib/config/ui-refresh-flag";
import "@/styles/ui-refresh-v1.1.css";

type Surface = "issuance" | "public-signing";

type Props = {
  /** Logical surface name — used as a data-* hint for QA/devtools. */
  surface: Surface;
  children: ReactNode;
};

export default function UIRefreshBoundary({ surface, children }: Props) {
  if (!FEATURE_UI_REFRESH_V1_1) {
    return <>{children}</>;
  }
  return (
    <div data-ui-refresh={UI_REFRESH_ATTR_VALUE} data-ui-surface={surface}>
      {children}
    </div>
  );
}
