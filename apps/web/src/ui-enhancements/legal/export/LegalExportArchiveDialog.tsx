
"use client";

import * as React from "react";
import { Button } from "@/components/design-system/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/design-system/dialog";
import { FormLabel, FormItem } from "@/components/design-system/form";
import { Input, Select } from "@/components/design-system/input";

/**
 * واجهة تصدير وأرشفة الوثائق القانونية
 * متوافقة مع Figma وDesign System
 */
export default function LegalExportArchiveDialog({
    open,
    onOpenChange,
    documentTypes = [],
    defaultType = "",
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documentTypes: { key: string; label: string }[];
    defaultType?: string;
}) {
    const [selectedType, setSelectedType] = React.useState(defaultType || (documentTypes[0]?.key ?? ""));
    const [fields, setFields] = React.useState<Record<string, string>>({});
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // مثال: حقول ديناميكية حسب نوع الوثيقة
    const dynamicFields = React.useMemo(() => {
        if (selectedType === "refusal") {
            return [
                { key: "refusal_reason", label: "سبب الرفض", type: "text" },
                { key: "witness_name", label: "اسم الشاهد", type: "text" },
            ];
        }
        if (selectedType === "financial") {
            return [
                { key: "amount", label: "المبلغ المالي", type: "number" },
                { key: "currency", label: "العملة", type: "dropdown", options: ["SAR", "USD", "EUR"] },
            ];
        }
        return [];
    }, [selectedType]);

    const handleFieldChange = (key: string, value: string) => {
        setFields((prev) => ({ ...prev, [key]: value }));
    };

    // ربط API التصدير
    const handleExport = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/forms/generate-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: selectedType, fields }),
            });
            if (!response.ok) throw new Error("فشل توليد PDF");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `document_${selectedType}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "خطأ غير متوقع");
        } finally {
            setLoading(false);
        }
    };

    // placeholder للأرشفة (سيتم ربطه مع DocuWare لاحقاً)
    const handleArchive = () => {
        alert("سيتم تنفيذ الأرشفة مع DocuWare لاحقاً");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>تصدير وأرشفة الوثيقة القانونية</DialogTitle>
                    <DialogDescription>
                        اختر نوع الوثيقة وأدخل البيانات المطلوبة ثم قم بالتصدير أو الأرشفة.
                    </DialogDescription>
                </DialogHeader>
                {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleExport(); }}>
                    <FormItem>
                        <FormLabel>نوع الوثيقة</FormLabel>
                        <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                            {documentTypes.map((dt) => (
                                <option key={dt.key} value={dt.key}>{dt.label}</option>
                            ))}
                        </Select>
                    </FormItem>
                    {dynamicFields.map((field) => (
                        <FormItem key={field.key}>
                            <FormLabel>{field.label}</FormLabel>
                            {field.type === "dropdown" ? (
                                <Select value={fields[field.key] || ""} onChange={(e) => handleFieldChange(field.key, e.target.value)}>
                                    <option value="">اختر</option>
                                    {field.options?.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </Select>
                            ) : (
                                <Input
                                    type={field.type}
                                    value={fields[field.key] || ""}
                                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                    placeholder={field.label}
                                />
                            )}
                        </FormItem>
                    ))}
                    <DialogFooter className="flex gap-2 justify-end mt-6">
                        <Button type="button" variant="outline" onClick={handleExport} disabled={loading}>
                            {loading ? "...جاري التصدير" : "تصدير PDF"}
                        </Button>
                        <Button type="button" variant="success" onClick={handleArchive} disabled={loading}>
                            {loading ? "...جاري الأرشفة" : "أرشفة في DocuWare"}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            إغلاق
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
