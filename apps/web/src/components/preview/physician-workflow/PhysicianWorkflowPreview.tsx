"use client";

import { ApprovedPhysicianDashboard } from "@/components/approved-design/physician/ApprovedPhysicianDashboard";

export default function PhysicianWorkflowPreview() {
  return <ApprovedPhysicianDashboard currentUser={{ name: "Physician", role: "Physician" }} />;
}
