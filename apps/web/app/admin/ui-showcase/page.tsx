"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Switch,
  Progress,
  Input,
  Textarea,
  Select,
} from "@/components/design-system";

import {
  DischargeCaseTable,
  DischargeCaseDialog,
  LegalCaseDashboard,
  DashboardStatsGrid,
  ConsentWorkflowPanel,
} from "@/ui-enhancements";

/**
 * UI Showcase Page
 * 
 * Demonstrates the new design system components and enhancement wrappers.
 * This page is ISOLATED and does not affect existing production routes.
 */
export default function UIShowcasePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("primitives");

  // Mock data for demonstrations
  const mockCases = [
    {
      id: "1",
      caseNumber: "DRF-2025-001",
      patientName: "Ahmed Mohammed",
      patientMrn: "MRN-123456",
      status: "IN_PROGRESS",
      createdAt: "2025-03-01T10:00:00Z",
    },
    {
      id: "2",
      caseNumber: "DRF-2025-002",
      patientName: "Fatima Ali",
      patientMrn: "MRN-789012",
      status: "ESCALATED",
      createdAt: "2025-03-05T14:30:00Z",
    },
  ];

  const mockLegalCases = [
    {
      id: "1",
      caseNumber: "LEGAL-001",
      patientName: "Ahmed Mohammed",
      status: "active" as const,
      priority: "high" as const,
      escalatedAt: "2025-03-01T10:00:00Z",
      assignedCounsel: "Dr. Legal Counsel",
      completionPercentage: 45,
    },
    {
      id: "2",
      caseNumber: "LEGAL-002",
      patientName: "Fatima Ali",
      status: "under-review" as const,
      priority: "critical" as const,
      escalatedAt: "2025-03-05T14:30:00Z",
      assignedCounsel: "Senior Legal Advisor",
      completionPercentage: 70,
    },
  ];

  const mockConsents = [
    {
      id: "1",
      documentType: "Informed Consent",
      status: "verified" as const,
      verificationMethod: "SMS OTP",
      signedAt: "2025-03-01T10:00:00Z",
    },
    {
      id: "2",
      documentType: "Financial Responsibility Notice",
      status: "pending" as const,
      verificationMethod: "Nafath",
    },
  ];

  return (
    <AuthGuard>
      <AppShell
        title="Design System Showcase"
        subtitle="Demonstration of new UI components and enhancement wrappers"
        actions={
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="primitives">UI Primitives</TabsTrigger>
            <TabsTrigger value="discharge">Discharge Module</TabsTrigger>
            <TabsTrigger value="legal">Legal Module</TabsTrigger>
            <TabsTrigger value="consent">Consent Module</TabsTrigger>
          </TabsList>

          {/* UI Primitives Tab */}
          <TabsContent value="primitives" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Buttons</CardTitle>
                <CardDescription>All button variants and sizes</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="default">Default</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="success">Success</Button>
                <Button size="sm">Small</Button>
                <Button size="lg">Large</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Badges</CardTitle>
                <CardDescription>Status indicators and labels</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form Controls</CardTitle>
                <CardDescription>Input fields and form elements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Text Input
                  </label>
                  <Input placeholder="Enter text here..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Textarea
                  </label>
                  <Textarea placeholder="Enter longer text..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Select
                  </label>
                  <Select>
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={switchChecked} onCheckedChange={setSwitchChecked} />
                  <label className="text-sm text-slate-700">Toggle switch</label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
                <CardDescription>Progress bars with different values</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600">25% Complete</span>
                    <span className="text-slate-900 font-semibold">25%</span>
                  </div>
                  <Progress value={25} />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600">65% Complete</span>
                    <span className="text-slate-900 font-semibold">65%</span>
                  </div>
                  <Progress value={65} />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600">100% Complete</span>
                    <span className="text-slate-900 font-semibold">100%</span>
                  </div>
                  <Progress value={100} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dialog (Modal)</CardTitle>
                <CardDescription>Modal overlay demonstration</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setDialogOpen(true)}>
                  Open Dialog
                </Button>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Example Dialog</DialogTitle>
                      <DialogDescription>
                        This is a demonstration of the dialog component from the design system.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-slate-700">
                        Dialog content goes here. This component supports nested content,
                        forms, and complex layouts.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => setDialogOpen(false)}>
                        Confirm
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discharge Module Tab */}
          <TabsContent value="discharge" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard Stats Grid</CardTitle>
                <CardDescription>KPI cards for the main dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardStatsGrid
                  stats={{
                    totalCases: 156,
                    activeCases: 42,
                    escalatedCases: 8,
                    closedCases: 106,
                    totalTrend: "+12% from last month",
                    activeTrend: "+5% from last week",
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Discharge Case Table</CardTitle>
                <CardDescription>Enhanced table with existing case data</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DischargeCaseTable
                  cases={mockCases}
                  onRowClick={(caseItem) => {
                    console.log("Clicked case:", caseItem);
                    // Navigate or open dialog
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Discharge Case Dialog</CardTitle>
                <CardDescription>Modal for viewing/editing case details</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setCaseDialogOpen(true)}>
                  Open Case Dialog
                </Button>

                <DischargeCaseDialog
                  open={caseDialogOpen}
                  onOpenChange={setCaseDialogOpen}
                  caseData={{
                    caseNumber: "DRF-2025-001",
                    patientName: "Ahmed Mohammed",
                    patientMrn: "MRN-123456",
                    status: "IN_PROGRESS",
                    refusalReason: "Patient prefers home care with family support",
                    documents: [
                      {
                        id: "1",
                        title: "Discharge Refusal Form",
                        createdAt: "2025-03-01T10:00:00Z",
                      },
                      {
                        id: "2",
                        title: "Financial Responsibility Notice",
                        createdAt: "2025-03-01T11:30:00Z",
                      },
                    ],
                  }}
                  onSave={() => {
                    console.log("Save clicked");
                    setCaseDialogOpen(false);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Legal Module Tab */}
          <TabsContent value="legal" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Legal Case Dashboard</CardTitle>
                <CardDescription>
                  Comprehensive dashboard for legal escalation management
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <LegalCaseDashboard
                  cases={mockLegalCases}
                  stats={{
                    active: 12,
                    underReview: 8,
                    resolved: 45,
                    highRisk: 3,
                  }}
                  onCaseClick={(caseItem) => {
                    console.log("Clicked legal case:", caseItem);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consent Module Tab */}
          <TabsContent value="consent" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Consent Workflow Panel</CardTitle>
                <CardDescription>
                  Manage informed consent and signature capture workflows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConsentWorkflowPanel
                  caseId="DRF-2025-001"
                  consents={mockConsents}
                  stats={{
                    pending: 2,
                    verified: 5,
                    expired: 1,
                  }}
                  onStartConsent={(documentType) => {
                    console.log("Start consent for:", documentType);
                  }}
                  onVerifyConsent={(consentId) => {
                    console.log("Verify consent:", consentId);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Documentation Link */}
        <Card className="mt-6 border-emerald-200 bg-emerald-50">
          <CardContent className="flex items-center gap-3 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">
                Design System Documentation
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                All components are documented in DESIGN_SYSTEM.md with usage examples and
                integration guidelines.
              </p>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
