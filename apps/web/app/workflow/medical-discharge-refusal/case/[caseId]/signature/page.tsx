"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function RefusalFormSignatureRedirectPage() {
  const { caseId } = useParams<{ caseId: string }>();

  useEffect(() => {
    if (!caseId) return;
    window.location.href = `/cases/${caseId}/refusal-form`;
  }, [caseId]);

  return null;
}
