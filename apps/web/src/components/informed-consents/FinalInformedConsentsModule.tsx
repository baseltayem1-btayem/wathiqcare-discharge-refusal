"use client";

import { ProductionPhysicianWorkspace } from "@/components/informed-consents/production-workspace/ProductionPhysicianWorkspace";
import type { PhysicianContext } from "@/components/informed-consents/production-workspace/types";

type FinalInformedConsentsModuleProps = {
  auth?: {
    sub?: string;
    email?: string | null;
    role?: string | null;
    platform_role?: string | null;
    name?: string | null;
    tenant_id?: string;
  };
};

export function FinalInformedConsentsModule({ auth }: FinalInformedConsentsModuleProps) {
  const physician: PhysicianContext = {
    userId: auth?.sub || "",
    email: auth?.email || "",
    name: auth?.name || auth?.email || "Physician",
    role: auth?.role,
    platformRole: auth?.platform_role,
    tenantId: auth?.tenant_id || "",
  };

  return (
    <div className="relative">
      <ProductionPhysicianWorkspace physician={physician} />
    </div>
  );
}

export default FinalInformedConsentsModule;
