"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function HomeHealthcareAgreementRedirect() {
    const params = useParams();
    const caseId = params?.id || "";
    const router = useRouter();
    useEffect(() => {
        if (caseId) {
            router.replace(`/cases/${caseId}`);
        }
    }, [caseId, router]);
    return null;
}
