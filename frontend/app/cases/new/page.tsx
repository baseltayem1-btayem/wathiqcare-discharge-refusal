"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useCreateCaseMutation } from "@/lib/hooks/use-cases";
import {
    useDepartmentsQuery,
    useEncountersQuery,
    useFacilitiesQuery,
    usePatientsQuery,
} from "@/lib/hooks/use-reference";

const createCaseSchema = z.object({
    facilityId: z.string().min(1, "Facility is required"),
    departmentId: z.string().min(1, "Department is required"),
    patientId: z.string().min(1, "Patient is required"),
    encounterId: z.string().min(1, "Encounter is required"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    summary: z.string().max(1000, "Summary is too long").optional(),
});

type CreateCaseFormValues = z.infer<typeof createCaseSchema>;

function displayName(value?: string | null, fallback = "-") {
    if (!value || !value.trim()) {
        return fallback;
    }
    return value;
}

export default function NewCasePage() {
    const router = useRouter();
    const [patientSearch, setPatientSearch] = useState("");

    const form = useForm<CreateCaseFormValues>({
        resolver: zodResolver(createCaseSchema),
        defaultValues: {
            facilityId: "",
            departmentId: "",
            patientId: "",
            encounterId: "",
            priority: "MEDIUM",
            summary: "",
        },
    });

    const selectedFacilityId = form.watch("facilityId");
    const selectedPatientId = form.watch("patientId");

    const facilitiesQuery = useFacilitiesQuery(true);
    const departmentsQuery = useDepartmentsQuery(selectedFacilityId, Boolean(selectedFacilityId));
    const patientsQuery = usePatientsQuery(patientSearch, true);
    const encountersQuery = useEncountersQuery(true);

    const createCaseMutation = useCreateCaseMutation();

    const availableEncounters = useMemo(() => {
        const list = encountersQuery.data?.items || [];
        if (!selectedPatientId) {
            return list;
        }
        return list.filter((item) => item.patientId === selectedPatientId);
    }, [encountersQuery.data?.items, selectedPatientId]);

    async function onSubmit(values: CreateCaseFormValues) {
        const created = await createCaseMutation.mutateAsync({
            caseType: "DISCHARGE_REFUSAL",
            facilityId: values.facilityId,
            departmentId: values.departmentId,
            patientId: values.patientId,
            encounterId: values.encounterId,
            priority: values.priority,
            summary: values.summary?.trim() || undefined,
        });

        router.push(`/cases/${created.id}`);
    }

    return (
        <AuthGuard>
            <AppShell
                title="Create Refusal Case | إنشاء حالة رفض خروج"
                subtitle="Linked to real facility/department/patient/encounter records from backend-nest"
                actions={
                    <Link
                        href="/cases"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to case list
                    </Link>
                }
            >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="text-sm font-semibold text-slate-900">Case linking</h2>
                        <p className="mt-1 text-xs text-slate-500">
                            A refusal case must link to valid facility, department, patient, and encounter entities.
                        </p>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Facility</label>
                                <select
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    {...form.register("facilityId")}
                                >
                                    <option value="">Select facility</option>
                                    {(facilitiesQuery.data || []).map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {displayName(item.nameAr || item.nameEn)}
                                        </option>
                                    ))}
                                </select>
                                {form.formState.errors.facilityId ? (
                                    <p className="mt-1 text-xs text-red-700">{form.formState.errors.facilityId.message}</p>
                                ) : null}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Department</label>
                                <select
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    {...form.register("departmentId")}
                                    disabled={!selectedFacilityId}
                                >
                                    <option value="">Select department</option>
                                    {(departmentsQuery.data || []).map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {displayName(item.nameAr || item.nameEn)}
                                        </option>
                                    ))}
                                </select>
                                {form.formState.errors.departmentId ? (
                                    <p className="mt-1 text-xs text-red-700">{form.formState.errors.departmentId.message}</p>
                                ) : null}
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-slate-600">Patient search</label>
                                <input
                                    value={patientSearch}
                                    onChange={(event) => setPatientSearch(event.target.value)}
                                    placeholder="Search by name, MRN, or national ID"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Patient</label>
                                <select
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    {...form.register("patientId")}
                                >
                                    <option value="">Select patient</option>
                                    {(patientsQuery.data?.items || []).map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.fullName} - {item.mrn}
                                        </option>
                                    ))}
                                </select>
                                {form.formState.errors.patientId ? (
                                    <p className="mt-1 text-xs text-red-700">{form.formState.errors.patientId.message}</p>
                                ) : null}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Encounter</label>
                                <select
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    {...form.register("encounterId")}
                                >
                                    <option value="">Select encounter</option>
                                    {availableEncounters.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.encounterNumber} ({item.status})
                                        </option>
                                    ))}
                                </select>
                                {form.formState.errors.encounterId ? (
                                    <p className="mt-1 text-xs text-red-700">{form.formState.errors.encounterId.message}</p>
                                ) : null}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Priority</label>
                                <select
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    {...form.register("priority")}
                                >
                                    <option value="LOW">LOW</option>
                                    <option value="MEDIUM">MEDIUM</option>
                                    <option value="HIGH">HIGH</option>
                                    <option value="CRITICAL">CRITICAL</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-slate-600">Clinical summary</label>
                                <textarea
                                    className="h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="Brief reason/context for refusal-case initiation"
                                    {...form.register("summary")}
                                />
                                {form.formState.errors.summary ? (
                                    <p className="mt-1 text-xs text-red-700">{form.formState.errors.summary.message}</p>
                                ) : null}
                            </div>
                        </div>
                    </section>

                    {createCaseMutation.error ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {createCaseMutation.error.message}
                        </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="submit"
                            disabled={createCaseMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                            <Save className="h-4 w-4" />
                            {createCaseMutation.isPending ? "Creating..." : "Create Case"}
                        </button>

                        <Link
                            href="/cases"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Cancel
                        </Link>
                    </div>
                </form>
            </AppShell>
        </AuthGuard>
    );
}
