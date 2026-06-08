import { PhysicianConsentWorkflow } from "@/components/informed-consents/enterprise-workflow/PhysicianConsentWorkflow";

type FinalInformedConsentsModuleProps = {
  auth?: {
    role?: string | null;
    platform_role?: string | null;
    userId?: string | null;
    email?: string | null;
    name?: string | null;
    tenantId?: string | null;
  };
};

export function FinalInformedConsentsModule({ auth }: FinalInformedConsentsModuleProps) {
  return <PhysicianConsentWorkflow auth={auth} />;
}

export default FinalInformedConsentsModule;
