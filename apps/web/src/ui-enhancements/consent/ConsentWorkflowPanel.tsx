"use client";

import * as React from "react";
import { CheckCircle2, Clock, FileCheck, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/design-system/card";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Progress } from "@/components/design-system/progress";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/design-system/tabs";

type ConsentStatus = "pending" | "in-progress" | "verified" | "expired";

type ConsentItem = {
  id: string;
  documentType: string;
  status: ConsentStatus;
  verificationMethod?: string;
  signedAt?: string;
  expiresAt?: string;
};

type ConsentWorkflowPanelProps = {
  caseId: string;
  consents: ConsentItem[];
  stats: {
    pending: number;
    verified: number;
    expired: number;
  };
  onStartConsent?: (documentType: string) => void;
  onVerifyConsent?: (consentId: string) => void;
};

/**
 * Enhanced panel for consent and signature workflows.
 * Wraps existing consent logic without modifying backend services.
 */
export default function ConsentWorkflowPanel({ 
  caseId,
  consents,
  stats,
  onStartConsent,
  onVerifyConsent
}: ConsentWorkflowPanelProps) {
  const [activeTab, setActiveTab] = React.useState("all");

  const getStatusVariant = (status: ConsentStatus) => {
    switch (status) {
      case "verified": return "success";
      case "expired": return "destructive";
      case "in-progress": return "warning";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: ConsentStatus) => {
    switch (status) {
      case "verified": return <CheckCircle2 className="h-4 w-4" />;
      case "in-progress": return <Clock className="h-4 w-4" />;
      default: return <FileCheck className="h-4 w-4" />;
    }
  };

  const progressPercentage = consents.length > 0 
    ? (consents.filter(c => c.status === "verified").length / consents.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <CardDescription className="mt-1">Awaiting signature</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verified}</div>
            <CardDescription className="mt-1">Successfully signed</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Shield className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expired}</div>
            <CardDescription className="mt-1">Requires renewal</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consent Workflow Progress</CardTitle>
          <CardDescription>Case {caseId}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Overall Completion</span>
              <span className="font-semibold text-slate-900">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Consent Items */}
      <Card>
        <CardHeader>
          <CardTitle>Consent Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="verified">Verified</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {consents.map((consent) => (
                <div
                  key={consent.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200">
                      {getStatusIcon(consent.status)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {consent.documentType}
                      </p>
                      {consent.verificationMethod && (
                        <p className="text-xs text-slate-600 mt-0.5">
                          Method: {consent.verificationMethod}
                        </p>
                      )}
                      {consent.signedAt && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Signed: {new Date(consent.signedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(consent.status)}>
                      {consent.status.toUpperCase()}
                    </Badge>
                    {consent.status === "pending" && onVerifyConsent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onVerifyConsent(consent.id)}
                      >
                        Verify
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {consents.length === 0 && (
                <div className="text-center py-8">
                  <FileCheck className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-600">No consent documents yet</p>
                  {onStartConsent && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => onStartConsent("informed_consent")}
                    >
                      Start Consent Flow
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              <div className="space-y-3">
                {consents
                  .filter(c => c.status === "pending")
                  .map((consent) => (
                    <div key={consent.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{consent.documentType}</p>
                      <Badge variant="secondary" className="mt-2">PENDING</Badge>
                    </div>
                  ))}
                {consents.filter(c => c.status === "pending").length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No pending consents</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="verified" className="mt-4">
              <div className="space-y-3">
                {consents
                  .filter(c => c.status === "verified")
                  .map((consent) => (
                    <div key={consent.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{consent.documentType}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {consent.signedAt && new Date(consent.signedAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                {consents.filter(c => c.status === "verified").length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No verified consents</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="expired" className="mt-4">
              <div className="space-y-3">
                {consents
                  .filter(c => c.status === "expired")
                  .map((consent) => (
                    <div key={consent.id} className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                      <p className="text-sm font-medium text-rose-900">{consent.documentType}</p>
                      <Badge variant="destructive" className="mt-2">EXPIRED</Badge>
                    </div>
                  ))}
                {consents.filter(c => c.status === "expired").length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No expired consents</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
