"use client";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/make-ui/tabs";
import { MalpracticeModule } from "@/components/make-modules/MalpracticeModule";
import { MedicalRecordReview } from "@/components/make-modules/MedicalRecordReview";
import { useState } from "react";

export default function MakeImportPage() {
  const [tab, setTab] = useState("malpractice");

  return (
    <AuthGuard>
      <AppShell
        title="Imported Figma Components"
        subtitle="Safe preview route for imported UI and modules"
      >
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-slate-900">Imported Figma Components Preview</h1>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="malpractice">Malpractice Module</TabsTrigger>
              <TabsTrigger value="records">Medical Record Review</TabsTrigger>
            </TabsList>
            <TabsContent value="malpractice">
              <MalpracticeModule />
            </TabsContent>
            <TabsContent value="records">
              <MedicalRecordReview />
            </TabsContent>
          </Tabs>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
