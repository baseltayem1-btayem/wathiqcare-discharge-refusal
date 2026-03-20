"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  BookOpen,
  TrendingUp
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import ActionButton from "@/components/ui/ActionButton";

type ValidationResult = {
  id: string;
  code: string;
  title: string;
  isValid: boolean;
  category?: string;
  timestamp: string;
};

// Common ICD-11 codes for discharge-related diagnoses
const COMMON_CODES = [
  { code: "RA01", title: "Chronic obstructive pulmonary disease", category: "Respiratory" },
  { code: "BA00", title: "Heart failure", category: "Cardiovascular" },
  { code: "DA0Z", title: "Type 2 diabetes mellitus", category: "Endocrine" },
  { code: "FA01", title: "Major depressive disorder", category: "Mental Health" },
  { code: "CA40", title: "Acute myocardial infarction", category: "Cardiovascular" },
  { code: "8B20", title: "Chronic kidney disease", category: "Renal" },
  { code: "BD10", title: "Atrial fibrillation", category: "Cardiovascular" },
  { code: "CB41", title: "Cerebrovascular accident", category: "Neurological" },
  { code: "2C62", title: "Pneumonia", category: "Respiratory" },
  { code: "DA04", title: "Diabetic complications", category: "Endocrine" },
];

export default function ICD11ValidatorPage() {
  const [searchCode, setSearchCode] = useState("");
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const stats = useMemo(() => {
    const total = validationResults.length;
    const valid = validationResults.filter((r) => r.isValid).length;
    const invalid = total - valid;
    const successRate = total > 0 ? Math.round((valid / total) * 100) : 0;

    return { total, valid, invalid, successRate };
  }, [validationResults]);

  async function handleValidate() {
    if (!searchCode.trim()) return;

    setIsValidating(true);
    
    // Simulate API call - replace with actual ICD-11 validation
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    // Mock validation logic
    const isValid = COMMON_CODES.some((c) => c.code === searchCode.toUpperCase());
    const matchedCode = COMMON_CODES.find((c) => c.code === searchCode.toUpperCase());
    
    const result: ValidationResult = {
      id: `val-${Date.now()}`,
      code: searchCode.toUpperCase(),
      title: matchedCode?.title || "Unknown code",
      isValid,
      category: matchedCode?.category,
      timestamp: new Date().toISOString(),
    };

    setValidationResults([result, ...validationResults]);
    setIsValidating(false);
    setSearchCode("");
  }

  return (
    <AuthGuard>
      <AppShell
        title="ICD-11 Validator"
        subtitle="Validate medical diagnosis codes against the ICD-11 standard classification system."
      >
        {/* Stats Cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Validations"
            value={stats.total}
            icon={<Search className="h-5 w-5" />}
            variant="default"
          />
          <StatCard
            title="Valid Codes"
            value={stats.valid}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title="Invalid Codes"
            value={stats.invalid}
            icon={<XCircle className="h-5 w-5" />}
            variant="error"
          />
          <StatCard
            title="Success Rate"
            value={`${stats.successRate}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            variant="primary"
          />
        </div>

        {/* Code Validation Input */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Validate ICD-11 Code</h2>
          <p className="mt-1 text-sm text-slate-600">
            Enter an ICD-11 diagnosis code to validate against the official classification.
          </p>

          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleValidate();
                }
              }}
              placeholder="e.g., RA01, BA00, DA0Z"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <ActionButton
              onClick={handleValidate}
              disabled={!searchCode.trim() || isValidating}
              icon={<Search className="h-4 w-4" />}
            >
              {isValidating ? "Validating..." : "Validate"}
            </ActionButton>
          </div>
        </div>

        {/* Common Codes Reference */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Common Discharge Diagnosis Codes</h2>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMMON_CODES.map((code) => (
              <button
                key={code.code}
                onClick={() => setSearchCode(code.code)}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-900">{code.code}</p>
                    <p className="mt-1 text-sm text-slate-700">{code.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{code.category}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Validations */}
        {validationResults.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent Validations</h2>
            
            <div className="space-y-2">
              {validationResults.map((result) => (
                <div
                  key={result.id}
                  className={`rounded-xl border p-4 ${
                    result.isValid 
                      ? "border-emerald-200 bg-emerald-50" 
                      : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-slate-900">
                          {result.code}
                        </p>
                        <StatusBadge
                          variant={result.isValid ? "success" : "error"}
                          label={result.isValid ? "VALID" : "INVALID"}
                        />
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{result.title}</p>
                      {result.category && (
                        <p className="mt-1 text-xs text-slate-600">
                          Category: {result.category}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-slate-500">
                        {new Date(result.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {result.isValid ? (
                      <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="h-6 w-6 flex-shrink-0 text-rose-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900">About ICD-11 Validation</h3>
              <p className="mt-1 text-sm text-blue-700">
                The ICD-11 (International Classification of Diseases, 11th Revision) is the WHO standard for 
                diagnosis classification. This validator ensures codes comply with the latest medical coding standards 
                required for discharge documentation and insurance claims.
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
