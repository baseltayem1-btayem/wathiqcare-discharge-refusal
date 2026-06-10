# WathiqCare UI/API Binding Audit Report

Generated: 2026-06-10 17:56:16

## Files scanned
- apps/web/src/app/modules/informed-consents
- apps/web/src/components/informed-consents
- apps/web/src/lib
- prisma

## Buttons and clickable handlers in apps/web/src/app/modules/informed-consents

_No matches found._

## Inputs selects and forms in apps/web/src/app/modules/informed-consents

_No matches found._

## API calls in apps/web/src/app/modules/informed-consents

_No matches found._

## Mock static placeholder risks in apps/web/src/app/modules/informed-consents

BEGIN MATCHES
apps/web/src/app/modules/informed-consents\page.tsx:7:// to the controlled-port OneDrive/Figma UI surface (visual-only, mock-backed).
END MATCHES

## Loading error and empty states in apps/web/src/app/modules/informed-consents

_No matches found._

## Audit and logging references in apps/web/src/app/modules/informed-consents

BEGIN MATCHES
apps/web/src/app/modules/informed-consents\[section]\page.tsx:25:    title: { ar: "╪º┘ä╪ú╪▒╪┤┘è┘ü ┘ê╪º┘ä╪¬╪»┘é┘è┘é", en: "Audit & Legal Archive" },
apps/web/src/app/modules/informed-consents\[section]\page.tsx:26:    description: { ar: "╪¬┘ç┘è╪ª╪⌐ ┘ä┘ä╪ú╪▒╪┤┘ü╪⌐ ╪º┘ä┘é╪º┘å┘ê┘å┘è╪⌐ ┘ê╪│╪¼┘ä ╪º┘ä╪¬╪»┘é┘è┘é ╪º┘ä╪«╪º╪╡ ╪¿┘à╪│╪º╪▒╪º╪¬ ╪º┘ä┘à┘ê╪º┘ü┘é╪º╪¬.", en: "Prepared archive area for legal retention and audit sequencing of consent workflows." },
apps/web/src/app/modules/informed-consents\[section]\page.tsx:36:  { href: "/modules/informed-consents/archive", label: { ar: "╪º┘ä╪ú╪▒╪┤┘è┘ü ┘ê╪º┘ä╪¬╪»┘é┘è┘é", en: "Audit & Legal Archive" } },
END MATCHES

## Buttons and clickable handlers in apps/web/src/components/informed-consents

BEGIN MATCHES
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:712:                <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:714:                  onClick={() => setCurrentStep(step.key)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:358:                <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:361:                  onClick={() => {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:387:                <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:389:                  onClick={() => setSupportRequestModal(null)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:427:                    <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:429:                      onClick={() => {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:541:                          <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:544:                            onClick={saveCollaborationTeam}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:560:                      <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:563:                        onClick={() => setSupportRequestModal('medical-communication')}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:661:                      <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:664:                        onClick={() => setSupportRequestModal('technical-ticket')}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:670:                      <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:673:                        onClick={() => setSupportRequestModal('legal-consultation')}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:679:                      <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:681:                        onClick={() => {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:712:                  <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:714:                    onClick={() => setSupportRequestModal(null)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:720:                  <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:722:                    onClick={() => {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:754:                <button type="button" onClick={() => setSupportRequestModal(null)} className="rounded px-2 py-1 text-sm text-[#6B7280] hover:bg-[#F4F6F9]">&times;</button>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:827:                  <button type="button" onClick={() => setSupportRequestModal(null)} className="rounded border border-[#D8DCE3] px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F4F6F9]">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:830:                  <button type="submit" className="rounded bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:847:                <button type="button" onClick={() => setSupportRequestModal(null)} className="rounded px-2 py-1 text-sm text-[#6B7280] hover:bg-[#F4F6F9]">&times;</button>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:892:                  <button type="button" onClick={() => setSupportRequestModal(null)} className="rounded border border-[#D8DCE3] px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F4F6F9]">{isArabic ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}</button>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:893:                  <button type="submit" className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">{isArabic ? '\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628' : 'Submit Request'}</button>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:908:                <button type="button" onClick={() => setSupportRequestModal(null)} className="rounded px-2 py-1 text-sm text-[#6B7280] hover:bg-[#F4F6F9]">&times;</button>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:955:                  <button type="button" onClick={() => setSupportRequestModal(null)} className="rounded border border-[#D8DCE3] px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F4F6F9]">{isArabic ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}</button>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:956:                  <button type="submit" className="rounded bg-[#002B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003B7A]">{isArabic ? '\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062a\u0630\u0643\u0631\u0629' : 'Submit Ticket'}</button>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1255:              <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1257:                onClick={() => setScreen(item.id)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1278:            <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1280:              onClick={() => void handleSignOut()}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1326:              <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1327:                onClick={() => setLang('en')}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1332:              <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1333:                onClick={() => setLang('ar')}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1342:              <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1345:                onClick={() => setShowNotifications((value) => !value)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1366:                    <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1368:                      onClick={() => void markConsentNotificationsRead()}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1386:                        <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1389:                          onClick={() => {
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:365:        <button className="active" type="button" onClick={() => openRoute("/modules/informed-consents")}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:370:        <button type="button" onClick={() => openRoute("/modules/informed-consents/list")}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:375:        <button type="button" onClick={() => openRoute("/modules/informed-consents/template-registry")}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:380:        <button type="button" onClick={() => openRoute("/modules/informed-consents/physician-workflow?step=anesthesia")}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:385:        <button type="button" onClick={() => openRoute("/modules/informed-consents/governance")}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:390:        <button type="button" onClick={() => openRoute("/modules/informed-consents/settings-support")}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:399:            <button type="button" onClick={() => openRoute("/modules")}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:410:              <button type="button" className={lang === "en" ? "active" : ""} onClick={() => switchLang("en")}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:413:              <button type="button" className={lang === "ar" ? "active" : ""} onClick={() => switchLang("ar")}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:418:            <button type="button" onClick={() => openRoute("/alerts")}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:432:              <button type="button" onClick={() => setActiveStep(0)}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:436:              <button type="button" onClick={() => openRoute(`/sign/demo-wathiq-public-link?lang=${lang}`)}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:472:              <button type="button" onClick={() => setActiveStep(0)}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:480:              <button type="button" onClick={() => openRoute("/modules/informed-consents/list")}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:488:              <button type="button" onClick={() => setActiveStep(1)}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:502:              <button type="button" onClick={() => setActiveStep(6)}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:510:              <button type="button" onClick={() => setActiveStep(4)}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:518:              <button type="button" onClick={() => openRoute(`/sign/demo-wathiq-public-link?lang=${lang}`)}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:533:                <button
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:537:                  onClick={() => setActiveStep(index)}
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:596:                      <button
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:600:                        onClick={() => setSelectedTemplate(template)}
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:642:                    <button type="button" className={anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(true)}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:648:                    <button type="button" className={!anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(false)}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:745:                  <button type="button" className="wcp-primary wide" onClick={sendConsent}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:792:              <button type="button" onClick={goBack} disabled={activeStep === 0}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:797:                <button type="button" className="wcp-primary" onClick={goNext}>
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:802:                <button type="button" className="wcp-primary" onClick={sendConsent}>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PhysicianDashboard.tsx:61:            <button onClick={() => setLang('en')} className={`px-3 py-1.5 font-medium transition-colors ${lang === 'en' ? 'bg-[#002B5C] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'}`}>EN</button>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PhysicianDashboard.tsx:62:            <button onClick={() => setLang('ar')} className={`px-3 py-1.5 font-medium transition-colors ${lang === 'ar' ? 'bg-[#002B5C] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'}`}>╪╣</button>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PhysicianDashboard.tsx:64:          <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PhysicianDashboard.tsx:65:            onClick={licenseExpired ? undefined : onNewConsent}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PhysicianDashboard.tsx:83:          <button className="text-sm text-red-700 font-medium underline hover:no-underline" onClick={handleViewAllAlerts}>View All</button>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PhysicianDashboard.tsx:130:                  <tr key={c.mrn} className={`border-b border-[#EEF1F5] hover:bg-[#F4F6F9] cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}`} onClick={() => onViewConsent(c.mrn)}>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\clinical\ValidationDrawer.tsx:69:                <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\clinical\ValidationDrawer.tsx:71:                  onClick={() => onNavigate(item.section)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:34:            <button onClick={() => setLang('en')} className={`px-3 py-1.5 font-medium transition-colors ${lang === 'en' ? 'bg-[#002B5C] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'}`}>EN</button>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:35:            <button onClick={() => setLang('ar')} className={`px-3 py-1.5 font-medium transition-colors ${lang === 'ar' ? 'bg-[#002B5C] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'}`}>╪╣</button>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:71:            <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:72:              onClick={handleSearch}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:82:              <span key={tip} className="text-xs text-[#6B7280] bg-[#F4F6F9] border border-[#D8DCE3] px-2 py-0.5 rounded cursor-pointer hover:bg-[#EEF1F5]"
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:83:                onClick={() => setQuery(tip === 'MRN-XXXX-XXXX' ? 'MRN-2024-0847' : query)}>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:98:              <div key={p.mrn} className={`border-b border-[#EEF1F5] ${selectedPatient?.mrn === p.mrn ? 'bg-blue-50 border-[#4B9CD3]' : 'hover:bg-[#F4F6F9]'} cursor-pointer transition-colors`}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:99:                onClick={() => setSelectedPatient(p)}>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:163:                  onClick={() => setSelectedEncounter(enc)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:164:                  className={`px-5 py-4 flex items-center gap-4 cursor-pointer transition-colors ${selectedEncounter?.id === enc.id ? 'bg-blue-50' : 'hover:bg-[#F4F6F9]'} ${enc.status !== 'active' ? 'opacity-60' : ''}`}>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:187:                <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:188:                  onClick={() => onSelectPatient(selectedPatient, selectedEncounter)}
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:240:        <button
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:242:          onClick={() => loadLibrary(query)}
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:311:                    <button
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:313:                      onClick={() => previewPdf(item)}
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:321:                    <button
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:323:                      onClick={() => selectForPhysicianReview(item)}
apps/web/src/components/informed-consents\enterprise-workflow\ApprovedFigmaConsentWorkspace.tsx:291:                <button
apps/web/src/components/informed-consents\enterprise-workflow\ApprovedFigmaConsentWorkspace.tsx:293:                  onClick={toggleLanguage}
apps/web/src/components/informed-consents\enterprise-workflow\ApprovedFigmaConsentWorkspace.tsx:302:                <button
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:257:              <button
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:263:                onClick={() => addQuickAction(action)}
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:301:          <button
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:304:            onClick={addNote}
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:155:            <button
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:158:              onClick={() => {
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:213:          <button
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:275:            <button
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:278:              onClick={() =>
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:90:      <button
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:93:        onClick={() => setMode("physician")}
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:98:      <button
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:101:        onClick={() => setMode("patient")}
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:144:          <button key={label as string} type="button" className={index === 0 ? "wc-nav-item active" : "wc-nav-item"} onClick={() => window.location.assign((label as string) === "Informed Consents" || (label as string) === "My Consents" ? "/modules/informed-consents" : (label as string) === "Encounters" || (label as string) === "Appointments" ? "/modules/informed-consents/physician-workflow" : (label as string) === "Patients" ? "/modules/informed-consents/list" : (label as string) === "Templates" || (label as string) === "My Documents" ? "/modules/informed-consents/template-registry" : (label as string) === "Education Library" ? "/admin/procedure-education" : (label as string) === "Anesthesia" ? "/modules/informed-consents/physician-workflow?step=anesthesia" : (label as string) === "Reports & Audit" ? "/modules/informed-consents/governance-reports" : (label as string) === "Notifications" || (label as string) === "Messages" ? "/alerts" : (label as string) === "Institution Settings" || (label as string) === "Profile & Settings" ? "/modules/informed-consents/settings-support" : "/modules/informed-consents")}>
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:159:        <button type="button" onClick={() => window.location.assign("/modules/informed-consents/settings-support")}>{mode === "patient" ? "Chat with Support" : "Contact Support"}</button>
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:162:      <button type="button" className="wc-collapse">
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:174:        <button type="button" className="wc-menu-button" aria-label="Open menu" onClick={() => window.location.assign("/modules")}>
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:197:        <button type="button" className="wc-bell" aria-label="Notifications" onClick={() => window.location.assign("/alerts")}>
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:226:          <button type="button" onClick={() => window.location.assign("/modules/informed-consents/list")}>View All Workflows <span>ΓåÆ</span></button>
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:351:          <button type="button" className="wc-template-badge">
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:360:            <button type="button" className="wc-doc-select">
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:367:            <button type="button" className="wc-doc-select compact">
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:373:          <button type="button" onClick={() => window.location.assign("/api/modules/informed-consents/imc-library/resolve/pdf")}><Download size={19} /></button>
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:374:          {mode === "patient" && <button type="button"><Printer size={19} /></button>}
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:375:          <button type="button"><Minus size={17} /></button>
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:377:          <button type="button"><Plus size={17} /></button>
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:378:          {mode === "patient" && <button type="button"><Maximize2 size={18} /></button>}
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:472:            <button type="button" onClick={() => window.location.assign("/modules/informed-consents/governance")}>View</button>
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:481:        <button type="button" onClick={() => window.location.assign("/modules/informed-consents/settings-support")}><MessageSquare size={16} /> Chat with Expert</button>
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:482:        <a onClick={() => window.location.assign("/modules/informed-consents/settings-support")}>Raise a Ticket</a>
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:351:            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:381:        <button type="button" onClick={openTemplateRegistry}>
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:384:        <button type="button" onClick={openTemplateBuilder}>
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:397:              <button
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:401:                onClick={() => setSelectedId(template.id)}
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:473:          <button type="button" className="wc-template-use" onClick={useSelectedTemplate}>
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1168:          <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1170:            onClick={() => setActiveSection("statusAudit")}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1410:            <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1413:              onClick={() => setActiveSection(section.key)}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1611:          <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1733:            <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1735:              onClick={goBack}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1743:            <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1745:              onClick={goNext}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1935:            <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1938:              onClick={() => setActiveStepIndex(index)}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2042:          <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2044:            onClick={runPatientSearch}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2097:                  <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2100:                    onClick={() => loadEncountersForPatient(patient)}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2186:                  <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2189:                    onClick={() => selectEncounter(encounter)}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2392:            <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2395:              onClick={() => handleAnesthesiaDecision(option.value)}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2497:        <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2578:          <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2580:            onClick={generateDraftPdf}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2586:          <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2589:            onClick={() => draftPdfUrl && window.open(draftPdfUrl, "_blank", "noopener,noreferrer")}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2656:            <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2748:          <QuickActionButton icon={UserRoundCheck} label="Request Anesthesia Review" labelAr="╪╖┘ä╪¿ ┘à╪▒╪º╪¼╪╣╪⌐ ╪╖╪¿┘è╪¿ ╪º┘ä╪¬╪«╪»┘è╪▒" onClick={() => setActiveSection("collaboration")} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2749:          <QuickActionButton icon={FileText} label={draftGenerationLoading ? "Generating IMC PDF..." : "Generate Draft PDF"} labelAr="╪Ñ┘å╪┤╪º╪í ┘à╪│┘ê╪»╪⌐ ╪º┘ä┘à╪│╪¬┘å╪»" onClick={generateDraftPdf} disabled={draftGenerationLoading} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2750:          <QuickActionButton icon={FileText} label="Open Full Preview" labelAr="┘ü╪¬╪¡ ╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ╪º┘ä┘â╪º┘à┘ä╪⌐" onClick={() => draftPdfUrl && window.open(draftPdfUrl, "_blank", "noopener,noreferrer")} disabled={!draftPdfUrl} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2751:          <QuickActionButton icon={MessageSquareText} label="Open Collaboration" labelAr="┘ü╪¬╪¡ ╪º┘ä╪¬┘ê╪º╪╡┘ä ╪º┘ä╪╖╪¿┘è ╪º┘ä┘é╪º┘å┘ê┘å┘è" onClick={() => setActiveSection("collaboration")} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2752:          <QuickActionButton icon={Settings} label="Go to Support & Settings" labelAr="╪º┘ä╪º┘å╪¬┘é╪º┘ä ┘ä┘ä╪»╪╣┘à ┘ê╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬" onClick={() => setActiveSection("supportSettings")} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:3027:    <button
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:3029:      onClick={onClick}
apps/web/src/components/informed-consents\enterprise-workflow\figma-adapters\FigmaPatientSearchAdapter.tsx:77:            <button
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:208:          <button
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:212:            onClick={() => setCurrentStep(index)}
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:270:            <button type="button" onClick={() => setQuery("")}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:302:            <button
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:306:              onClick={() => setSelectedTemplate(template)}
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:337:        <button type="button" onClick={() => window.location.assign("/sign/test/workflow")}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:426:        <button type="button" className="active" onClick={() => window.location.assign("/modules/informed-consents")}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:430:        <button type="button" onClick={() => window.location.assign("/modules/informed-consents/list")}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:434:        <button type="button" onClick={() => window.location.assign("/modules/informed-consents/template-registry")}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:438:        <button type="button" onClick={() => window.location.assign("/modules/informed-consents/governance")}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:442:        <button type="button" onClick={() => window.location.assign("/modules/informed-consents/settings-support")}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:450:          <button type="button" className="fc-home" onClick={() => window.location.assign("/modules")}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:460:            <button type="button" className={mode === "physician" ? "active" : ""} onClick={() => setMode("physician")}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:464:            <button type="button" className={mode === "patient" ? "active" : ""} onClick={() => setMode("patient")}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:468:            <button type="button" onClick={() => window.location.assign("/alerts")}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:471:            <button type="button">
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:519:                        <button key={item} type="button" className={selectedTemplate.type === item ? "active" : ""}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:570:                      <button type="button" className={anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(true)}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:574:                      <button type="button" className={!anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(false)}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:604:                        <button key={item} type="button" className="done" onClick={() => setEducationReady(true)}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:648:                    <button type="button" className="fc-primary wide" onClick={sendToPatient}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:666:                  <button type="button" onClick={previousStep} disabled={currentStep === 0}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:671:                    <button type="button" className="fc-primary" onClick={nextStep}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:676:                    <button type="button" className="fc-primary" onClick={sendToPatient}>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepConsentType.tsx:136:            <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepConsentType.tsx:139:              onClick={() => handleSelect(option)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepConsentType.tsx:174:        <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepConsentType.tsx:176:          onClick={handleBack}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepConsentType.tsx:183:        <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepConsentType.tsx:185:          onClick={onNext}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepValidation.tsx:153:        <button onClick={onPrev} className="flex items-center gap-2 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] px-4 py-2.5 rounded text-sm font-medium transition-colors">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepValidation.tsx:157:        <button onClick={handleComplete} disabled={!canProceed} className="flex items-center gap-2 bg-[#C9A13B] hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded text-sm font-medium transition-colors">
apps/web/src/components/informed-consents\enterprise-workflow\SmartConsentFastTrackPreview.tsx:294:                <button className="rounded-xl bg-[#C9A13B] px-5 py-3 text-sm font-bold text-[#002B5C] shadow-lg transition hover:brightness-105">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:833:                  onClick={() => setSelected(record)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:834:                  className={`bg-white border rounded-lg p-4 cursor-pointer transition-colors ${selected.id === record.id ? 'border-[#002B5C] shadow-sm' : 'border-[#D8DCE3] hover:border-[#4B9CD3]'}`}>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:903:                  <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:904:                    onClick={() => handleResendConsentLink(selected.id)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:916:                  <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:917:                    onClick={() => handleRevokeConsent(selected.id)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:356:                <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:358:                  onClick={handleCopyLink}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:495:            <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:498:              onClick={() => setOtpMethod(method.id)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:499:              className={`text-left border rounded-lg p-3 cursor-pointer transition-colors ${
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:530:              <label key={item.id} className="flex items-center gap-2 cursor-pointer">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:610:        <label className="flex items-center gap-3 cursor-pointer">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:637:        <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:639:          onClick={onPrev}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:646:        <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:648:          onClick={handleSend}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:176:          <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:177:            onClick={() => setShowAr(!showAr)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:221:                  <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:223:                    onClick={() => toggleNote(field.id)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:245:                  <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:247:                    onClick={() => applyStandardTemplate(field.id, field.label)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:283:                  <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:286:                    onClick={() => {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:302:        <button onClick={onPrev} className="flex items-center gap-2 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] px-4 py-2.5 rounded text-sm font-medium transition-colors">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:306:        <button onClick={handleComplete} className="flex items-center gap-2 bg-[#002B5C] hover:bg-blue-900 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepEducation.tsx:101:            <button key={s.id}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepEducation.tsx:102:              onClick={() => setActiveSection(s.id)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepEducation.tsx:140:                  <label key={key} className="flex items-start gap-2.5 cursor-pointer">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepEducation.tsx:157:        <button onClick={onPrev} className="flex items-center gap-2 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] px-4 py-2.5 rounded text-sm font-medium transition-colors">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepEducation.tsx:161:        <button onClick={handleComplete} className="flex items-center gap-2 bg-[#002B5C] hover:bg-blue-900 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:327:          <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:330:            onClick={() => handleApplicabilityChange("not-applicable")}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:350:          <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:353:            onClick={() => handleApplicabilityChange("applies")}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:422:              <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:424:                onClick={handleSendForAnesthesiaReview}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:452:                <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:454:                  onClick={handleStartAnesthesiaReview}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:468:                    <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:471:                      onClick={() => setSelectedType(at.id)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:472:                      className={`border rounded-lg p-3 cursor-pointer transition-colors text-start ${
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:501:                    <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:504:                      onClick={() => setActivePhase(phase.key)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:575:                        <label className="flex items-center gap-2 cursor-pointer">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:675:                <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:677:                  onClick={handleApproveAnesthesia}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:722:              <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:724:                onClick={handleConfirmNursingReadiness}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:763:        <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:765:          onClick={onPrev}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:772:        <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:774:          onClick={handleComplete}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPatient.tsx:159:              <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPatient.tsx:162:                onClick={() => setChannel(ch.id)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPatient.tsx:171:        <label className="flex items-start gap-3 cursor-pointer">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPatient.tsx:195:        <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPatient.tsx:196:          onClick={handleContinue}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepProcedure.tsx:83:              onClick={() => setSelectedProc(proc)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepProcedure.tsx:84:              className={`px-5 py-4 flex items-start gap-4 cursor-pointer transition-colors ${selectedProc.id === proc.id ? 'bg-blue-50 border-l-2 border-l-[#002B5C]' : 'hover:bg-[#F4F6F9]'}`}>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepProcedure.tsx:125:              className={`flex items-center gap-3 px-4 py-3 rounded border cursor-pointer transition-colors ${
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepProcedure.tsx:130:              onClick={() => setActiveConsents(prev => prev.includes(rc.id) ? prev.filter(id => id !== rc.id) : [...prev, rc.id])}>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepProcedure.tsx:156:        <button onClick={onPrev} className="flex items-center gap-2 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] px-4 py-2.5 rounded text-sm font-medium transition-colors">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepProcedure.tsx:160:        <button onClick={handleContinue} className="flex items-center gap-2 bg-[#002B5C] hover:bg-blue-900 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPreview.tsx:141:            <summary className="cursor-pointer text-xs font-bold text-[#002B5C]">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPreview.tsx:152:        <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPreview.tsx:154:          onClick={handleBack}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPreview.tsx:161:        <button
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPreview.tsx:163:          onClick={onNext}
END MATCHES

## Inputs selects and forms in apps/web/src/components/informed-consents

BEGIN MATCHES
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:61:              <input
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:351:                <input
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:445:            <input
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:458:            <input
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:531:                <input
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:554:              <select
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:570:              <select className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:611:          <input
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPatient.tsx:131:            <input
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPatient.tsx:143:            <input
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPatient.tsx:172:          <input
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:232:                <textarea
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:254:                <textarea
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:269:                  <textarea
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepEducation.tsx:141:                    <input type="checkbox"
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:525:                          <select
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:541:                          <select
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:576:                          <input
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:594:                        <textarea
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:652:                      <textarea
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:452:                          <input
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:470:                        <select className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:516:                              <select
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:579:                        <select
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:606:                        <select
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:618:                        <select className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:799:                  <select name="target" className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:813:                  <textarea
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:814:                    name="message"
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:854:                    <select className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:865:                    <select className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:875:                  <textarea required rows={5} className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm" placeholder={isArabic ? '\u0627\u0643\u062a\u0628 \u0645\u0648\u0636\u0648\u0639 \u0627\u0644\u0627\u0633\u062a\u0634\u0627\u0631\u0629\u060c \u0648\u0627\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u060c \u0648\u0623\u064a \u062d\u0627\u0644\u0629 \u0623\u0648 \u0645\u0631\u0641\u0642\u0627\u062a \u062a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629.' : 'Describe the legal question, consent issue, and any case or attachment that should be reviewed.'} />
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:878:                <input type="hidden" name="supportRequestContext" value={JSON.stringify(supportRequestContext)} />
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:915:                    <select className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:928:                    <select className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:938:                  <textarea required rows={5} className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm" placeholder={isArabic ? '\u0627\u0643\u062a\u0628 \u0645\u0627 \u0627\u0644\u0645\u0634\u0643\u0644\u0629\u060c \u0645\u062a\u0649 \u062d\u062f\u062b\u062a\u060c \u0648\u0645\u0627 \u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u062a\u064a \u062a\u062d\u062a\u0627\u062c \u0645\u0633\u0627\u0639\u062f\u0629 \u0628\u0634\u0623\u0646\u0647\u0627.' : 'Describe the issue, when it happened, and the step that requires support.'} />
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:941:                <input type="hidden" name="supportRequestContext" value={JSON.stringify(supportRequestContext)} />
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:587:                    <input
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:624:                    <input value={procedure} onChange={(event) => setProcedure(event.target.value)} />
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:629:                    <textarea defaultValue={t.clinicalNoteDefault} />
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:674:                    <input
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:718:                      <input value={mobile} onChange={(event) => setMobile(event.target.value)} />
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:723:                      <input value={email} onChange={(event) => setEmail(event.target.value)} />
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:289:          <textarea
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:229:          <input
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:345:          <input
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:359:          <select value={type} onChange={(event) => setType(event.target.value)}>
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:369:          <select value={department} onChange={(event) => setDepartment(event.target.value)}>
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:237:              <select
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:250:              <input
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:260:              <textarea
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:300:      <input type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4" />
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:264:          <input
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:278:          <select value={type} onChange={(event) => setType(event.target.value)}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:288:          <select value={department} onChange={(event) => setDepartment(event.target.value)}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:552:                      <input value={procedure} onChange={(event) => setProcedure(event.target.value)} />
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:557:                      <textarea defaultValue="The patient was informed about the nature, benefits, risks, alternatives, and potential complications of the proposed procedure." />
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:640:                        <input defaultValue="+966 5X XXX XXXX" />
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:644:                        <input defaultValue="patient@example.com" />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1694:                <input
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2025:              <input
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2887:      <input
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2909:      <textarea
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2933:      <select
apps/web/src/components/informed-consents\enterprise-workflow\figma-adapters\FigmaPatientSearchAdapter.tsx:63:              <input
END MATCHES

## API calls in apps/web/src/components/informed-consents

BEGIN MATCHES
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:117:      const response = await fetch(
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:118:        `/api/modules/informed-consents/collaboration?caseId=${encodeURIComponent(caseId)}&tenantId=${encodeURIComponent(tenantId)}`,
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:162:      const response = await fetch("/api/modules/informed-consents/collaboration", {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:390:        const imcResolveResponse = await fetch(
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:391:          `/api/modules/informed-consents/imc-library/resolve?procedure=${encodeURIComponent(selectedProcedureName)}`,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:416:        const templatesResponse = await fetch("/api/modules/informed-consents/templates", {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:458:        const draftResponse = await fetch(
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:459:          "/api/modules/informed-consents/generate-draft",
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:219:  "/api/modules/informed-consents/templates",
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:220:  "/api/modules/informed-consents/library",
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:221:  "/api/modules/informed-consents/imc-library",
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:242:          const response = await fetch(endpoint, {
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:34:const API_BASE = "/api/modules/informed-consents";
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:37:  const response = await fetch(url, {
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:160:      const pdfCheck = await fetch(pdfUrl, {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:232:      const response = await fetch(`/api/modules/informed-consents/documents/${encodeURIComponent(consentId)}/timeline`, {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:447:    const response = await fetch(`/api/modules/informed-consents/documents/${encodeURIComponent(consentId)}/signature-orchestration`, {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:516:    const response = await fetch(`/api/modules/informed-consents/documents/${encodeURIComponent(consentId)}/signature-orchestration`, {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:567:      const response = await fetch(`/api/modules/informed-consents/documents/${encodeURIComponent(consentId)}/timeline`, {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:617:        const response = await fetch('/api/modules/informed-consents/status-tracking?limit=100', {
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:90:      const response = await fetch("/api/modules/informed-consents/support-requests", {
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:360:        "/api/modules/informed-consents/templates",
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:361:        "/api/modules/informed-consents/library",
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:362:        "/api/modules/informed-consents/imc-library",
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:367:          const response = await fetch(endpoint, {
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:627:        const response = await fetch("/api/modules/informed-consents/collaboration/team/users");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:679:        const response = await fetch("/api/modules/informed-consents/imc-library");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:723:        const response = await fetch(
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:724:          `/api/modules/informed-consents/imc-library/resolve?procedure=${encodeURIComponent(procedure)}`,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:790:      const response = await fetch(`/api/modules/informed-consents/patients/search?q=${encodeURIComponent(query)}`);
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:821:      const response = await fetch(
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:822:        `/api/modules/informed-consents/patients/${encodeURIComponent(patient.mrn)}/encounters`,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:864:        const response = await fetch("/api/modules/informed-consents/templates");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1068:      const response = await fetch("/api/modules/informed-consents/generate-draft", {
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1118:          ? `/api/modules/informed-consents/documents/${encodeURIComponent(documentId)}/pdf?lang=bilingual`
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:169:      const response = await fetch(
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:170:        `/api/modules/informed-consents/documents/${linkedDocumentId}/anesthesia-workflow`,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:192:        await fetch(`/api/modules/informed-consents/documents/${linkedDocumentId}/anesthesia-workflow`, {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:208:        await fetch(`/api/modules/informed-consents/documents/${linkedDocumentId}/anesthesia-workflow`, {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:226:        await fetch(`/api/modules/informed-consents/documents/${linkedDocumentId}/anesthesia-workflow`, {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPreview.tsx:30:    ? `/api/modules/informed-consents/documents/${encodeURIComponent(
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\fixtures\consent-builder.ts:11: *       POST /api/modules/informed-consents/documents/{id}/validation
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:146:          fetch('/api/modules/informed-consents/collaboration/team/users'),
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:147:          fetch('/api/modules/informed-consents/collaboration/team?departmentName=General'),
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:191:      const response = await fetch('/api/modules/informed-consents/collaboration/team', {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1083:        const response = await fetch("/api/auth/me", {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1143:      const response = await fetch('/api/operations/notifications?limit=20', {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1163:      await fetch('/api/operations/notifications/read', {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1189:      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:373:          <button type="button" onClick={() => window.location.assign("/api/modules/informed-consents/imc-library/resolve/pdf")}><Download size={19} /></button>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:209:      const response = await fetch(
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:210:        `/api/modules/informed-consents/documents/${encodeURIComponent(
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\fixtures\patient-search.ts:10: *     - `mockPatients`   ΓåÆ GET /api/modules/informed-consents/patients/search
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\fixtures\patient-search.ts:11: *     - `mockEncounters` ΓåÆ GET /api/modules/informed-consents/patients/{id}/encounters
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\fixtures\status-tracking.ts:9: *     - `consentRecords` ΓåÆ GET /api/modules/informed-consents/documents
END MATCHES

## Mock static placeholder risks in apps/web/src/components/informed-consents

BEGIN MATCHES
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:294:            placeholder={
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:31:  status: "IMC Approved" | "Ready for Review" | "Clinical Review";
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:133:    status: "Ready for Review",
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:170:  if (s.includes("review")) return "Ready for Review";
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:270:        setError("Database templates unavailable. Showing local approved sample templates.");
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:348:            placeholder="Search by template, department, specialty, Arabic title, or ID"
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:142:            <SupportMetric label={isAr ? "╪º┘ä╪¡╪º┘ä╪⌐" : "Status"} value={isAr ? "╪¼╪º┘ç╪▓" : "Ready"} accent="gold" />
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:254:                placeholder={isAr ? "┘à╪½╪º┘ä: ┘à╪▒╪º╪¼╪╣╪⌐ ╪╡┘è╪º╪║╪⌐ ┘à┘ê╪º┘ü┘é╪⌐ ╪º┘ä╪¬╪«╪»┘è╪▒" : "Example: Review anesthesia consent wording"}
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:265:                placeholder={isAr ? "╪º┘â╪¬╪¿ ╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä╪╖┘ä╪¿..." : "Write request details..."}
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:235:            placeholder="Search approved consent library / ╪º┘ä╪¿╪¡╪½ ┘ü┘è ┘à┘â╪¬╪¿╪⌐ ╪º┘ä┘à┘ê╪º┘ü┘é╪º╪¬"
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:636:                        ['TrakCare API Connector', 'API Ready', 'Connector built and ready for production API connection upon receiving endpoint, credentials, and network authorization'],
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:637:                        ['DocuSign API Connector', 'API Ready', 'Connector built and ready for production signing API connection upon receiving production credentials and webhook approval'],
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:638:                        ['DocuWare Archive Connector', 'API Ready', 'Archive connector built and ready for production connection upon receiving archive mapping and credentials'],
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:639:                        ['Email Provider', 'Ready', 'Provider connector ready; pending final live credentials and smoke test'],
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:640:                        ['SMS / OTP Provider', 'Ready', 'Provider connector ready; pending final production smoke test'],
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:818:                    placeholder={isArabic ? '\u0627\u0643\u062a\u0628 \u0645\u0648\u0636\u0648\u0639 \u0627\u0644\u062a\u0648\u0627\u0635\u0644\u060c \u0648\u0627\u0644\u062d\u0627\u0644\u0629 \u0623\u0648 \u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0629 \u0627\u0644\u062a\u064a \u062a\u062d\u062a\u0627\u062c \u0645\u062a\u0627\u0628\u0639\u0629.' : 'Write the medical communication topic, case, or note requiring follow-up.'}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:875:                  <textarea required rows={5} className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm" placeholder={isArabic ? '\u0627\u0643\u062a\u0628 \u0645\u0648\u0636\u0648\u0639 \u0627\u0644\u0627\u0633\u062a\u0634\u0627\u0631\u0629\u060c \u0648\u0627\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u060c \u0648\u0623\u064a \u062d\u0627\u0644\u0629 \u0623\u0648 \u0645\u0631\u0641\u0642\u0627\u062a \u062a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629.' : 'Describe the legal question, consent issue, and any case or attachment that should be reviewed.'} />
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:938:                  <textarea required rows={5} className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm" placeholder={isArabic ? '\u0627\u0643\u062a\u0628 \u0645\u0627 \u0627\u0644\u0645\u0634\u0643\u0644\u0629\u060c \u0645\u062a\u0649 \u062d\u062f\u062b\u062a\u060c \u0648\u0645\u0627 \u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u062a\u064a \u062a\u062d\u062a\u0627\u062c \u0645\u0633\u0627\u0639\u062f\u0629 \u0628\u0634\u0623\u0646\u0647\u0627.' : 'Describe the issue, when it happened, and the step that requires support.'} />
apps/web/src/components/informed-consents\smart-experience\WathiqSmartConsentExperience.tsx:590:                      placeholder={t.searchPlaceholder}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:18:import { mockEncounters, mockPatients } from "./fixtures/patient-search";
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:131:const defaultPatient = mockPatients[0];
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:133:  mockEncounters.find((encounter) => encounter.status === "active") || mockEncounters[0];
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:304:  const [documentReady, setDocumentReady] = useState(false);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:384:      setDocumentReady(false);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:455:        setDocumentReady(false);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:526:        setDocumentReady(true);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:535:        setDocumentReady(false);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:600:        documentReady,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:661:            documentReady={documentReady}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:678:            documentReady={documentReady}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:78:    { stage: 'nursing-ready', label: 'Nursing Ready', time: null, done: false, icon: CheckCircle2 },
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:79:    { stage: 'ready-for-delivery', label: 'Ready for Patient Delivery', time: null, done: false, icon: Send },
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:162:    { stage: 'nursing-ready', label: 'Nursing Ready', time: null, done: currentIndex >= 4, icon: CheckCircle2 },
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:163:    { stage: 'ready-for-delivery', label: 'Ready for Patient Delivery', time: null, done: currentIndex >= 5, icon: Send },
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:866:                                          ? (lang === 'en' ? 'Nursing Ready' : '\u0627\u0644\u062a\u0645\u0631\u064a\u0636 \u062c\u0627\u0647\u0632')
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:868:                                            ? (lang === 'en' ? 'Ready to Send' : '\u062c\u0627\u0647\u0632 \u0644\u0644\u0625\u0631\u0633\u0627\u0644')
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:291:          <strong>Ready Soon</strong>
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:457:    ["PDPL Ready", "Patient data protection enabled"],
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:7:import { mockPatients, mockEncounters } from './fixtures/patient-search';
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:66:                placeholder={lang === 'en' ? 'Enter MRN, patient name, or national ID...' : '╪ú╪»╪«┘ä ╪▒┘é┘à ╪º┘ä┘à┘ä┘ü ╪º┘ä╪╖╪¿┘è ╪ú┘ê ╪º┘ä╪º╪│┘à ╪ú┘ê ╪▒┘é┘à ╪º┘ä┘ç┘ê┘è╪⌐...'}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:67:                className={`w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-4 py-2.5 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] focus:border-transparent placeholder:text-[#6B7280] ${lang === 'ar' ? 'pr-10 text-right' : 'pl-10'}`}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:97:            {mockPatients.map(p => (
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\PatientSearch.tsx:161:              {mockEncounters.map(enc => (
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:267:            placeholder="Search consent template, department, specialty, Arabic title, or ID"
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:353:  const [educationReady, setEducationReady] = useState(true);
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:604:                        <button key={item} type="button" className="done" onClick={() => setEducationReady(true)}>
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:625:                      <Field label="Education" value={educationReady ? "Completed" : "Pending"} icon={<BookOpen size={19} />} />
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:116:  NURSING_READY: { en: "Nursing Ready", ar: "\u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u062a\u0645\u0631\u064a\u0636 \u0645\u0624\u0643\u062f\u0629", variant: "ready" },
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:129:  const [nursingReady, setNursingReady] = useState(false);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:156:      setNursingReady(false);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:233:      setNursingReady(true);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:250:          nursingReady ? "nursing-readiness-confirmed" : "nursing-readiness-pending",
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:267:        nursingReady,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:277:              nursingReady ? "Nursing readiness confirmed" : "Nursing readiness pending",
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:598:                          placeholder={isAr ? "\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0633\u0631\u064a\u0631\u064a\u0629 \u062e\u0627\u0635\u0629 \u0628\u0627\u0644\u062a\u062e\u062f\u064a\u0631..." : "Anesthesia clinical notes..."}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:728:                {nursingReady
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:750:            { done: nursingReady || workflowStatus === "NOT_REQUIRED", label: isAr ? "\u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u062a\u0645\u0631\u064a\u0636" : "Nursing Ready" },
apps/web/src/components/informed-consents\enterprise-workflow\SmartConsentFastTrackPreview.tsx:280:                        {item.tone === "warning" ? "Review" : "Ready"}
apps/web/src/components/informed-consents\enterprise-workflow\figma-adapters\FigmaStatusTrackingAdapter.tsx:25:      status: isArabic ? "╪¼╪º┘ç╪▓╪⌐ ┘ä┘ä┘à╪╣╪º┘è┘å╪⌐" : "Ready for preview",
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\clinical\ValidationDrawer.tsx:53:            <CheckCircle2 className="w-3 h-3" />{ready} Ready
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\fixtures\patient-search.ts:10: *     - `mockPatients`   ΓåÆ GET /api/modules/informed-consents/patients/search
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\fixtures\patient-search.ts:11: *     - `mockEncounters` ΓåÆ GET /api/modules/informed-consents/patients/{id}/encounters
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\fixtures\patient-search.ts:14: *   mock data can be swapped out from one location.
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\fixtures\patient-search.ts:19:export const mockPatients: Patient[] = [
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\fixtures\patient-search.ts:35:export const mockEncounters: Encounter[] = [
apps/web/src/components/informed-consents\enterprise-workflow\figma-adapters\FigmaPatientSearchAdapter.tsx:66:                placeholder={
apps/web/src/components/informed-consents\enterprise-workflow\figma-adapters\FigmaPatientSearchAdapter.tsx:104:              {isArabic ? "╪¼╪º┘ç╪▓ ┘ä┘ä╪▒╪¿╪╖" : "Ready for binding"}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:57:  placeholder: string;
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:58:  placeholderAr: string;
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:71:    placeholder: 'Describe the procedure in plain language...', placeholderAr: '╪╡┘ü ╪º┘ä╪Ñ╪¼╪▒╪º╪í ╪¿┘ä╪║╪⌐ ┘ê╪º╪╢╪¡╪⌐...',
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:78:    placeholder: 'Clinical indication...', placeholderAr: '╪º┘ä┘à╪ñ╪┤╪▒ ╪º┘ä╪│╪▒┘è╪▒┘è...',
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:85:    placeholder: 'Procedure-specific and patient-specific risks...', placeholderAr: '┘à╪«╪º╪╖╪▒ ╪«╪º╪╡╪⌐ ╪¿╪º┘ä╪Ñ╪¼╪▒╪º╪í ┘ê╪º┘ä┘à╪▒┘è╪╢...',
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:92:    placeholder: 'Expected benefits and outcomes...', placeholderAr: '╪º┘ä┘ü┘ê╪º╪ª╪» ┘ê╪º┘ä┘å╪¬╪º╪ª╪¼ ╪º┘ä┘à╪¬┘ê┘é╪╣╪⌐...',
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:99:    placeholder: 'Conservative management, alternative procedures...', placeholderAr: '╪º┘ä╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä╪¬╪¡┘ü╪╕┘è╪⌐╪î ╪º┘ä╪Ñ╪¼╪▒╪º╪í╪º╪¬ ╪º┘ä╪¿╪»┘è┘ä╪⌐...',
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:106:    placeholder: 'What happens if the patient refuses...', placeholderAr: '┘à╪º ┘è╪¡╪»╪½ ╪Ñ╪░╪º ╪▒┘ü╪╢ ╪º┘ä┘à╪▒┘è╪╢...',
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:113:    placeholder: 'Any special warnings specific to this patient...', placeholderAr: '╪ú┘è ╪¬╪¡╪░┘è╪▒╪º╪¬ ╪«╪º╪╡╪⌐ ╪¿┘ç╪░╪º ╪º┘ä┘à╪▒┘è╪╢...',
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:236:                  placeholder={field.placeholder}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:258:                  placeholder={field.placeholderAr}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:273:                    placeholder={lang === 'en' ? 'Add internal physician note for this disclosure...' : '\u0623\u0636\u0641 \u0645\u0644\u0627\u062d\u0638\u0629 \u062f\u0627\u062e\u0644\u064a\u0629 \u0644\u0644\u0637\u0628\u064a\u0628 \u062d\u0648\u0644 \u0647\u0630\u0627 \u0627\u0644\u0625\u0641\u0635\u0627\u062d...'}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:86:  source?: "trakcare" | "cached_local" | "uat_mock";
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:87:  mockLabel?: string;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:164:  patientReady: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:165:  encounterReady: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:166:  templateReady: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:167:  procedureReady: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:168:  anesthesiaReady: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:169:  educationReady: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:170:  pdfReady: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:171:  auditReady: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:172:  patientLinkReady: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:173:  imcTemplateReady: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:174:  runtimeTemplateMappingReady: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:504:      tone: completionSummary.educationReady ? "success" as const : "warning" as const,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:510:      title: completionSummary.pdfReady ? "Review the generated draft PDF" : "Generate the draft PDF before release",
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:511:      titleAr: completionSummary.pdfReady ? "┘à╪▒╪º╪¼╪╣╪⌐ ┘à╪│┘ê╪»╪⌐ ╪º┘ä┘à╪│╪¬┘å╪» ╪º┘ä┘à┘å╪┤╪ú╪⌐" : "╪Ñ┘å╪┤╪º╪í ┘à╪│┘ê╪»╪⌐ ╪º┘ä┘à╪│╪¬┘å╪» ┘é╪¿┘ä ╪º┘ä╪Ñ╪╡╪»╪º╪▒",
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:514:      tone: completionSummary.pdfReady ? "success" as const : "warning" as const,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:898:  const runtimeTemplateMappingReady = Boolean(selectedRuntimeTemplate?.id && selectedRuntimeTemplate?.templateVersionId);
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:907:    const patientReady = Boolean(workflow.patientName && workflow.mrn && workflow.encounterNo);
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:908:    const encounterReady = Boolean(workflow.encounterNo);
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:909:    const templateReady = Boolean(workflow.consentCategory && workflow.templateName);
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:910:    const procedureReady = Boolean(workflow.procedureName);
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:911:    const anesthesiaReady = Boolean(workflow.anesthesiaDecision);
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:912:    const educationReady = Boolean(!workflow.educationRequired || workflow.educationPackage);
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:913:    const pdfReady = workflow.pdfStatus !== "PENDING";
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:914:    const auditReady = workflow.auditStatus === "ACTIVE";
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:915:    const patientLinkReady = workflow.consentStatus === "SENT" || workflow.consentStatus === "SIGNED";
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:916:    const imcTemplateReady =
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:921:      !runtimeTemplateMappingReady
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:929:      !imcTemplateReady
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:945:      !pdfReady
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:953:      !educationReady
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:961:      !patientLinkReady
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:977:      patientReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:978:      encounterReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:979:      templateReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:980:      procedureReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:981:      anesthesiaReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:982:      educationReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:983:      pdfReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:984:      auditReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:991:      !runtimeTemplateMappingReady ||
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:992:      !imcTemplateReady ||
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:994:      !patientReady ||
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:995:      !templateReady ||
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:996:      !procedureReady ||
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:997:      !educationReady ||
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:998:      !pdfReady;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1001:      patientReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1002:      encounterReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1003:      templateReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1004:      procedureReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1005:      anesthesiaReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1006:      educationReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1007:      pdfReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1008:      auditReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1009:      patientLinkReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1010:      imcTemplateReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1011:      runtimeTemplateMappingReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1333:          <StatusPill label="PDF Status" value={workflow.pdfStatus === "PENDING" ? "Pending" : "Draft Ready"} valueAr={workflow.pdfStatus === "PENDING" ? "┘é┘è╪» ╪º┘ä╪Ñ┘å╪┤╪º╪í" : "╪¼╪º┘ç╪▓╪⌐"} tone="amber" />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1568:              <StatusMetric title="PDF" value={completionSummary.pdfReady ? "Ready" : "Pending"} tone={completionSummary.pdfReady ? "green" : "amber"} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1569:              <StatusMetric title="Template" value={completionSummary.runtimeTemplateMappingReady ? "Mapped" : "Blocked"} tone={completionSummary.runtimeTemplateMappingReady ? "green" : "red"} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1570:              <StatusMetric title="Send" value={completionSummary.sendBlocked ? "Blocked" : "Ready"} tone={completionSummary.sendBlocked ? "amber" : "green"} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1588:              <p className="mt-1 text-sm text-[#4B5563]">{completionSummary.runtimeTemplateMappingReady ? "Runtime mapping active" : "Mapping pending"}</p>
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1597:            <ReadinessItem label="Patient and encounter locked" labelAr="╪¬┘à ╪¬╪½╪¿┘è╪¬ ╪º┘ä┘à╪▒┘è╪╢ ┘ê╪º┘ä╪▓┘è╪º╪▒╪⌐" ready={completionSummary.patientReady && completionSummary.encounterReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1598:            <ReadinessItem label="IMC and runtime template aligned" labelAr="╪¬┘à╪¬ ┘à┘ê╪º╪í┘à╪⌐ IMC ┘à╪╣ ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪¬╪┤╪║┘è┘ä┘è" ready={completionSummary.imcTemplateReady && completionSummary.runtimeTemplateMappingReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1599:            <ReadinessItem label="Anesthesia path documented" labelAr="╪¬┘à ╪¬┘ê╪½┘è┘é ┘à╪│╪º╪▒ ╪º┘ä╪¬╪«╪»┘è╪▒" ready={completionSummary.anesthesiaReady} warning={workflow.anesthesiaReviewRequired} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1600:            <ReadinessItem label="Draft PDF reviewed" labelAr="╪¬┘à╪¬ ┘à╪▒╪º╪¼╪╣╪⌐ ┘à╪│┘ê╪»╪⌐ ╪º┘ä┘à╪│╪¬┘å╪»" ready={completionSummary.pdfReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1806:          <p className={completionSummary.pdfReady ? "mt-1 text-sm font-bold text-emerald-700" : "mt-1 text-sm font-bold text-amber-700"}>
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1807:            {completionSummary.pdfReady ? "Draft Ready" : "Pending"}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1813:          <p className={completionSummary.auditReady ? "mt-1 text-sm font-bold text-emerald-700" : "mt-1 text-sm font-bold text-amber-700"}>
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1814:            {completionSummary.auditReady ? "Active" : "Incomplete"}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1821:            {completionSummary.sendBlocked ? "Ready Check" : "Ready"}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2033:                placeholder="Example: MRN, patient name, case number"
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2241:              Ready for template resolution
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2273:  const runtimeMappingReady = Boolean(runtimeTemplate?.id && runtimeTemplate?.templateVersionId);
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2297:        runtimeMappingReady
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2553:              <ReadinessItem label="Patient context bound" labelAr="╪¬┘à ╪▒╪¿╪╖ ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä┘à╪▒┘è╪╢" ready={completionSummary.patientReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2554:              <ReadinessItem label="Template governance passed" labelAr="╪¬┘à ╪º╪¼╪¬┘è╪º╪▓ ╪¡┘ê┘â┘à╪⌐ ╪º┘ä┘é╪º┘ä╪¿" ready={completionSummary.imcTemplateReady && completionSummary.runtimeTemplateMappingReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2555:              <ReadinessItem label="Procedure and anesthesia captured" labelAr="╪¬┘à ╪¬╪│╪¼┘è┘ä ╪º┘ä╪Ñ╪¼╪▒╪º╪í ┘ê╪º┘ä╪¬╪«╪»┘è╪▒" ready={completionSummary.procedureReady && completionSummary.anesthesiaReady} warning={workflow.anesthesiaReviewRequired} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2556:              <ReadinessItem label="Draft artifact created" labelAr="╪¬┘à ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘à╪│┘ê╪»╪⌐" ready={completionSummary.pdfReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2571:            <strong>IMC Template-First Draft Ready.</strong>
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2602:          <ReadinessItem label="Patient selected" labelAr="╪¬┘à ╪º╪«╪¬┘è╪º╪▒ ╪º┘ä┘à╪▒┘è╪╢" ready={completionSummary.patientReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2603:          <ReadinessItem label="Encounter selected" labelAr="╪¬┘à ╪º╪«╪¬┘è╪º╪▒ ╪º┘ä╪▓┘è╪º╪▒╪⌐" ready={completionSummary.encounterReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2604:          <ReadinessItem label="Template selected" labelAr="╪¬┘à ╪º╪«╪¬┘è╪º╪▒ ╪º┘ä┘é╪º┘ä╪¿" ready={completionSummary.templateReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2605:          <ReadinessItem label="IMC approved template" labelAr="┘å┘à┘ê╪░╪¼ ┘à╪╣╪¬┘à╪» ┘à┘å ╪º┘ä┘à╪▒┘â╪▓ ╪º┘ä╪╖╪¿┘è ╪º┘ä╪»┘ê┘ä┘è" ready={completionSummary.imcTemplateReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2606:          <ReadinessItem label="Procedure details completed" labelAr="╪¬┘à ╪Ñ┘â┘à╪º┘ä ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪Ñ╪¼╪▒╪º╪í" ready={completionSummary.procedureReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2607:          <ReadinessItem label="Education package selected" labelAr="╪¡╪▓┘à╪⌐ ╪º┘ä╪¬╪½┘é┘è┘ü ┘à┘â╪¬┘à┘ä╪⌐" ready={completionSummary.educationReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2608:          <ReadinessItem label="Draft PDF generated" labelAr="╪¬┘à ╪Ñ┘å╪┤╪º╪í ┘à╪│┘ê╪»╪⌐ ╪º┘ä┘à╪│╪¬┘å╪»" ready={completionSummary.pdfReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2647:              <p className="font-extrabold text-emerald-900">Send Readiness: Ready</p>
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2708:              {completionSummary.sendBlocked ? "Blocked" : "Ready"}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2713:          <ReadinessItem label="Patient selected" labelAr="╪¬┘à ╪º╪«╪¬┘è╪º╪▒ ╪º┘ä┘à╪▒┘è╪╢" ready={completionSummary.patientReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2714:          <ReadinessItem label="Encounter selected" labelAr="╪¬┘à ╪º╪«╪¬┘è╪º╪▒ ╪º┘ä╪▓┘è╪º╪▒╪⌐" ready={completionSummary.encounterReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2715:          <ReadinessItem label="Template selected" labelAr="╪¬┘à ╪º╪«╪¬┘è╪º╪▒ ╪º┘ä┘é╪º┘ä╪¿" ready={completionSummary.templateReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2716:          <ReadinessItem label="IMC approved template" labelAr="┘å┘à┘ê╪░╪¼ ┘à╪╣╪¬┘à╪» ┘à┘å ╪º┘ä┘à╪▒┘â╪▓ ╪º┘ä╪╖╪¿┘è ╪º┘ä╪»┘ê┘ä┘è" ready={completionSummary.imcTemplateReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2717:          <ReadinessItem label="Procedure details completed" labelAr="╪¬┘à ╪Ñ┘â┘à╪º┘ä ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪Ñ╪¼╪▒╪º╪í" ready={completionSummary.procedureReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2718:          <ReadinessItem label="Anesthesia decision" labelAr="┘é╪▒╪º╪▒ ╪º┘ä╪¬╪«╪»┘è╪▒" ready={completionSummary.anesthesiaReady} warning={workflow.anesthesiaReviewRequired} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2719:          <ReadinessItem label="Education package" labelAr="╪¡╪▓┘à╪⌐ ╪º┘ä╪¬╪½┘é┘è┘ü" ready={completionSummary.educationReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2720:          <ReadinessItem label="Draft PDF generated" labelAr="┘à╪│┘ê╪»╪⌐ ╪º┘ä┘à╪│╪¬┘å╪»" ready={completionSummary.pdfReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2721:          <ReadinessItem label="Patient link sent" labelAr="╪▒╪º╪¿╪╖ ╪º┘ä┘à╪▒┘è╪╢" ready={completionSummary.patientLinkReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2763:              IMC Template-First Draft Ready
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2790:        <StatusMetric title="PDF Evidence" value={completionSummary.pdfReady ? "Available" : "Pending"} tone={completionSummary.pdfReady ? "green" : "amber"} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2791:        <StatusMetric title="Audit Trail" value={completionSummary.auditReady ? "Active" : "Attention"} tone={completionSummary.auditReady ? "green" : "amber"} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2798:            <ReadinessItem label="Patient and encounter" labelAr="╪º┘ä┘à╪▒┘è╪╢ ┘ê╪º┘ä╪▓┘è╪º╪▒╪⌐" ready={completionSummary.patientReady && completionSummary.encounterReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2799:            <ReadinessItem label="Template governance" labelAr="╪¡┘ê┘â┘à╪⌐ ╪º┘ä┘é╪º┘ä╪¿" ready={completionSummary.templateReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2800:            <ReadinessItem label="Procedure disclosure" labelAr="╪Ñ┘ü╪╡╪º╪¡ ╪º┘ä╪Ñ╪¼╪▒╪º╪í" ready={completionSummary.procedureReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2802:            <ReadinessItem label="PDF evidence" labelAr="╪»┘ä┘è┘ä ╪º┘ä┘à╪│╪¬┘å╪»" ready={completionSummary.pdfReady} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2877:  placeholder,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2882:  placeholder?: string;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2890:        placeholder={placeholder}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:29:  documentReady?: boolean;
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:104:  documentNotReady:
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:132:  documentReady = false,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:159:    documentReady &&
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:179:    if (!linkedDocumentId || !documentReady) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:183:          : ar.documentNotReady,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:417:      {(licenseExpired || documentError || sendError || !linkedDocumentId || !documentReady) && (
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:429:                  : ar.documentNotReady)}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:462:              placeholder={lang === "en" ? "Optional for SMS only" : "╪º╪«╪¬┘è╪º╪▒┘è ╪╣┘å╪» ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪¿╪▒╪│╪º┘ä╪⌐ ┘å╪╡┘è╪⌐ ┘ü┘é╪╖"}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepValidation.tsx:44:                ? (lang === 'en' ? 'Ready to Send ΓÇö All critical items complete' : '╪¼╪º┘ç╪▓ ┘ä┘ä╪Ñ╪▒╪│╪º┘ä ΓÇö ╪¼┘à┘è╪╣ ╪º┘ä╪╣┘å╪º╪╡╪▒ ╪º┘ä╪¡╪▒╪¼╪⌐ ┘à┘â╪¬┘à┘ä╪⌐')
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepValidation.tsx:146:              <p className={`text-[10px] mt-0.5 ${item.ready ? 'text-emerald-600' : 'text-amber-600'}`}>{item.ready ? 'Ready' : 'Pending'}</p>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPreview.tsx:7:  documentReady?: boolean;
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPreview.tsx:18:  documentReady,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPreview.tsx:119:              {documentReady
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepPreview.tsx:122:                  : "Ready for review"
END MATCHES

## Loading error and empty states in apps/web/src/components/informed-consents

BEGIN MATCHES
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:92:const emptyCollaborationTeamSettings: CollaborationTeamSettings = {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:124:  const [collaborationTeam, setCollaborationTeam] = useState<CollaborationTeamSettings>(emptyCollaborationTeamSettings);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:125:  const [isLoadingCollaborationTeam, setIsLoadingCollaborationTeam] = useState(false);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:167:      } catch (error) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:168:        console.error('Failed to load clinical collaboration team settings', error);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:209:          payload?.error ||
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:215:    } catch (error) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:216:      console.error('Failed to save clinical collaboration team settings', error);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:217:      const message = error instanceof Error ? error.message : '';
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:517:                                disabled={isLoadingCollaborationTeam}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1075:  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1101:      } catch (error) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1102:        console.error("Failed to load runtime header context", error);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1154:    } catch (error) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1155:      console.error('Failed to load consent notifications', error);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1172:    } catch (error) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1173:      console.error('Failed to mark consent notifications as read', error);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:1376:                    {isLoadingNotifications ? (
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:232:          result?.error ||
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:247:    } catch (error) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:249:        error instanceof Error
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:250:          ? error.message
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:60:  const [loading, setLoading] = useState(false);
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:61:  const [error, setError] = useState("");
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:181:        setError(payload?.error || (isAr ? "\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0633\u062c\u0644 \u0627\u0644\u062a\u0639\u0627\u0648\u0646." : "Failed to create collaboration event."));
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:244:        {error ? (
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:246:            {error}
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:260:                disabled={loading || isUnavailable}
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:262:                aria-disabled={loading || isUnavailable}
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:303:            disabled={loading}
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:99:  const [loading, setLoading] = React.useState(false);
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:101:  const [error, setError] = React.useState<string | null>(null);
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:173:            payload?.error ||
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:243:          disabled={loading}
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:246:          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:251:      {error && (
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:254:          {error}
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:267:          {loading && (
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:274:          {!loading && items.length === 0 && (
apps/web/src/components/informed-consents\enterprise-workflow\ConsentSearchEngine.tsx:281:          {!loading &&
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:230:  const [source, setSource] = useState<"database" | "fallback" | "loading">("loading");
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:231:  const [error, setError] = useState<string | null>(null);
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:237:      setSource("loading");
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:338:          <span className={source === "database" ? "wc-source-pill db" : source === "loading" ? "wc-source-pill loading" : "wc-source-pill fallback"}>
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:339:            {source === "database" ? "Database connected" : source === "loading" ? "Loading templates" : "Fallback templates"}
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:378:      {error && <div className="wc-template-error">{error}</div>}
apps/web/src/components/informed-consents\enterprise-workflow\ConsentTemplateSearchPanel.tsx:422:            <div className="wc-template-empty">
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:165:        console.error("Cannot request anesthesia review: linkedDocumentId is missing");
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:184:    } catch (error) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:185:      console.error("Failed to request anesthesia review", error);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:200:    } catch (error) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:201:      console.error("Failed to start anesthesia review", error);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:218:    } catch (error) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:219:      console.error("Failed to approve anesthesia", error);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:235:    } catch (error) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:236:      console.error("Failed to confirm nursing readiness", error);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:423:          const errorText = await templatesResponse.text().catch(() => "");
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:427:              errorText ? ` - ${errorText.slice(0, 300)}` : ""
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:503:          | { message?: string; error?: string }
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:509:              (draftPayload && "error" in draftPayload && draftPayload.error) ||
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:532:      } catch (error) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:537:          error instanceof Error ? error.message : "Failed to link consent document",
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:540:        console.error("[ConsentBuilder] LINK ERROR", error);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\ConsentBuilder.tsx:541:        throw error;
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:61:  id: 'loading',
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:68:  status: 'loading',
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:195:  const [isLoadingTrackingRecords, setIsLoadingTrackingRecords] = useState(true);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:470:      const errorPayload = await response.json().catch(() => null);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:471:      const message = typeof errorPayload?.error === 'string'
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:472:        ? errorPayload.error
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:531:      const errorPayload = await response.json().catch(() => null);
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:532:      const message = typeof errorPayload?.error === 'string'
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:533:        ? errorPayload.error
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:735:    } catch (error) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:736:      const message = error instanceof Error ? error.message : 'Resend failed.';
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:775:    } catch (error) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:776:      const message = error instanceof Error ? error.message : 'Revoke failed.';
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:350:  const [templateSource, setTemplateSource] = useState<"loading" | "database" | "fallback">("loading");
apps/web/src/components/informed-consents\enterprise-workflow\FunctionalConsentIssuanceWorkflow.tsx:487:              <Field label="Template Source" value={templateSource === "database" ? "Database Connected" : templateSource === "loading" ? "Loading" : "Fallback"} icon={<BadgeCheck size={19} />} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:631:          throw new Error(payload?.error || "Failed to load collaboration team users.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:644:      } catch (error) {
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:647:          setReviewTeamError(error instanceof Error ? error.message : "Failed to load collaboration team users.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:683:          throw new Error(payload?.message || payload?.error || "Failed to load IMC approved consent library.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:689:      } catch (error) {
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:692:          setImcLibraryError(error instanceof Error ? error.message : "Failed to load IMC approved consent library.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:729:          throw new Error(payload?.message || payload?.error || "Failed to resolve IMC approved consent package.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:748:      } catch (error) {
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:751:          setImcResolveError(error instanceof Error ? error.message : "Failed to resolve IMC approved consent package.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:794:        throw new Error(payload?.error || "Patient search failed.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:798:    } catch (error) {
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:800:      setPatientSearchError(error instanceof Error ? error.message : "Patient search failed.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:827:        throw new Error(payload?.error || "Failed to load patient encounters.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:831:    } catch (error) {
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:833:      setEncountersError(error instanceof Error ? error.message : "Failed to load patient encounters.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:868:          throw new Error(payload?.error || "Failed to load runtime consent templates.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:874:      } catch (error) {
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:877:          setRuntimeTemplatesError(error instanceof Error ? error.message : "Failed to load runtime consent templates.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1111:        throw new Error(payload?.error || payload?.message || "Failed to generate draft PDF.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1135:    } catch (error) {
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1142:      setDraftGenerationError(error instanceof Error ? error.message : "Failed to generate draft PDF.");
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1229:                loading={reviewTeamLoading}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1231:                error={reviewTeamError}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1653:                loading={imcLibraryLoading}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1655:                error={imcLibraryError}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1829:  loading,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1830:  error,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1833:  loading: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1834:  error: string;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1844:  if (loading) {
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1853:  if (error) {
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1857:        <p className="mt-1 text-xs">{error}</p>
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2250:  loading,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2252:  error,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2260:  loading: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2262:  error: string;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2291:          {loading ? "Loading..." : `${libraryItems.length} Active Items`}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2318:      {error || resolveError ? (
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2320:          {error || resolveError}
END MATCHES

## Audit and logging references in apps/web/src/components/informed-consents

BEGIN MATCHES
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:110:    auditLogEnabled: true,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:252:      description: isArabic ? '\u0625\u062f\u0627\u0631\u0629 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628 \u0648\u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0648\u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0648\u0627\u0644\u0623\u0631\u0634\u0641\u0629 \u0648\u0633\u062c\u0644 \u0627\u0644\u062a\u062f\u0642\u064a\u0642.' : 'Manage account settings, alerts, sync, archiving, and audit log.',
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:642:                        ['Audit Log', 'Enabled', 'Immutable activity record'],
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\App.tsx:964:          {isArabic ? '\u062c\u0645\u064a\u0639 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0648\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u062a\u0633\u062c\u0644 \u0644\u0623\u063a\u0631\u0627\u0636 \u0627\u0644\u062a\u062f\u0642\u064a\u0642 \u0648\u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644 \u0648\u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.' : 'All requests and actions are logged for audit, compliance, and data protection.'}
apps/web/src/components/informed-consents\enterprise-workflow\EnterpriseSupportSettingsPanel.tsx:210:            <SettingToggle label={isAr ? "╪¬┘ü╪╣┘è┘ä ╪│╪¼┘ä ╪º┘ä╪¬╪»┘é┘è┘é ┘ä┘ä╪¬╪╣╪º┘ê┘å ╪º┘ä╪»╪º╪«┘ä┘è" : "Enable audit trail for internal collaboration"} defaultChecked />
apps/web/src/components/informed-consents\collaboration\ConsentCollaborationPanel.tsx:240:            {isAr ? "\u0645\u0648\u062b\u0642 \u0641\u064a \u0627\u0644\u0633\u062c\u0644" : "Audit-ready"}
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:129:          ["Reports & Audit", ClipboardList],
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:144:          <button key={label as string} type="button" className={index === 0 ? "wc-nav-item active" : "wc-nav-item"} onClick={() => window.location.assign((label as string) === "Informed Consents" || (label as string) === "My Consents" ? "/modules/informed-consents" : (label as string) === "Encounters" || (label as string) === "Appointments" ? "/modules/informed-consents/physician-workflow" : (label as string) === "Patients" ? "/modules/informed-consents/list" : (label as string) === "Templates" || (label as string) === "My Documents" ? "/modules/informed-consents/template-registry" : (label as string) === "Education Library" ? "/admin/procedure-education" : (label as string) === "Anesthesia" ? "/modules/informed-consents/physician-workflow?step=anesthesia" : (label as string) === "Reports & Audit" ? "/modules/informed-consents/governance-reports" : (label as string) === "Notifications" || (label as string) === "Messages" ? "/alerts" : (label as string) === "Institution Settings" || (label as string) === "Profile & Settings" ? "/modules/informed-consents/settings-support" : "/modules/informed-consents")}>
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:456:    ["Audit Trail Active", "All actions are being recorded"],
apps/web/src/components/informed-consents\enterprise-workflow\WathiqConsentModeSurface.tsx:538:    ["Audit Trail Active", "All actions are being recorded", ShieldCheck],
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\clinical\ValidationDrawer.tsx:106:          {['Patient View', 'PDF Doc', 'Evidence Pkg', 'Audit Trail'].map(label => (
apps/web/src/components/informed-consents\enterprise-workflow\SmartConsentFastTrackPreview.tsx:228:                  <p className="mt-1 font-bold text-slate-800">PDF + Audit + Evidence</p>
apps/web/src/components/informed-consents\enterprise-workflow\SmartConsentFastTrackPreview.tsx:350:                The digital flow keeps the speed of paper while adding PDF, audit trail, evidence
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:36:type EnterpriseSection = "issueConsent" | "consentLibrary" | "collaboration" | "statusAudit" | "supportSettings";
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:161:  auditStatus: "ACTIVE" | "INCOMPLETE";
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:171:  auditReady: boolean;
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:367:    key: "statusAudit",
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:368:    title: "Status & Audit",
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:396:  auditStatus: "ACTIVE",
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:523:      : "All required clinical, educational, document, and audit checks are complete.",
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:914:    const auditReady = workflow.auditStatus === "ACTIVE";
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:984:      auditReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1008:      auditReady,
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1170:            onClick={() => setActiveSection("statusAudit")}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1174:            View Full Audit Log / ╪╣╪▒╪╢ ╪│╪¼┘ä ╪º┘ä╪¬╪»┘é┘è┘é ╪º┘ä┘â╪º┘à┘ä
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1250:          ) : activeSection === "statusAudit" ? (
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1251:            <StatusAuditWorkspace workflow={workflow} completionSummary={completionSummary} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1334:          <StatusPill label="Audit Status" value="Active" valueAr="┘å╪┤╪╖" tone="green" />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1401:        <p className="mt-1 text-sm text-white/78">Navigate clinical issuance, collaboration, audit, and support.</p>
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1776:            Completion status across patient, encounter, IMC template, PDF, audit, and release checks.
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1812:          <p className="text-sm font-extrabold text-[#002B5C]">Audit Trail</p>
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1813:          <p className={completionSummary.auditReady ? "mt-1 text-sm font-bold text-emerald-700" : "mt-1 text-sm font-bold text-amber-700"}>
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:1814:            {completionSummary.auditReady ? "Active" : "Incomplete"}
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2649:                All required clinical, educational, document, and audit checks are complete.
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2774:function StatusAuditWorkspace({
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2783:      title="Status & Audit"
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2785:      description="Operational status, evidence readiness, audit trail checkpoints, and final send blockers."
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2791:        <StatusMetric title="Audit Trail" value={completionSummary.auditReady ? "Active" : "Attention"} tone={completionSummary.auditReady ? "green" : "amber"} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2806:        <PanelCard title="Audit Timeline" titleAr="╪│╪¼┘ä ╪º┘ä╪¬╪»┘é┘è┘é">
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2808:            <AuditRow title="Draft created" subtitle="Physician initiated informed consent workflow." />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2809:            <AuditRow title="Template selected" subtitle={workflow.templateName} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2810:            <AuditRow title="Anesthesia decision captured" subtitle={`${getAnesthesiaLabel(workflow.anesthesiaDecision)} / ${getAnesthesiaLabelAr(workflow.anesthesiaDecision)}`} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:2811:            <AuditRow title="PDF status" subtitle={workflow.pdfStatus} />
apps/web/src/components/informed-consents\enterprise-workflow\PhysicianConsentWorkflow.tsx:3088:function AuditRow({ title, subtitle }: { title: string; subtitle: string }) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepAnesthesia.tsx:273:        auditEvents: anesthesiaApplies
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:65:  inAudit: boolean;
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:74:    required: true, inPatientView: true, inPDF: true, inEvidence: true, inAudit: true,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:81:    required: true, inPatientView: true, inPDF: true, inEvidence: true, inAudit: true,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:88:    required: true, inPatientView: true, inPDF: true, inEvidence: true, inAudit: true,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:95:    required: true, inPatientView: true, inPDF: true, inEvidence: true, inAudit: false,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:102:    required: true, inPatientView: true, inPDF: true, inEvidence: true, inAudit: true,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:109:    required: true, inPatientView: true, inPDF: true, inEvidence: true, inAudit: true,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:116:    required: false, inPatientView: true, inPDF: true, inEvidence: true, inAudit: true,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:197:          <ClipboardCheck className="w-3.5 h-3.5 text-[#6B7280]" /><span className="text-xs text-[#6B7280]">Audit Trail</span>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepDisclosures.tsx:213:                <IndicatorTag active={field.inAudit} label="Audit" />
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepSend.tsx:597:            lang === "en" ? "I understand this action will be recorded in the audit trail." : ar.confirm4,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:198:  const [auditActionsByConsentId, setAuditActionsByConsentId] = useState<Record<string, Array<{
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:212:    const action = typeof item.action === 'string' ? item.action : 'timeline_event';
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:232:      const response = await fetch(`/api/modules/informed-consents/documents/${encodeURIComponent(consentId)}/timeline`, {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:241:      const timeline = await response.json();
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:243:      if (Array.isArray(timeline)) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:244:        const normalized = normalizeTimelineEvents(timeline).reverse();
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:246:        setAuditActionsByConsentId((current) => ({
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:252:      // Keep local fixture/fallback timeline if API is unavailable.
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:558:    setAuditActionsByConsentId((current) => ({
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:567:      const response = await fetch(`/api/modules/informed-consents/documents/${encodeURIComponent(consentId)}/timeline`, {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:588:      const timeline = await response.json();
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:590:      if (Array.isArray(timeline)) {
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:591:        const normalized = normalizeTimelineEvents(timeline).reverse();
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:593:        setAuditActionsByConsentId((current) => ({
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:664:  const selectedFixtureAuditTrail = [
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:675:  const selectedAuditTrail = [
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:676:    ...(auditActionsByConsentId[selected.id] || []),
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:677:    ...selectedFixtureAuditTrail,
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:680:  const selectedRecentAuditActions = auditActionsByConsentId[selected.id] || [];
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:822:        <p className="text-sm text-[#6B7280] mt-0.5">{lang === 'en' ? 'Monitor consent lifecycle, view audit trail, and manage sent consents.' : '╪▒╪º┘é╪¿ ╪»┘ê╪▒╪⌐ ╪¡┘è╪º╪⌐ ╪º┘ä┘à┘ê╪º┘ü┘é╪⌐ ┘ê╪º╪╣╪▒╪╢ ┘à╪│╪º╪▒ ╪º┘ä╪¬╪»┘é┘è┘é ┘ê╪ú╪»╪▒ ╪º┘ä┘à┘ê╪º┘ü┘é╪º╪¬ ╪º┘ä┘à╪▒╪│┘ä╪⌐.'}</p>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:956:            {/* Audit trail */}
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:969:                <span className="text-sm font-semibold text-[#2F2F2F]">{lang === 'en' ? 'Audit Trail' : '┘à╪│╪º╪▒ ╪º┘ä╪¬╪»┘é┘è┘é'}</span>
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:973:                {selectedRecentAuditActions.length > 0 ? (
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:979:                      {selectedRecentAuditActions.map((item, index) => (
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\StatusTracking.tsx:991:                {selectedAuditTrail.map((item, index) => (
apps/web/src/components/informed-consents\_legacy-rejected\final-ui-rejected-20260608\steps\StepValidation.tsx:139:            { label: lang === 'en' ? 'Audit Trail' : '┘à╪│╪º╪▒ ╪º┘ä╪¬╪»┘é┘è┘é', ready: true },
END MATCHES

## Buttons and clickable handlers in apps/web/src/lib

_No matches found._

## Inputs selects and forms in apps/web/src/lib

BEGIN MATCHES
apps/web/src/lib\pdf-engine\core\pdf-renderer.ts:35:    <meta name="viewport" content="width=device-width, initial-scale=1" />
apps/web/src/lib\server\email-provider.ts:38:  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2103:        "Content-Disposition": `${args.disposition || "attachment"}; filename="CONSENT-${payload.consentDocumentId}-${args.copyType}-${lang}.pdf"`,
apps/web/src/lib\server\pilot-email-override.ts:156:  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
END MATCHES

## API calls in apps/web/src/lib

BEGIN MATCHES
apps/web/src/lib\api.ts:29:		const res = await fetch(url, {
apps/web/src/lib\services\dischargeCases.service.ts:226:    const response = await apiFetch<CaseApiResponse>(`/api/cases/${encodeURIComponent(caseId)}`);
apps/web/src/lib\services\dischargeCases.service.ts:231:    return apiFetch<EvidenceBundleResponse>(`/api/discharge/evidence-bundle/${encodeURIComponent(caseId)}`, {
apps/web/src/lib\services\dischargeCases.service.ts:237:    await viewProtectedDocument(`/api/discharge/pdf/${encodeURIComponent(fileName)}`);
apps/web/src/lib\modules\patient-education-events.ts:6: * server route (`POST /api/modules/informed-consents/events/patient-education`)
apps/web/src/lib\modules\patient-education-events.ts:43:const ENDPOINT = "/api/modules/informed-consents/events/patient-education";
apps/web/src/lib\modules\patient-education-events.ts:57:    const response = await fetch(ENDPOINT, {
apps/web/src/lib\services\dischargeRefusalWorkflow.service.ts:287:    apiFetch<BackendWorkflowResponse>(`/api/discharge/cases/${encodeURIComponent(caseId)}/workflow`),
apps/web/src/lib\services\dischargeRefusalWorkflow.service.ts:288:    apiFetch<BackendAuditLog[]>(`/api/discharge/audit/${encodeURIComponent(caseId)}`).catch(() => []),
apps/web/src/lib\services\dischargeRefusalWorkflow.service.ts:289:    apiFetch<BackendCaseDocumentResponse[]>(`/api/discharge/cases/${encodeURIComponent(caseId)}/documents`).catch(
apps/web/src/lib\services\dischargeRefusalWorkflow.service.ts:314:  await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/workflow/actions`, {
apps/web/src/lib\services\legalAlerts.service.ts:68:    return apiFetch<LegalAlertListResponse>(`/api/legal/alerts${query ? `?${query}` : ""}`, {
apps/web/src/lib\services\legalAlerts.service.ts:76:        `/api/legal/alerts/${encodeURIComponent(alertId)}/acknowledge`,
apps/web/src/lib\services\legalAlerts.service.ts:86:    return apiFetch<NotificationSettings>("/api/legal/notifications/settings", {
apps/web/src/lib\services\legalAlerts.service.ts:93:    return apiFetch<NotificationSettings>("/api/legal/notifications/settings", {
apps/web/src/lib\tracking.ts:312:    const response = await fetch("/api/analytics/events", {
apps/web/src/lib\services\refusalForms.service.ts:36:      const cases = await apiFetch<CaseRow[]>("/api/cases?limit=200");
apps/web/src/lib\services\refusalForms.service.ts:44:            `/api/discharge/cases/${encodeURIComponent(caseData.id)}/workflow`
apps/web/src/lib\services\refusalForms.service.ts:84:    await apiFetch(`/api/documents/${encodeURIComponent(formId)}/sign`, {
apps/web/src/lib\services\refusalForms.service.ts:104:    return `/api/documents/${documentId}/download`;
apps/web/src/lib\services\refusalForms.service.ts:130:      documentUrl: doc.id ? `/api/documents/${doc.id}/download` : null,
apps/web/src/lib\services\medicalDischargeRefusal.service.ts:21:    `/api/discharge/cases?limit=${encodeURIComponent(String(limit))}`,
apps/web/src/lib\services\medicalDischargeRefusal.service.ts:26:  return apiFetch<Record<string, unknown>>(`/api/discharge/cases/${encodeURIComponent(caseId)}/workflow`);
apps/web/src/lib\services\medicalDischargeRefusal.service.ts:34:  return apiFetch<WorkflowActionResult>(`/api/discharge/cases/${encodeURIComponent(caseId)}/workflow/actions`, {
apps/web/src/lib\services\medicalDischargeRefusal.service.ts:41:  return apiFetch<RefusalQualityMetrics>("/api/discharge/reports/refusal-quality");
apps/web/src/lib\services\medicalDischargeRefusal.service.ts:46:    "/api/discharge/forms-library/medical-legal/templates",
apps/web/src/lib\server\ai-legal-intelligence.ts:99:  const response = await fetch("https://api.openai.com/v1/chat/completions", {
apps/web/src/lib\server\backendProxy.ts:228:            const backendResponse = await fetch(built.url, {
apps/web/src/lib\services\legalPackage.service.ts:5:        ? `${configuredBase}/api/cases/${caseId}/legal-package`
apps/web/src/lib\services\legalPackage.service.ts:6:        : `/api/cases/${caseId}/legal-package`;
apps/web/src/lib\services\legalPackage.service.ts:8:    const res = await fetch(endpoint, {
apps/web/src/lib\services\legalOrchestration.service.ts:49:        return apiFetch<LegalCaseSummary>(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/summary`);
apps/web/src/lib\services\legalOrchestration.service.ts:53:        return apiFetch<LegalControlDashboard>("/api/discharge/reports/legal-control-dashboard");
apps/web/src/lib\services\legalOrchestration.service.ts:57:        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/decision-event`, {
apps/web/src/lib\services\legalOrchestration.service.ts:64:        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/state-transition`, {
apps/web/src/lib\services\legalOrchestration.service.ts:71:        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/master-document`, {
apps/web/src/lib\services\legalOrchestration.service.ts:78:        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/evidence-package`, {
apps/web/src/lib\services\legalOrchestration.service.ts:84:        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/financial-acknowledgment`, {
apps/web/src/lib\services\legalOrchestration.service.ts:91:        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/promissory-note`, {
apps/web/src/lib\services\legalOrchestration.service.ts:98:        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/escalation-event`, {
apps/web/src/lib\services\legalOrchestration.service.ts:105:        return apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/notice-presentation`, {
apps/web/src/lib\services\legalOrchestration.service.ts:112:        return apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/patient-response`, {
apps/web/src/lib\services\legalOrchestration.service.ts:119:        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/home-healthcare-agreement`, {
apps/web/src/lib\services\legalOrchestration.service.ts:126:        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/equipment-lease`, {
apps/web/src/lib\services\legalOrchestration.service.ts:133:        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/undertaking`, {
apps/web/src/lib\services\legalEscalation.service.ts:14:      const cases = await apiFetch<LegalEscalationCase[]>("/api/discharge/cases/legal-escalation");
apps/web/src/lib\services\legalEscalation.service.ts:27:      return await apiFetch<LegalEscalationCase>(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-escalation`);
apps/web/src/lib\services\legalEscalation.service.ts:43:      `/api/discharge/cases/${encodeURIComponent(caseId)}/legal-escalation/notes`,
apps/web/src/lib\services\legalEscalation.service.ts:58:    await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-escalation/resolve`, {
apps/web/src/lib\services\legalEscalation.service.ts:71:    await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-escalation/priority`, {
apps/web/src/lib\services\legalArtifact.service.ts:28:    return apiFetch<LegalArtifactStatus>("/api/discharge/cases/legal-artifact/create", {
apps/web/src/lib\services\legalArtifact.service.ts:35:    return apiFetch<LegalArtifactStatus>(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-artifact`);
apps/web/src/lib\services\legalArtifact.service.ts:43:    return apiFetch<LegalArtifactStatus>(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-artifact`, {
apps/web/src/lib\services\legalArtifact.service.ts:58:    return apiFetch<LegalArtifactStatus>(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-artifact/sign`, {
apps/web/src/lib\services\legalArtifact.service.ts:65:    return apiFetch<LegalArtifactStatus>(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-artifact/finalize`, {
apps/web/src/lib\services\legalArtifact.service.ts:73:        `/api/discharge/cases/${encodeURIComponent(caseId)}/legal-artifact/pdf`,
apps/web/src/lib\signature\digitalpersona-local-agent.ts:68:    const response = await fetch(endpoint, {
apps/web/src/lib\signature\digitalpersona-local-agent.ts:103:    const response = await fetch(endpoint, {
apps/web/src/lib\signature\digitalpersona-local-agent-client.ts:67:    const response = await fetch(endpoint, {
apps/web/src/lib\signature\digitalpersona-local-agent-client.ts:102:    const response = await fetch(endpoint, {
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:448:    const response = await fetch(IMC_LOGO_URL, {
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:1958:  const response = await fetch(endpoint, {
apps/web/src/lib\server\legal-case-pdf-service.ts:1337:    const validationPath = `${process.env.NEXT_PUBLIC_APP_URL || "https://wathiqcare.online"}/api/cases/${encodeURIComponent(
apps/web/src/lib\server\legal-case-pdf-service.ts:1544:      previewUrl: `/api/cases/${encodeURIComponent(args.caseId)}/pdf/${version}/preview`,
apps/web/src/lib\server\legal-case-pdf-service.ts:1545:      downloadUrl: `/api/cases/${encodeURIComponent(args.caseId)}/pdf/${version}/download`,
apps/web/src/lib\server\integrations\pdf-filler-adapter.ts:68:    const res = await fetch(`${this.baseUrl}/sessions`, {
apps/web/src/lib\server\integrations\pdf-filler-adapter.ts:90:    const res = await fetch(`${this.baseUrl}/sessions/${providerSessionId}/signed-pdf`, {
apps/web/src/lib\server\integrations\pdf-filler-adapter.ts:119:    const res = await fetch(`${this.baseUrl}/sessions/${providerSessionId}/revoke`, {
apps/web/src/lib\server\integrations\pdf-filler-adapter.ts:135:    const res = await fetch(`${this.baseUrl}/sessions/${providerSessionId}/resend`, {
apps/web/src/lib\server\integrations\taqnyat.ts:28:  const response = await fetch("https://api.taqnyat.sa/v1/messages", {
apps/web/src/lib\server\integrations\pdffiller.ts:72:  const response = await fetch(`${PDFFILLER_BASE_URL}/templates`, {
apps/web/src/lib\server\integrations\pdffiller.ts:88:  const response = await fetch(`${PDFFILLER_BASE_URL}/signature_requests`, {
apps/web/src/lib\server\integrations\pdffiller.ts:111:  const response = await fetch(`${PDFFILLER_BASE_URL}/signature_requests/${encodeURIComponent(signatureRequestId)}`, {
apps/web/src/lib\server\integrations\pdffiller.ts:122:  const response = await fetch(`${PDFFILLER_BASE_URL}/signature_requests/${encodeURIComponent(signatureRequestId)}/signed_document`, {
apps/web/src/lib\server\integrations\pdffiller.ts:134:  const response = await fetch(`${PDFFILLER_BASE_URL}/signature_requests/${encodeURIComponent(signatureRequestId)}/certificate`, {
apps/web/src/lib\server\integrations\taqniat-sms-adapter.ts:50:      const res = await fetch(`${this.apiUrl}/messages`, {
apps/web/src/lib\server\legal-package-module-service.ts:438:    ? `/api/cases/${state.case_id}/legal-package/court-bundle`
apps/web/src/lib\server\legal-package-module-service.ts:441:    ? `/api/cases/${state.case_id}/legal-package/download?kind=signed`
apps/web/src/lib\server\legal-package-module-service.ts:465:      download_url: `/api/cases/${state.case_id}/legal-package/download`,
apps/web/src/lib\server\legal-package-module-service.ts:701:    ? `${callbackBase.replace(/\/$/, "")}/api/webhooks/pdffiller/signature-completed`
apps/web/src/lib\server\modules-api-routes.test.ts:34:    const response = await handlers.GET(new NextRequest("http://localhost/api/modules/informed-consents?limit=20"));
apps/web/src/lib\server\modules-api-routes.test.ts:55:    const response = await handlers.POST(new NextRequest("http://localhost/api/modules/informed-consents", {
apps/web/src/lib\server\modules-api-routes.test.ts:84:    const response = await handlers.GET(new NextRequest("http://localhost/api/modules/promissory-notes?limit=20"));
apps/web/src/lib\server\modules-api-routes.test.ts:105:    const response = await handlers.POST(new NextRequest("http://localhost/api/modules/promissory-notes", {
apps/web/src/lib\server\password-signup-route.test.ts:6:import { POST } from "../../../app/api/auth/password/signup/route";
apps/web/src/lib\server\password-signup-route.test.ts:13:    const response = await POST(new NextRequest("http://localhost/api/auth/password/signup", {
apps/web/src/lib\server\public-signing-service.ts:143: * Discriminated pre-OTP bootstrap payload returned by GET /api/public-signing/document/[token]
apps/web/src/lib\server\public-signing-service.ts:354:  const basePath = `/api/public/informed-consents/signing/${encodeURIComponent(token)}/final-pdf`;
apps/web/src/lib\server\trakcare\client.ts:105:    return await fetch(url, {
END MATCHES

## Mock static placeholder risks in apps/web/src/lib

BEGIN MATCHES
apps/web/src/lib\projection\unified-disclosure-types.ts:100:  staticTemplateContent: StaticTemplateContent;
apps/web/src/lib\projection\unified-disclosure-types.ts:118:  staticTemplateContent: StaticTemplateContent;
apps/web/src/lib\projection\unified-disclosure-shadow-mode.ts:235:    staticTemplateContent: projected.staticTemplateContent,
apps/web/src/lib\projection\unified-disclosure-shadow-mode.ts:243:    staticTemplateContent: projected.staticTemplateContent,
apps/web/src/lib\projection\unified-disclosure-projection.ts:222:    staticTemplateContent: normalizeStaticTemplateContent(input.staticTemplateContent),
apps/web/src/lib\projection\unified-disclosure-projection.ts:246:  const staticTemplateContent = normalizeStaticTemplateContent(input.staticTemplateContent);
apps/web/src/lib\projection\unified-disclosure-projection.ts:264:    staticTemplateContent,
apps/web/src/lib\projection\unified-disclosure-projection.ts:285:    staticTemplateContent,
apps/web/src/lib\environment\environment.ts:15:export type FeatureMode = "live" | "test" | "mock";
apps/web/src/lib\environment\environment.ts:93:    trakCareMode = enableLiveTrakCare ? "live" : "mock";
apps/web/src/lib\environment\environment.ts:102:    trakCareMode = "mock"; // Pilot/UAT should not hit live TrakCare
apps/web/src/lib\environment\environment.ts:111:    trakCareMode = "mock";
apps/web/src/lib\environment\environment.ts:120:    trakCareMode = "mock";
apps/web/src/lib\integrations\emr\mock-emr-adapter.ts:4:  readonly adapterKey = "mock-emr";
apps/web/src/lib\core\wording-repository-service.ts:28:  static async retrieveWordingBySection(
apps/web/src/lib\core\wording-repository-service.ts:34:    // For now, return mock data structure
apps/web/src/lib\core\wording-repository-service.ts:59:  static async retrieveWordingForConsent(
apps/web/src/lib\core\wording-repository-service.ts:105:  static validateFixedClauseImmutability(
apps/web/src/lib\core\wording-repository-service.ts:141:  static async validateConsentDocument(
apps/web/src/lib\core\wording-repository-service.ts:216:  static async buildStructuredConsentDocument(
apps/web/src/lib\core\wording-repository-service.ts:279:  private static buildBilingualContent(
apps/web/src/lib\core\wording-repository-service.ts:311:  static validateAiGeneratedContent(
apps/web/src/lib\core\wording-repository-service.ts:334:  static getPhysicianEditableFields(): (keyof ConsentDynamicFieldsSpecification)[] {
apps/web/src/lib\core\wording-repository-service.ts:357:  static getSystemPopulatedFields(): (keyof ConsentDynamicFieldsSpecification)[] {
apps/web/src/lib\core\wording-repository-service.ts:365:  static async proposeWordingChange(params: {
apps/web/src/lib\core\wording-repository-service.ts:384:  static async queryWordingRepository(
apps/web/src/lib\clinical-ai\types\clinical-ai-types.ts:39:  providerMode: "azure-fallback" | "mock-local";
apps/web/src/lib\core\wording-repository-service.test.ts:194:  const mockDynamicFields: ConsentDynamicFieldsSpecification = {
apps/web/src/lib\core\wording-repository-service.test.ts:229:      dynamicFields: mockDynamicFields,
apps/web/src/lib\core\wording-repository-service.test.ts:259:      dynamicFields: mockDynamicFields,
apps/web/src/lib\core\wording-repository-service.test.ts:291:      dynamicFields: mockDynamicFields,
apps/web/src/lib\environment\environment.test.ts:145:    expect(config.trakCareMode).toBe("mock");
apps/web/src/lib\environment\environment.test.ts:148:  test("demo always uses mock TrakCare", () => {
apps/web/src/lib\environment\environment.test.ts:152:    expect(config.trakCareMode).toBe("mock");
apps/web/src/lib\procedure-education\sample-library.ts:124:      sourceUrl: `${base}/images/hero-placeholder.jpg`,
apps/web/src/lib\procedure-education\sample-library.ts:127:        placeholder: true,
apps/web/src/lib\procedure-education\sample-library.ts:136:      sourceUrl: `${base}/infographics/flow-placeholder.jpg`,
apps/web/src/lib\procedure-education\sample-library.ts:139:        placeholder: true,
apps/web/src/lib\procedure-education\sample-library.ts:149:      sourceUrl: `${base}/videos/explainer-placeholder.mp4`,
apps/web/src/lib\procedure-education\sample-library.ts:153:        placeholder: true,
apps/web/src/lib\services\refusalForms.service.ts:73:    // TODO: Implement when backend endpoint is available
apps/web/src/lib\clinical-ai\clinical-ai.test.ts:82:      model: "mock-clinical-ai-v1",
apps/web/src/lib\clinical-ai\clinical-ai.test.ts:84:      providerMode: "mock-local",
apps/web/src/lib\modules\catalog.ts:111:      return isRtl ? "╪¼╪º┘ç╪▓" : "Ready";
apps/web/src/lib\modules\catalog.ts:113:      return isRtl ? "┘ç┘è┘â┘ä ╪¼╪º┘ç╪▓" : "Structure Ready";
apps/web/src/lib\environment\audit-logging.ts:58:  // TODO: Implement actual audit logging to database
apps/web/src/lib\environment\audit-logging.ts:59:  // This is a placeholder that should be replaced with real logging
apps/web/src/lib\core\audit-core.test.ts:97:  // Temporarily disable (this is a mock; the real flag reads from env)
apps/web/src/lib\core\ai-core.ts:102:    "Do not fabricate medical facts. If uncertain, use placeholder markers like [PHYSICIAN_TO_REVIEW].",
apps/web/src/lib\server\arabic-mojibake-guard.ts:3:  sample: string;
apps/web/src/lib\server\arabic-mojibake-guard.ts:69:      sample: compactSample(normalized),
apps/web/src/lib\pdf-engine\branding\wathiqcare-footer.tsx:24:      <div class="wc-pdf-footer-row"><strong>QR Verification:</strong> ${escapeHtml(props.qrPayload || "QR verification placeholder")}</div>
apps/web/src/lib\pdf-engine\branding\wathiqcare-footer.tsx:28:      <div class="wc-pdf-footer-row"><strong>Immutable Seal:</strong> ${escapeHtml(props.immutableSeal || "Immutable seal placeholder")}</div>
apps/web/src/lib\pdf-engine\branding\wathiqcare-footer.tsx:29:      <div class="wc-pdf-footer-row"><strong>Forensic Chain:</strong> ${escapeHtml(props.forensicChainReference || "Forensic chain placeholder")}</div>
apps/web/src/lib\pdf-engine\branding\wathiqcare-footer.tsx:30:      <div class="wc-pdf-footer-row"><strong>Verification Status:</strong> ${escapeHtml(props.evidenceVerificationStatus || "Verification status placeholder")}</div>
apps/web/src/lib\pdf-engine\branding\wathiqcare-footer.tsx:31:      <div class="wc-pdf-footer-row"><strong>Retention Class:</strong> ${escapeHtml(props.retentionClass || "Retention class placeholder")}</div>
apps/web/src/lib\pdf-engine\branding\wathiqcare-footer.tsx:32:      <div class="wc-pdf-footer-row"><strong>Archive Ref:</strong> ${escapeHtml(props.archiveReference || "Archive reference placeholder")}</div>
apps/web/src/lib\pdf-engine\branding\wathiqcare-footer.tsx:33:      <div class="wc-pdf-footer-row"><strong>Forensic Ref:</strong> ${escapeHtml(props.forensicVerificationReference || "Forensic verification reference placeholder")}</div>
apps/web/src/lib\pdf-engine\branding\wathiqcare-footer.tsx:34:      <div class="wc-pdf-footer-row"><strong>Judicial Export Ref:</strong> ${escapeHtml(props.judicialExportReference || "Judicial export reference placeholder")}</div>
apps/web/src/lib\pdf-engine\branding\wathiqcare-footer.tsx:35:      <div class="wc-pdf-footer-row"><strong>Integrity Indicator:</strong> ${escapeHtml(props.verificationIntegrityIndicator || "Integrity indicator placeholder")}</div>
apps/web/src/lib\pdf-engine\branding\wathiqcare-footer.tsx:36:      <div class="wc-pdf-footer-row"><strong>Retention Notice:</strong> ${escapeHtml(props.legalRetentionNotice || "Legal retention notice placeholder")}</div>
apps/web/src/lib\clinical-ai\providers\azure-openai-provider.ts:52:    const providerMode = this.apiKey && this.deployment && this.endpoint ? "azure-fallback" : "mock-local";
apps/web/src/lib\clinical-ai\providers\azure-openai-provider.ts:55:      model: providerMode === "mock-local" ? "mock-clinical-ai-v1" : "azure-configured-local-fallback-v1",
apps/web/src/lib\pdf-engine\access-control\tenant-isolation.ts:58:      ? "Cross-tenant access allowed under privileged legal review placeholder."
apps/web/src/lib\signature\digitalpersona-local-agent.ts:62:  mockMode?: boolean;
apps/web/src/lib\signature\digitalpersona-local-agent.ts:65:  const mockMode = options?.mockMode ?? true;
apps/web/src/lib\signature\digitalpersona-local-agent.ts:83:    // Fall through to UAT mock mode when the local agent is not installed yet.
apps/web/src/lib\signature\digitalpersona-local-agent.ts:87:    available: mockMode,
apps/web/src/lib\signature\digitalpersona-local-agent.ts:96:  mockMode?: boolean;
apps/web/src/lib\signature\digitalpersona-local-agent.ts:100:  const mockMode = options?.mockMode ?? true;
apps/web/src/lib\signature\digitalpersona-local-agent.ts:118:    if (!mockMode) {
apps/web/src/lib\signature\digitalpersona-local-agent-client.ts:61:  mockMode?: boolean;
apps/web/src/lib\signature\digitalpersona-local-agent-client.ts:64:  const mockMode = options?.mockMode ?? true;
apps/web/src/lib\signature\digitalpersona-local-agent-client.ts:82:    // Fall through to UAT mock mode when the local agent is not installed yet.
apps/web/src/lib\signature\digitalpersona-local-agent-client.ts:86:    available: mockMode,
apps/web/src/lib\signature\digitalpersona-local-agent-client.ts:95:  mockMode?: boolean;
apps/web/src/lib\signature\digitalpersona-local-agent-client.ts:99:  const mockMode = options?.mockMode ?? true;
apps/web/src/lib\signature\digitalpersona-local-agent-client.ts:117:    if (!mockMode) {
apps/web/src/lib\pdf-engine\branding\imc-letterhead.tsx:16:        <div class="wc-pdf-letterhead-logo">${escapeHtml(props.logoLabel || "IMC logo placeholder")}</div>
apps/web/src/lib\pdf-engine\core\pdf-renderer.ts:126:      .wc-pdf-qr-placeholder {
apps/web/src/lib\pdf-engine\core\pdf-fonts.ts:4:  placeholder: true;
apps/web/src/lib\pdf-engine\core\pdf-fonts.ts:12:    placeholder: true,
apps/web/src/lib\pdf-engine\core\pdf-fonts.ts:18:    placeholder: true,
apps/web/src/lib\pdf-engine\core\pdf-fonts.ts:24:    placeholder: true,
apps/web/src/lib\pdf-engine\core\pdf-fonts.ts:25:    notes: "Fallback enterprise Arabic sans family placeholder.",
apps/web/src/lib\pdf-engine\evidence\audit-metadata.ts:45:    deviceFingerprint: input.deviceFingerprint ?? "device-fingerprint-placeholder",
apps/web/src/lib\server\case-compliance-service.ts:11:import { assertCaseReadyForLegalExport, getLegalReadiness } from "@/lib/server/legal-readiness-service";
apps/web/src/lib\server\case-compliance-service.ts:590:  const readiness = await assertCaseReadyForLegalExport(auth, caseId);
apps/web/src/lib\server\compliance-dashboard-service.test.ts:14:        legalReady: true,
apps/web/src/lib\server\compliance-dashboard-service.test.ts:25:        legalReady: false,
apps/web/src/lib\server\compliance-dashboard-service.test.ts:59:        legalReady: false,
apps/web/src/lib\pdf-engine\ui-models\judicial-export-model.ts:17:    otpSummary: `OTP status ${judicialExport.otpEvidence.verificationStatus} via ${judicialExport.otpEvidence.verificationMethod || "placeholder"}.`,
apps/web/src/lib\server\compliance-dashboard-service.ts:25:  legalReady: boolean;
apps/web/src/lib\server\compliance-dashboard-service.ts:99:  const cbahiCases = input.cases.filter((item) => item.legalReady && item.auditChainVerified && item.openValidationErrors <= 0);
apps/web/src/lib\server\compliance-dashboard-service.ts:102:  const blockedCases = input.cases.filter((item) => !item.legalReady || !item.auditChainVerified || item.openValidationErrors > 0);
apps/web/src/lib\server\compliance-dashboard-service.ts:269:        status: item.legalReady ? "Review Required" : "Blocked",
apps/web/src/lib\server\compliance-dashboard-service.ts:410:      legalReady: report.readyForLegal,
apps/web/src/lib\server\consent-library-service.ts:276:  return /\b(as an ai|language model|cannot provide|i (?:cannot|can'?t) verify|placeholder)\b/.test(normalized);
apps/web/src/lib\pdf-engine\persistence\retention-policy.ts:75:      reason: input.overrideReason || "Litigation hold override placeholder for Saudi healthcare and PDPL-aligned retention controls.",
apps/web/src/lib\pdf-engine\operations\retention-dashboard.ts:36:            ? "Preserve under legal hold placeholder."
apps/web/src/lib\pdf-engine\templates\informed-consent.template.tsx:99:    `<div class="wc-pdf-qr-placeholder">
apps/web/src/lib\server\discharge-refusal-validator.test.ts:21:test("validator rejects placeholder physician and invalid timestamp", () => {
apps/web/src/lib\server\education-library-service.ts:34:  placeholderAssets?: EducationAssetInput[];
apps/web/src/lib\server\education-library-service.ts:51:  placeholderAssets?: EducationAssetInput[];
apps/web/src/lib\server\education-library-service.ts:139:      throw new ApiError(400, "Each placeholder asset requires assetKey, assetType, and title");
apps/web/src/lib\server\education-library-service.ts:165:  placeholderAssets?: EducationAssetInput[];
apps/web/src/lib\server\education-library-service.ts:167:  const normalizedAssets = normalizeAssets(input.placeholderAssets || []).map((asset) => ({
apps/web/src/lib\server\education-library-service.ts:188:    placeholderAssets: normalizedAssets,
apps/web/src/lib\server\education-library-service.ts:220:  const normalizedAssets = normalizeAssets(input.placeholderAssets || []);
apps/web/src/lib\server\education-library-service.ts:245:    placeholderAssets: normalizedAssets,
apps/web/src/lib\server\education-library-service.ts:277:          placeholderAssetCount: normalizedAssets.length,
apps/web/src/lib\server\education-library-service.ts:319:          placeholderAssetCount: normalizedAssets.length,
apps/web/src/lib\server\education-library-service.ts:375:      placeholderAssets: educationPackage.assets.map((asset) => ({
apps/web/src/lib\server\education-library-service.ts:436:  const normalizedAssets = normalizeAssets(input.placeholderAssets || []);
apps/web/src/lib\server\education-library-service.ts:483:      placeholderAssets: normalizedAssets,
apps/web/src/lib\server\education-library-service.ts:498:          placeholderAssetCount: normalizedAssets.length,
apps/web/src/lib\server\education-library-service.ts:534:          placeholderAssetCount: normalizedAssets.length,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:108:    verificationMethod: "preview-placeholder",
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:243:          "Preview-only legal retention placeholder. Production retention policy remains unchanged until explicitly enabled.",
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:87:    code: "mock-tenant",
apps/web/src/lib\server\informed-consents-saudi-template-library.ts:303:    specificEn: "I understand that participation in research is voluntary, and that the study purpose, duration, procedures, expected benefits, potential risks, confidentiality safeguards, and use of data or samples have been explained to me. I understand that I may withdraw at any time without affecting my right to receive medical care.",
apps/web/src/lib\server\legal-case-pdf-storage.test.ts:39:    const relativePath = "tenant-1/case-1/v1/sample.pdf";
apps/web/src/lib\server\legal-case-pdf-storage.test.ts:77:      pdfBuffer: Buffer.from("sample-pdf-content"),
apps/web/src/lib\server\integrations\pdf-filler-adapter.ts:5: * Reads API credentials from environment ΓÇö never hardcoded.
apps/web/src/lib\server\legal-readiness-service.ts:320:export async function assertCaseReadyForLegalExport(auth: AuthContext, caseId: string) {
apps/web/src/lib\server\integrations\taqniat-sms-adapter.ts:5: * Reads credentials from environment ΓÇö never hardcoded.
apps/web/src/lib\server\legal-risk-dashboard-service.ts:332:  if (!completionBlocked && riskLevel === "Low") flags.push("Ready for Closure");
apps/web/src/lib\server\module-secure-signing-service.ts:8:import { isTaqnyatReady, sendTaqnyatMessage } from "@/services/sms/taqnyatClient";
apps/web/src/lib\server\module-secure-signing-service.ts:293:  if (normalizedMobile && isTaqnyatReady()) {
apps/web/src/lib\server\pdf-engine-phase-four.test.ts:29:      deviceFingerprint: "device-fingerprint-placeholder",
apps/web/src/lib\server\pdf-engine-phase-two.test.ts:62:    verificationMethod: "preview-placeholder",
apps/web/src/lib\server\pdf-engine-phase-two.test.ts:75:      deviceFingerprint: "device-fingerprint-placeholder",
apps/web/src/lib\server\pdf-engine-phase-three.test.ts:26:      deviceFingerprint: "device-fingerprint-placeholder",
apps/web/src/lib\server\pdf-engine-foundation.test.ts:82:  assert.match(html, /IMC official letterhead placeholder/);
apps/web/src/lib\server\pdf-engine-phase-five.test.ts:35:      deviceFingerprint: "device-fingerprint-placeholder",
apps/web/src/lib\server\pdf-engine-phase-one.test.ts:37:  assert.equal(metadata.deviceFingerprint, "device-fingerprint-placeholder");
apps/web/src/lib\server\promissory-note-pdf.test.ts:12:const sampleRecord: PromissoryNoteApiRecord = {
apps/web/src/lib\server\promissory-note-pdf.test.ts:37:  const noteData = buildPromissoryNoteDocumentData(sampleRecord, {
apps/web/src/lib\server\promissory-note-pdf.test.ts:64:  const noteData = buildPromissoryNoteDocumentData(sampleRecord, {
apps/web/src/lib\server\promissory-note-pdf.test.ts:107:  const previewData = buildPromissoryNoteDocumentData(sampleRecord, {
apps/web/src/lib\server\promissory-note-pdf.test.ts:111:  const pdfData = buildPromissoryNoteDocumentData(sampleRecord, {
apps/web/src/lib\server\public-signing-service.ts:37:import { isTaqnyatReady, sendTaqnyatMessage } from "@/services/sms/taqnyatClient";
apps/web/src/lib\server\public-signing-service.ts:1995:  if (isTaqnyatReady()) {
apps/web/src/lib\server\public-signing-service.ts:2071:    fallbackMode: !isTaqnyatReady(),
apps/web/src/lib\server\signature-evidence.test.ts:148:test("detectDigitalPersona4500 falls back to mock availability for UAT", async () => {
apps/web/src/lib\server\signature-evidence.test.ts:149:  const detection = await detectDigitalPersona4500({ endpoint: "http://127.0.0.1:1/biometric/verify", mockMode: true });
apps/web/src/lib\server\signature-evidence.test.ts:154:test("captureFingerprintVerification returns mock HID payload when local agent is unavailable", async () => {
apps/web/src/lib\server\signature-evidence.test.ts:155:  const result = await captureFingerprintVerification({ endpoint: "http://127.0.0.1:1/biometric/verify", mockMode: true });
apps/web/src/lib\server\signature-manager.ts:126:      // Sign using Node.js crypto (HMAC-based placeholder for now)
apps/web/src/lib\server\signature-manager.ts:195:      // For now, return a placeholder
apps/web/src/lib\server\trakcare\config.ts:29:  authMode: "oauth2_client_credentials" | "basic" | "static_bearer";
apps/web/src/lib\server\trakcare\config.ts:35:  staticBearerToken: string;
apps/web/src/lib\server\trakcare\config.ts:41:    authModeRaw === "basic" || authModeRaw === "static_bearer"
apps/web/src/lib\server\trakcare\config.ts:69:    staticBearerToken: (process.env.TRAKCARE_STATIC_BEARER_TOKEN || "").trim(),
apps/web/src/lib\server\trakcare\config.ts:87:    authConfigured = config.staticBearerToken.length > 0;
apps/web/src/lib\server\trakcare\client.ts:120:  if (config.authMode === "static_bearer") {
apps/web/src/lib\server\trakcare\client.ts:121:    return config.staticBearerToken;
apps/web/src/lib\server\uat-mock-encounters.ts:29:  source: "uat_mock";
apps/web/src/lib\server\uat-mock-encounters.ts:30:  mockLabel: "UAT Mock Encounter";
apps/web/src/lib\server\uat-mock-encounters.ts:97:    id: `uat-mock:${match.mrn}:${match.encounterId}`,
apps/web/src/lib\server\uat-mock-encounters.ts:111:    source: "uat_mock",
apps/web/src/lib\server\uat-mock-encounters.ts:112:    mockLabel: "UAT Mock Encounter",
END MATCHES

## Loading error and empty states in apps/web/src/lib

BEGIN MATCHES
apps/web/src/lib\analytics.ts:23:  errors: number;
apps/web/src/lib\analytics.ts:29:  errorFrequency: AnalyticsCountEntry[];
apps/web/src/lib\analytics.ts:92:    errors: 0,
apps/web/src/lib\analytics.ts:98:    errorFrequency: [],
apps/web/src/lib\analytics.ts:115:  return days.some((day) => day.totalEvents > 0 || day.pageViews > 0 || day.actions > 0 || day.errors > 0);
apps/web/src/lib\analytics.ts:124:  const errorCountsByDay = new Map<string, Map<string, number>>();
apps/web/src/lib\analytics.ts:173:    if (event.eventName === "api_error" || event.eventName === "ui_error") {
apps/web/src/lib\analytics.ts:174:      rollup.errors += 1;
apps/web/src/lib\analytics.ts:177:      if (!errorCountsByDay.has(eventDay)) {
apps/web/src/lib\analytics.ts:178:        errorCountsByDay.set(eventDay, new Map<string, number>());
apps/web/src/lib\analytics.ts:180:      const counts = errorCountsByDay.get(eventDay)!;
apps/web/src/lib\analytics.ts:197:    rollup.errorFrequency = sortCountEntries(errorCountsByDay.get(day) ?? new Map<string, number>());
apps/web/src/lib\environment\audit-logging.ts:30:  severity: "info" | "warning" | "error";
apps/web/src/lib\environment\audit-logging.ts:178:    severity: allowed ? "info" : "error",
apps/web/src/lib\environment\test-account-access.ts:74: * Returns error message if access denied, null if allowed
apps/web/src/lib\core\ai-core.ts:133: * Returns a typed error if disabled so callers can surface a user-friendly message.
apps/web/src/lib\config\platform-config.ts:59:  /** QR error correction level */
apps/web/src/lib\core\platform-errors.ts:4: * Centralized error taxonomy, structured error types, and
apps/web/src/lib\core\platform-errors.ts:9: * - Every error has a machine-readable code
apps/web/src/lib\core\platform-errors.ts:10: * - Every error is loggable with structured context
apps/web/src/lib\core\platform-errors.ts:109:      id ? `${entity} not found: ${id}` : `${entity} not found`,
apps/web/src/lib\core\platform-errors.ts:158:  internal: (msg = "Internal server error", cause?: unknown) => {
apps/web/src/lib\core\platform-errors.ts:176:  error: {
apps/web/src/lib\core\platform-errors.ts:194:    { success: false, error: { code, message, context } },
apps/web/src/lib\core\platform-errors.ts:200: * Convert any thrown error to a typed API error response.
apps/web/src/lib\core\platform-errors.ts:201: * Handles PlatformError, known core errors, and generic errors.
apps/web/src/lib\core\platform-errors.ts:205:  defaultMessage = "An unexpected error occurred"
apps/web/src/lib\core\platform-errors.ts:211:  // Known core errors from signature/pdf/ai cores
apps/web/src/lib\core\platform-errors.ts:228:  console.error("[PlatformError] Unhandled:", err);
apps/web/src/lib\core\platform-errors.ts:233:// Runtime Error Logger (persists to platform_error_log)
apps/web/src/lib\core\platform-errors.ts:240:  errorCode: string;
apps/web/src/lib\core\platform-errors.ts:241:  errorMessage: string;
apps/web/src/lib\core\platform-errors.ts:247: * Persist a platform error to the error log.
apps/web/src/lib\core\platform-errors.ts:248: * Call after catching unexpected errors in route handlers or services.
apps/web/src/lib\core\platform-errors.ts:256:      `INSERT INTO platform_error_log
apps/web/src/lib\core\platform-errors.ts:257:         (tenant_id, module, operation, error_code, error_message, stack_trace, context)
apps/web/src/lib\core\platform-errors.ts:262:      input.errorCode,
apps/web/src/lib\core\platform-errors.ts:263:      input.errorMessage,
apps/web/src/lib\core\platform-errors.ts:268:    // Never throw from error logger
apps/web/src/lib\core\platform-errors.test.ts:3: * Tests: error factories, API response builders, route error handler
apps/web/src/lib\core\platform-errors.test.ts:16:} from "./platform-errors";
apps/web/src/lib\core\platform-errors.test.ts:88:test("apiError wraps error in failure envelope", () => {
apps/web/src/lib\core\platform-errors.test.ts:110:test("handleRouteError handles errors with known code properties", () => {
apps/web/src/lib\core\platform-errors.test.ts:136:    assert.ok(code in ERROR_CODES, `Missing required error code: ${code}`);
apps/web/src/lib\config\env-validation.ts:128:    throw new Error('Runtime configuration error: DATABASE_URL is required but missing');
apps/web/src/lib\core\pdf-core.ts:119:      errorCorrectionLevel: PDF_CONFIG.qrErrorCorrection,
apps/web/src/lib\core\signature-core.test.ts:3: * Tests: token generation, URL building, expiry, HMAC verification, error classes
apps/web/src/lib\core\wording-repository-service.ts:109:    const errors: WordingValidationError[] = [];
apps/web/src/lib\core\wording-repository-service.ts:113:      errors.push({
apps/web/src/lib\core\wording-repository-service.ts:122:      errors.push({
apps/web/src/lib\core\wording-repository-service.ts:130:    return errors;
apps/web/src/lib\core\wording-repository-service.ts:144:    const errors: WordingValidationError[] = [];
apps/web/src/lib\core\wording-repository-service.ts:174:        errors.push({
apps/web/src/lib\core\wording-repository-service.ts:195:        errors.push({
apps/web/src/lib\core\wording-repository-service.ts:204:      isValid: errors.length === 0,
apps/web/src/lib\core\wording-repository-service.ts:205:      errors,
apps/web/src/lib\core\wording-repository-service.ts:207:      fixedClausesModified: errors.some((e) => e.code === 'FIXED_CLAUSE_MODIFIED'),
apps/web/src/lib\core\wording-repository-service.ts:315:    const errors: WordingValidationError[] = [];
apps/web/src/lib\core\wording-repository-service.ts:319:        errors.push({
apps/web/src/lib\core\wording-repository-service.ts:328:    return errors;
apps/web/src/lib\core\signature-core.ts:118:  error?: string;
apps/web/src/lib\core\wording-repository-service.test.ts:49:    const errors = WordingRepositoryService.validateFixedClauseImmutability(original, modified);
apps/web/src/lib\core\wording-repository-service.test.ts:51:    assert.strictEqual(errors.length, 1);
apps/web/src/lib\core\wording-repository-service.test.ts:52:    assert.strictEqual(errors[0].code, 'FIXED_CLAUSE_MODIFIED');
apps/web/src/lib\core\wording-repository-service.test.ts:53:    assert.strictEqual(errors[0].severity, 'ERROR');
apps/web/src/lib\core\wording-repository-service.test.ts:78:    const errors = WordingRepositoryService.validateFixedClauseImmutability(original, modified);
apps/web/src/lib\core\wording-repository-service.test.ts:80:    assert.strictEqual(errors.length, 1);
apps/web/src/lib\core\wording-repository-service.test.ts:81:    assert.strictEqual(errors[0].code, 'FIXED_CLAUSE_MODIFIED');
apps/web/src/lib\core\wording-repository-service.test.ts:105:    const errors = WordingRepositoryService.validateFixedClauseImmutability(original, unchanged);
apps/web/src/lib\core\wording-repository-service.test.ts:107:    assert.strictEqual(errors.length, 0);
apps/web/src/lib\core\wording-repository-service.test.ts:126:    const errors = WordingRepositoryService.validateAiGeneratedContent(aiOutput, allowedDynamicFields);
apps/web/src/lib\core\wording-repository-service.test.ts:128:    assert.strictEqual(errors.length, 1);
apps/web/src/lib\core\wording-repository-service.test.ts:129:    assert.strictEqual(errors[0].fieldPath, 'core_consent_fixed');
apps/web/src/lib\core\wording-repository-service.test.ts:130:    assert.strictEqual(errors[0].code, 'FIXED_CLAUSE_MODIFIED');
apps/web/src/lib\core\wording-repository-service.test.ts:132:      errors[0].message,
apps/web/src/lib\core\wording-repository-service.test.ts:154:    const errors = WordingRepositoryService.validateAiGeneratedContent(aiOutput, allowedDynamicFields);
apps/web/src/lib\core\wording-repository-service.test.ts:156:    assert.strictEqual(errors.length, 0);
apps/web/src/lib\core\wording-repository-service.test.ts:168:    const errors = WordingRepositoryService.validateAiGeneratedContent(aiOutput, allowedDynamicFields);
apps/web/src/lib\core\wording-repository-service.test.ts:170:    assert.strictEqual(errors.length, 2);
apps/web/src/lib\core\wording-repository-service.test.ts:171:    assert(errors.every((e) => e.code === 'FIXED_CLAUSE_MODIFIED'));
apps/web/src/lib\core\wording-repository-service.test.ts:243:    assert.strictEqual(result.errors.length, 0);
apps/web/src/lib\core\wording-repository-service.test.ts:264:      // physicianApprovedAt is MISSING ΓÇö this is the error
apps/web/src/lib\core\wording-repository-service.test.ts:274:    assert(result.errors.length > 0);
apps/web/src/lib\core\wording-repository-service.test.ts:275:    assert(result.errors.some((e) => e.code === 'APPROVAL_NOT_GRANTED'));
apps/web/src/lib\core\wording-repository-service.test.ts:305:    assert(result.errors.some((e) => e.code === 'MISSING_REQUIRED_FIELD'));
apps/web/src/lib\modules\patient-education-events.ts:70:  } catch (error) {
apps/web/src/lib\modules\patient-education-events.ts:72:    console.warn("[patient-education-events] emit failed", payload.eventType, error);
apps/web/src/lib\integrations\emr\trakcare-adapter.ts:31:        error: status.message,
apps/web/src/lib\integrations\emr\trakcare-adapter.ts:62:        error: "Encounter not found in TrakCare",
apps/web/src/lib\core\wording-types.ts:170:  errors: WordingValidationError[];
apps/web/src/lib\integrations\emr\emr-adapter.ts:36:  error?: string;
apps/web/src/lib\clinical-ai\safety\ai-guardrails.ts:85:  } catch (error) {
apps/web/src/lib\clinical-ai\safety\ai-guardrails.ts:86:    if (error instanceof ApiError) {
apps/web/src/lib\clinical-ai\safety\ai-guardrails.ts:87:      issues.push(error.message);
apps/web/src/lib\clinical-ai\safety\ai-guardrails.ts:89:      issues.push("unknown-ai-safety-error");
apps/web/src/lib\projection\unified-disclosure-shadow-mode.ts:42:  status: "skipped" | "active_compare_only" | "error";
apps/web/src/lib\projection\unified-disclosure-shadow-mode.ts:318:  } catch (error) {
apps/web/src/lib\projection\unified-disclosure-shadow-mode.ts:319:    console.error(LOG_PREFIX, "shadow execution failed", error);
apps/web/src/lib\projection\unified-disclosure-shadow-mode.ts:323:      status: "error",
apps/web/src/lib\projection\unified-disclosure-shadow-mode.ts:324:      reasons: ["projection_error"],
apps/web/src/lib\signature\digitalpersona-local-agent.ts:117:  } catch (error) {
apps/web/src/lib\signature\digitalpersona-local-agent.ts:119:      throw error;
apps/web/src/lib\signature\digitalpersona-local-agent-client.ts:116:  } catch (error) {
apps/web/src/lib\signature\digitalpersona-local-agent-client.ts:118:      throw error;
apps/web/src/lib\tracking.ts:12:  | "api_error"
apps/web/src/lib\tracking.ts:13:  | "ui_error";
apps/web/src/lib\tracking.ts:189:        // ignore errors in tracking path
apps/web/src/lib\tracking.ts:199:      // ignore errors in tracking path
apps/web/src/lib\tracking.ts:531:  trackEvent("api_error", payload);
apps/web/src/lib\tracking.ts:535:  trackEvent("ui_error", payload);
apps/web/src/lib\server\admin-password-reset.ts:39:        throw new ApiError(404, "User not found");
apps/web/src/lib\server\admin-password-reset.ts:100:        throw new ApiError(400, passwordValidation.errors.join("; "));
apps/web/src/lib\server\admin-bootstrap.ts:349:    throw new ApiError(404, "Tenant not found");
apps/web/src/lib\server\admin-bootstrap.ts:392:    throw new ApiError(404, "Tenant not found");
apps/web/src/lib\signature\signature-validation.ts:40:    throw new ApiError(400, "Tablet signature is empty or incomplete");
apps/web/src/lib\signature\signature-validation.ts:60:  } catch (error) {
apps/web/src/lib\signature\signature-validation.ts:61:    throw new ApiError(400, error instanceof Error ? error.message : "Raw biometric payload is not allowed");
apps/web/src/lib\server\analytics-service.ts:12:type AnalyticsMetricGroup = "summary" | "page" | "action" | "drop_off" | "error";
apps/web/src/lib\server\analytics-service.ts:125:    if (event.eventName === "api_error" || event.eventName === "ui_error") {
apps/web/src/lib\server\analytics-service.ts:126:      recordIncrement(increments, { day, group: "summary", key: "errors", value: 1 });
apps/web/src/lib\server\analytics-service.ts:130:        group: "error",
apps/web/src/lib\server\analytics-service.ts:243:  const errorCounts = new Map<string, Map<string, number>>();
apps/web/src/lib\server\analytics-service.ts:269:      if (row.metric_key === "errors") {
apps/web/src/lib\server\analytics-service.ts:270:        rollup.errors = value;
apps/web/src/lib\server\analytics-service.ts:305:    if (row.metric_group === "error") {
apps/web/src/lib\server\analytics-service.ts:306:      if (!errorCounts.has(row.day)) {
apps/web/src/lib\server\analytics-service.ts:307:        errorCounts.set(row.day, new Map<string, number>());
apps/web/src/lib\server\analytics-service.ts:309:      errorCounts.get(row.day)!.set(row.metric_key, value);
apps/web/src/lib\server\analytics-service.ts:327:    rollup.errorFrequency = Array.from((errorCounts.get(day) ?? new Map<string, number>()).entries())
apps/web/src/lib\services\legalEscalation.service.ts:16:    } catch (error) {
apps/web/src/lib\services\legalEscalation.service.ts:17:      console.error("Failed to fetch escalation cases:", error);
apps/web/src/lib\services\legalEscalation.service.ts:28:    } catch (error) {
apps/web/src/lib\services\legalEscalation.service.ts:29:      console.error("Failed to fetch escalation case:", error);
apps/web/src/lib\services\refusalForms.service.ts:62:    } catch (error) {
apps/web/src/lib\services\refusalForms.service.ts:63:      console.error("Failed to fetch refusal forms:", error);
apps/web/src/lib\server\auth-reset.ts:35:export function isMissingTableOrColumnError(error: unknown): boolean {
apps/web/src/lib\server\auth-reset.ts:36:  if (!error || typeof error !== "object") return false;
apps/web/src/lib\server\auth-reset.ts:37:  const err = error as { code?: unknown; meta?: { code?: unknown } };
apps/web/src/lib\server\auth-reset.ts:175:  } catch (error) {
apps/web/src/lib\server\auth-reset.ts:176:    if (isMissingTableOrColumnError(error)) {
apps/web/src/lib\server\auth-reset.ts:182:    throw error;
apps/web/src/lib\server\auth.ts:115:  } catch (error) {
apps/web/src/lib\server\auth.ts:120:      error,
apps/web/src/lib\server\auth.ts:123:    if (error instanceof Error) {
apps/web/src/lib\server\auth.ts:124:      throw new ApiError(401, error.message);
apps/web/src/lib\server\auth.ts:155:    } catch (error) {
apps/web/src/lib\server\auth.ts:156:      if (error instanceof DatabaseUnavailableError) {
apps/web/src/lib\server\auth.ts:161:          error,
apps/web/src/lib\server\auth.ts:166:      throw error;
apps/web/src/lib\server\auth.ts:186:    } catch (error) {
apps/web/src/lib\server\auth.ts:187:      if (error instanceof DatabaseUnavailableError) {
apps/web/src/lib\server\auth.ts:192:          error,
apps/web/src/lib\server\auth.ts:197:      throw error;
apps/web/src/lib\server\auth.ts:346:    console.error("platform access attempt log write failed (non-fatal)", accessLogError);
apps/web/src/lib\server\auth.ts:373:    console.error("platform access audit log write failed (non-fatal)", auditError);
apps/web/src/lib\server\auth.ts:381:  } catch (error) {
apps/web/src/lib\server\auth.ts:385:      reason: error instanceof ApiError ? error.message : "Authentication failed",
apps/web/src/lib\server\auth.ts:387:    throw error;
apps/web/src/lib\pdf-engine\evidence\qr-generator.ts:20:      errorCorrectionLevel: "M",
apps/web/src/lib\server\backendProxy.ts:116:function shouldRetryBackendError(method: string, error: unknown): boolean {
apps/web/src/lib\server\backendProxy.ts:121:    if (!(error instanceof Error)) {
apps/web/src/lib\server\backendProxy.ts:125:    return error.name !== "AbortError";
apps/web/src/lib\server\backendProxy.ts:216:            error: new Error("backend proxy recursion detected"),
apps/web/src/lib\server\backendProxy.ts:262:                    error: new Error("backend-proxy-response-failure"),
apps/web/src/lib\server\backendProxy.ts:272:            // Re-throw abort errors: the client already disconnected, so there is
apps/web/src/lib\server\backendProxy.ts:288:                error: err,
apps/web/src/lib\server\backendProxy.ts:304:        error: new Error("backend-proxy-unreachable"),
apps/web/src/lib\server\case-compliance-service.ts:110:    throw new ApiError(404, "Case not found");
apps/web/src/lib\server\compliance-dashboard-service.ts:399:      openValidationErrors: readNumber(validation, "open_errors") ?? 0,
apps/web/src/lib\server\compliance-dashboard-service.ts:414:      openValidationErrors: readNumber(validation, "open_errors") ?? 0,
apps/web/src/lib\server\consent-service.ts:34:function isMissingConsentMethodEnumError(error: unknown): boolean {
apps/web/src/lib\server\consent-service.ts:35:  const message = error instanceof Error ? error.message : String(error);
apps/web/src/lib\server\consent-service.ts:79:  } catch (error) {
apps/web/src/lib\server\consent-service.ts:80:    if (!isMissingConsentMethodEnumError(error)) {
apps/web/src/lib\server\consent-service.ts:81:      throw error;
apps/web/src/lib\server\consent-service.ts:198:    throw new ApiError(404, "Case not found");
apps/web/src/lib\server\consent-library-service.ts:893:    throw new ApiError(404, "Template not found");
apps/web/src/lib\server\consent-library-service.ts:908:    throw new ApiError(404, "Source version not found");
apps/web/src/lib\server\consent-library-service.ts:1051:      throw new ApiError(404, "Template version not found");
apps/web/src/lib\server\consent-library-service.ts:1186:          throw new ApiError(404, "AI prompt not found");
apps/web/src/lib\server\consent-library-service.ts:1277:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\consent-library-service.ts:1327:    throw new ApiError(404, "Case not found");
apps/web/src/lib\server\consent-library-service.ts:1335:    throw new ApiError(404, "Template not found");
apps/web/src/lib\server\consent-library-service.ts:1352:    throw new ApiError(404, "Template version not found");
apps/web/src/lib\server\consent-library-service.ts:1535:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\consent-library-service.ts:1678:      throw new ApiError(404, "Consent document not found after update");
apps/web/src/lib\server\consent-library-service.ts:1756:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\consent-library-service.ts:1853:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\consent-library-service.ts:1946:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\consent-library-service.ts:2499:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\consent-library-service.ts:2716:      throw new ApiError(404, "Consent document not found after AI update");
apps/web/src/lib\server\consent-library-service.ts:2750:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\consent-library-service.ts:2791:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\consent-library-service.ts:2856:      throw new ApiError(404, "Template version not found");
apps/web/src/lib\server\consent-library-service.ts:2959:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\db-resilience.ts:40:export function isDbConnectivityError(error: unknown): boolean {
apps/web/src/lib\server\db-resilience.ts:41:  if (!error || typeof error !== "object") {
apps/web/src/lib\server\db-resilience.ts:45:  const candidate = error as { name?: unknown; message?: unknown; code?: unknown };
apps/web/src/lib\server\db-resilience.ts:79:      (error) => {
apps/web/src/lib\server\db-resilience.ts:81:        reject(error);
apps/web/src/lib\server\db-resilience.ts:99:    } catch (error) {
apps/web/src/lib\server\db-resilience.ts:100:      const transient = isDbConnectivityError(error);
apps/web/src/lib\server\db-resilience.ts:111:          error,
apps/web/src/lib\server\db-resilience.ts:126:      throw error;
apps/web/src/lib\server\controlled-production-pilot-governance.ts:57:  shadowStatus?: "skipped" | "active_compare_only" | "error";
apps/web/src/lib\server\controlled-production-pilot-governance.ts:157:  if ((observation.shadowStatus === "error") || mismatchTotal >= 10 || evidence > 0 || pdf >= 4) {
apps/web/src/lib\server\controlled-production-pilot-governance.ts:182:  if (classification === "DEGRADED") severity = "error";
apps/web/src/lib\server\dischargeMedicoLegal.ts:230:		throw new ApiError(404, "Case not found");
apps/web/src/lib\server\dischargeMedicoLegal.ts:236:		throw new ApiError(404, "Discharge refusal case not found");
apps/web/src/lib\server\dischargeRefusalWorkflow.ts:422:        throw new ApiError(404, "Case not found");
apps/web/src/lib\server\dsr-service.ts:180:    throw new ApiError(404, "Data subject request not found");
apps/web/src/lib\server\education-library-service.ts:354:      throw new ApiError(404, "Education package not found");
apps/web/src/lib\server\education-library-service.ts:362:      throw new ApiError(404, "Education version not found for approval");
apps/web/src/lib\server\education-library-service.ts:454:      throw new ApiError(404, "Education package not found");
apps/web/src/lib\server\education-library-service.ts:573:      throw new ApiError(404, "Consent template version not found");
apps/web/src/lib\server\education-library-service.ts:585:      throw new ApiError(404, "Education package not found");
apps/web/src/lib\server\education-library-service.ts:593:      throw new ApiError(404, "Education version not found for template linkage");
apps/web/src/lib\server\education-library-service.ts:654:      throw new ApiError(404, "Education package not found");
apps/web/src/lib\server\education-library-service.ts:662:      throw new ApiError(404, "Education version not found for evidence generation");
apps/web/src/lib\server\email-provider.ts:143:function safeErrorMessage(error: unknown): string {
apps/web/src/lib\server\email-provider.ts:144:    return error instanceof Error ? error.message : String(error);
apps/web/src/lib\server\email-provider.ts:176:    } catch (error) {
apps/web/src/lib\server\email-provider.ts:178:        diagnostics.smtpVerifyError = safeErrorMessage(error);
apps/web/src/lib\server\evidence-package-2-service.ts:214:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\export-approval-service.ts:240:    throw new ApiError(404, "Export approval request not found");
apps/web/src/lib\server\export-approval-service.ts:303:    throw new ApiError(403, `Export approval required for ${args.targetKey}. Request approval before downloading this export.`);
apps/web/src/lib\server\imc-approved-pdf-template-engine.ts:63:  throw new ApiError(500, "IMC consent manifest not found");
apps/web/src/lib\server\imc-approved-pdf-template-engine.ts:99:  throw new ApiError(500, `IMC approved PDF file not found: ${publicPath}`);
apps/web/src/lib\server\imc-approved-pdf-template-engine.ts:129:    throw new ApiError(409, "PDF generation blocked: linked IMC template was not found in the approved manifest");
apps/web/src/lib\server\imc-approved-pdf-template-engine.ts:252:    errorCorrectionLevel: "M",
apps/web/src/lib\server\imc-approved-pdf-template-engine.ts:326:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\imc-approved-pdf-template-engine.ts:339:    throw new ApiError(409, "IMC manifest item not found");
apps/web/src/lib\server\http.ts:48:  error: unknown;
apps/web/src/lib\server\http.ts:58:    errorName: context.error instanceof Error ? context.error.name : undefined,
apps/web/src/lib\server\http.ts:62:    console.error("API_FAILURE", payload, context.error);
apps/web/src/lib\server\http.ts:81:      error: null,
apps/web/src/lib\server\http.ts:99:  const errorCode = init.code;
apps/web/src/lib\server\http.ts:106:      error: detail,
apps/web/src/lib\server\http.ts:111:      ...(errorCode ? { code: errorCode } : {}),
apps/web/src/lib\server\http.ts:124:function readStatus(error: unknown): number | null {
apps/web/src/lib\server\http.ts:125:  if (!error || typeof error !== "object") {
apps/web/src/lib\server\http.ts:129:  const status = (error as { status?: unknown; statusCode?: unknown }).status;
apps/web/src/lib\server\http.ts:130:  const statusCode = (error as { status?: unknown; statusCode?: unknown }).statusCode;
apps/web/src/lib\server\http.ts:145:function readMessage(error: unknown): string | null {
apps/web/src/lib\server\http.ts:146:  if (!error || typeof error !== "object") {
apps/web/src/lib\server\http.ts:150:  const message = (error as { message?: unknown; detail?: unknown }).message;
apps/web/src/lib\server\http.ts:151:  const detail = (error as { message?: unknown; detail?: unknown }).detail;
apps/web/src/lib\server\http.ts:157:function readPrismaCode(error: unknown): string | null {
apps/web/src/lib\server\http.ts:158:  if (!error || typeof error !== "object") {
apps/web/src/lib\server\http.ts:162:  const code = (error as { code?: unknown }).code;
apps/web/src/lib\server\http.ts:166:function readErrorCode(error: unknown): string | null {
apps/web/src/lib\server\http.ts:167:  if (!error || typeof error !== "object") {
apps/web/src/lib\server\http.ts:171:  const code = (error as { code?: unknown }).code;
apps/web/src/lib\server\http.ts:175:function readPrismaMeta(error: unknown): Record<string, unknown> | null {
apps/web/src/lib\server\http.ts:176:  if (!error || typeof error !== "object") {
apps/web/src/lib\server\http.ts:180:  const meta = (error as { meta?: unknown }).meta;
apps/web/src/lib\server\http.ts:184:export function handleApiError(error: unknown) {
apps/web/src/lib\server\http.ts:187:  if (error instanceof ApiError) {
apps/web/src/lib\server\http.ts:190:      status: error.status,
apps/web/src/lib\server\http.ts:191:      message: error.message,
apps/web/src/lib\server\http.ts:192:      error,
apps/web/src/lib\server\http.ts:194:    return jsonError(error.status, error.message, {
apps/web/src/lib\server\http.ts:196:      ...(error.code ? { code: error.code } : {}),
apps/web/src/lib\server\http.ts:197:      ...(error.fields ? { fields: error.fields } : {}),
apps/web/src/lib\server\http.ts:201:  const domainCode = readErrorCode(error);
apps/web/src/lib\server\http.ts:204:    logApiFailure({ traceId, status: 404, message, error, code: domainCode });
apps/web/src/lib\server\http.ts:208:  const prismaCode = readPrismaCode(error);
apps/web/src/lib\server\http.ts:210:    const meta = readPrismaMeta(error);
apps/web/src/lib\server\http.ts:217:    logApiFailure({ traceId, status: 409, message, error, code: prismaCode });
apps/web/src/lib\server\http.ts:222:    logApiFailure({ traceId, status: 400, message, error, code: prismaCode });
apps/web/src/lib\server\http.ts:226:    const message = "Requested record was not found";
apps/web/src/lib\server\http.ts:227:    logApiFailure({ traceId, status: 404, message, error, code: prismaCode });
apps/web/src/lib\server\http.ts:232:    logApiFailure({ traceId, status: 503, message, error, code: prismaCode });
apps/web/src/lib\server\http.ts:237:    logApiFailure({ traceId, status: 400, message, error, code: prismaCode });
apps/web/src/lib\server\http.ts:241:  const status = readStatus(error);
apps/web/src/lib\server\http.ts:242:  const message = readMessage(error);
apps/web/src/lib\server\http.ts:244:    logApiFailure({ traceId, status, message, error, code: prismaCode });
apps/web/src/lib\server\http.ts:251:    message: "Internal server error",
apps/web/src/lib\server\http.ts:252:    error,
apps/web/src/lib\server\http.ts:255:  return jsonError(500, "Internal server error", { traceId });
apps/web/src/lib\server\informed-consents-evidence-vault-service.ts:51:  if (!doc) throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\informed-consents-evidence-vault-service.ts:151:  if (!doc) throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:484:  } catch (error) {
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:485:    console.warn("PDF Arabic font loading skipped", error);
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:572:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2090:      console.error("External PDF renderer failed, falling back to internal Puppeteer", externalError);
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2110:  } catch (error) {
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2111:    if (error instanceof ApiError) {
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2112:      return NextResponse.json({ error: error.message }, { status: error.status });
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2115:    console.error("renderFinalConsentPdfResponse", error);
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2118:      { error: "Failed to generate final consent PDF" },
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2133:    errorCorrectionLevel: "M",
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2164:  } catch (error) {
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2165:    if (error instanceof ApiError) {
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2166:      return NextResponse.json({ error: error.message }, { status: error.status });
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2169:    console.error("renderFinalConsentHtmlPreviewResponse", error);
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2172:      { error: "Failed to generate final consent HTML preview" },
apps/web/src/lib\server\legal-case-pdf-service.ts:132:  reason: "db_inline_payload_missing" | "db_inline_payload_empty" | "local_file_missing" | null;
apps/web/src/lib\server\legal-case-pdf-service.ts:245:      return { available: false, reason: "db_inline_payload_empty" };
apps/web/src/lib\server\legal-case-pdf-service.ts:305:        throw new Error(`PDF storage read-after-write returned empty file: ${absolutePath}`);
apps/web/src/lib\server\legal-case-pdf-service.ts:307:    } catch (error) {
apps/web/src/lib\server\legal-case-pdf-service.ts:308:      const message = error instanceof Error ? error.message : String(error);
apps/web/src/lib\server\legal-case-pdf-service.ts:420:    throw new ApiError(404, "Case not found");
apps/web/src/lib\server\legal-case-pdf-service.ts:997:    } catch (error) {
apps/web/src/lib\server\legal-case-pdf-service.ts:998:      console.warn("Failed to launch with configured Puppeteer executable path:", error);
apps/web/src/lib\server\legal-case-pdf-service.ts:1061:  } catch (error) {
apps/web/src/lib\server\legal-case-pdf-service.ts:1071:    throw error;
apps/web/src/lib\server\legal-case-pdf-service.ts:1099:        ? readString(metadata, "error", "recovery_message") || "Regeneration required"
apps/web/src/lib\server\legal-case-pdf-service.ts:1197:  errorMessage: string;
apps/web/src/lib\server\legal-case-pdf-service.ts:1209:    error: args.errorMessage,
apps/web/src/lib\server\legal-case-pdf-service.ts:1221:            error: args.errorMessage,
apps/web/src/lib\server\legal-case-pdf-service.ts:1244:            error: args.errorMessage,
apps/web/src/lib\server\legal-case-pdf-service.ts:1264:      message: args.errorMessage,
apps/web/src/lib\server\legal-case-pdf-service.ts:1353:      errorCorrectionLevel: "M",
apps/web/src/lib\server\legal-case-pdf-service.ts:1547:  } catch (error) {
apps/web/src/lib\server\legal-case-pdf-service.ts:1548:    const message = error instanceof Error ? error.message : "Unknown PDF generation error";
apps/web/src/lib\server\legal-case-pdf-service.ts:1554:      error,
apps/web/src/lib\server\legal-case-pdf-service.ts:1563:      error: message,
apps/web/src/lib\server\legal-case-pdf-service.ts:1573:      errorMessage: message,
apps/web/src/lib\server\legal-case-pdf-service.ts:1578:      "PDF generation failed. Please review missing case fields or template rendering errors.",
apps/web/src/lib\server\legal-case-pdf-service.ts:1656:    throw new ApiError(404, `PDF version ${version} not found`);
apps/web/src/lib\server\legal-case-pdf-service.ts:1683:        error: "Version metadata exists but file is missing; regenerate required",
apps/web/src/lib\server\legal-readiness-service.ts:178:      key: "validation_errors_closed",
apps/web/src/lib\server\legal-readiness-service.ts:184:          ? "No open validation errors"
apps/web/src/lib\server\legal-readiness-service.ts:185:          : `${input.openValidationErrors} validation error(s) remain open.`,
apps/web/src/lib\server\legal-readiness-service.ts:239:    throw new ApiError(404, "Case not found");
apps/web/src/lib\server\legal-readiness-service.ts:298:    openValidationErrors: readNumber(validation, "open_errors") ?? 0,
apps/web/src/lib\server\legal-readiness-service.test.ts:73:  assert.ok(report.blockers.some((item) => item.includes("validation errors")));
apps/web/src/lib\server\legal-package-module-service.ts:982:    throw new ApiError(404, "Document not found");
apps/web/src/lib\server\magic-link-auth.ts:106:      return new ApiError(404, "User not found");
apps/web/src/lib\server\magic-link-auth.ts:325:    throw new ApiError(404, "User not found");
apps/web/src/lib\server\magic-link-auth.ts:333:    throw new ApiError(400, "Tenant not found");
apps/web/src/lib\server\magic-link-auth.ts:409:      throw new ApiError(404, "User not found");
apps/web/src/lib\server\informed-consents-wording-governance-service.ts:285:  if (!row) throw new ApiError(404, "Wording entry not found");
apps/web/src/lib\server\informed-consents-wording-governance-service.ts:371:  if (!row) throw new ApiError(404, "Wording entry not found");
apps/web/src/lib\server\informed-consents-wording-governance-service.ts:452:  if (!row) throw new ApiError(404, "Wording entry not found");
apps/web/src/lib\server\informed-consents-wording-governance-service.ts:516:    throw new ApiError(404, "Wording version not found");
apps/web/src/lib\server\magic-link-route-flow.ts:113:function readErrorStatus(error: unknown): number | null {
apps/web/src/lib\server\magic-link-route-flow.ts:114:    if (!error || typeof error !== "object") {
apps/web/src/lib\server\magic-link-route-flow.ts:118:    const candidate = (error as { status?: unknown; statusCode?: unknown }).status
apps/web/src/lib\server\magic-link-route-flow.ts:119:        ?? (error as { status?: unknown; statusCode?: unknown }).statusCode;
apps/web/src/lib\server\magic-link-route-flow.ts:223:                console.error("magic-link request: audit write failed", auditError);
apps/web/src/lib\server\magic-link-route-flow.ts:225:        } catch (error) {
apps/web/src/lib\server\magic-link-route-flow.ts:226:            const status = readErrorStatus(error);
apps/web/src/lib\server\magic-link-route-flow.ts:232:            console.error("magic-link request failed", error);
apps/web/src/lib\server\magic-link-route-flow.ts:290:            console.error("magic-link verify: audit write failed", auditError);
apps/web/src/lib\server\magic-link-route-flow.ts:307:    } catch (error) {
apps/web/src/lib\server\magic-link-route-flow.ts:308:        if (error instanceof Error) {
apps/web/src/lib\server\magic-link-route-flow.ts:309:            const code = codeFromMagicLinkVerifyDetail(error.message);
apps/web/src/lib\server\magic-link-route-flow.ts:314:                    detail: error.message,
apps/web/src/lib\server\magic-link-route-flow.ts:320:        throw error;
apps/web/src/lib\server\module-api-route-handlers.ts:75:    } catch (error) {
apps/web/src/lib\server\module-api-route-handlers.ts:76:      return handleApiError(error);
apps/web/src/lib\server\module-api-route-handlers.ts:88:    } catch (error) {
apps/web/src/lib\server\module-api-route-handlers.ts:89:      return handleApiError(error);
apps/web/src/lib\server\module-api-route-handlers.ts:110:    } catch (error) {
apps/web/src/lib\server\module-api-route-handlers.ts:111:      return handleApiError(error);
apps/web/src/lib\server\module-api-route-handlers.ts:123:    } catch (error) {
apps/web/src/lib\server\module-api-route-handlers.ts:124:      return handleApiError(error);
apps/web/src/lib\server\module-consent-service.ts:81:    throw new ApiError(404, "Case not found");
apps/web/src/lib\server\modules-api-routes.test.ts:65:    assert.equal(payload.error, "Tenant is inactive");
apps/web/src/lib\server\modules-api-routes.test.ts:115:    assert.equal(payload.error, "Tenant is inactive");
apps/web/src/lib\server\module-secure-signing-service.ts:366:  } catch (error) {
apps/web/src/lib\server\module-secure-signing-service.ts:367:    console.error("[module-secure-signing] appendAuditChainEvent failed", error);
apps/web/src/lib\server\operations.ts:370:    throw new ApiError(404, "Operational state not found");
apps/web/src/lib\server\integrations\taqniat-sms-adapter.ts:15:  error?: string;
apps/web/src/lib\server\integrations\taqniat-sms-adapter.ts:67:          error: `Taqniat SMS failed: ${res.status} ${text}`,
apps/web/src/lib\server\integrations\taqniat-sms-adapter.ts:76:        error: `Taqniat SMS exception: ${String(err)}`,
apps/web/src/lib\server\pageAuth.ts:158:  } catch (error) {
apps/web/src/lib\server\pageAuth.ts:162:      error,
apps/web/src/lib\server\pageAuth.ts:168:    redirectToLogin(nextPath, "session_cookie_error");
apps/web/src/lib\server\pageAuth.ts:216:  } catch (error) {
apps/web/src/lib\server\pageAuth.ts:220:      error,
apps/web/src/lib\server\password.ts:10:export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
apps/web/src/lib\server\password.ts:11:    const errors: string[] = [];
apps/web/src/lib\server\password.ts:14:        errors.push("Password is required");
apps/web/src/lib\server\password.ts:15:        return { valid: false, errors };
apps/web/src/lib\server\password.ts:19:        errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
apps/web/src/lib\server\password.ts:23:        errors.push("Password must contain at least one uppercase letter");
apps/web/src/lib\server\password.ts:27:        errors.push("Password must contain at least one lowercase letter");
apps/web/src/lib\server\password.ts:31:        errors.push("Password must contain at least one number");
apps/web/src/lib\server\password.ts:35:        errors.push("Password must contain at least one special character");
apps/web/src/lib\server\password.ts:38:    return { valid: errors.length === 0, errors };
apps/web/src/lib\server\password-signup-route.test.ts:23:    assert.equal(payload.error, "Public signup is disabled. Accounts must be provisioned by an authorized administrator.");
apps/web/src/lib\server\pilot-email-override.ts:427:  } catch (error) {
apps/web/src/lib\server\pilot-email-override.ts:428:    const failureReason = error instanceof Error ? error.message : String(error);
apps/web/src/lib\server\pilot-email-override.ts:604:  } catch (error) {
apps/web/src/lib\server\pilot-email-override.ts:605:    const failureReason = error instanceof Error ? error.message : String(error);
apps/web/src/lib\server\pilot-email-override.ts:789:  } catch (error) {
apps/web/src/lib\server\pilot-email-override.ts:790:    const failureReason = error instanceof Error ? error.message : String(error);
apps/web/src/lib\server\pilot-email-override.ts:915:  } catch (error) {
apps/web/src/lib\server\pilot-email-override.ts:916:    const failureReason = error instanceof Error ? error.message : String(error);
apps/web/src/lib\server\policy-attestation-service.ts:255:    throw new ApiError(404, "Policy attestation record was not found");
apps/web/src/lib\server\policy-attestation-service.ts:356:    throw new ApiError(404, "Tenant not found");
apps/web/src/lib\server\platform-tenant.ts:44:            console.error("getPlatformTenant: failed to bootstrap platform tenant", fallbackError);
apps/web/src/lib\server\public-signing-service.ts:331:    error: string | null;
apps/web/src/lib\server\public-signing-service.ts:386:      throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\public-signing-service.ts:394:        error: "Final PDF is not ready until all required signatures are completed.",
apps/web/src/lib\server\public-signing-service.ts:398:        throw new ApiError(409, pendingState.error);
apps/web/src/lib\server\public-signing-service.ts:411:      error: null,
apps/web/src/lib\server\public-signing-service.ts:414:  } catch (error) {
apps/web/src/lib\server\public-signing-service.ts:415:    if (args.throwOnFailure && error instanceof ApiError) {
apps/web/src/lib\server\public-signing-service.ts:416:      throw error;
apps/web/src/lib\server\public-signing-service.ts:418:    const message = error instanceof Error ? error.message : "Final PDF generation is currently unavailable.";
apps/web/src/lib\server\public-signing-service.ts:424:      error: message,
apps/web/src/lib\server\public-signing-service.ts:1135:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\public-signing-service.ts:1666:    throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\public-signing-service.ts:1805:    console.error("[PUBLIC_SIGNING_ARABIC_MOJIBAKE_BLOCKED]", {
apps/web/src/lib\server\public-signing-service.ts:2599:        error: "Final PDF will be available after the patient-side signing journey is complete.",
apps/web/src/lib\server\promissory-note-pdf.ts:350:    ? await readFontAsDataUri(config.latinPath, "font/woff2").catch((error: unknown) => {
apps/web/src/lib\server\promissory-note-pdf.ts:351:      console.warn("Failed to load embedded Latin font for promissory PDF", error);
apps/web/src/lib\server\promissory-note-pdf.ts:429:    candidates.map((candidate) => buildEmbeddedFontFaceCss(candidate).catch((error: unknown) => {
apps/web/src/lib\server\promissory-note-pdf.ts:432:        error,
apps/web/src/lib\server\promissory-note-service.ts:145:    throw new ApiError(404, "Case not found");
apps/web/src/lib\server\remediation-tracker-service.ts:256:    throw new ApiError(404, "Remediation action was not found");
apps/web/src/lib\server\remediation-tracker-service.ts:348:    throw new ApiError(404, "Tenant not found");
apps/web/src/lib\server\runtime-observability.ts:5:export type RuntimeSeverity = "debug" | "info" | "warn" | "error" | "critical";
apps/web/src/lib\server\runtime-observability.ts:155:  if (args.severity === "critical" || args.severity === "error") {
apps/web/src/lib\server\runtime-observability.ts:156:    console.error("RUNTIME_EVENT", JSON.stringify(payload));
apps/web/src/lib\server\runtime-observability.ts:173:  error?: unknown;
apps/web/src/lib\server\runtime-observability.ts:177:  const errorName = args.error instanceof Error ? args.error.name : "UnknownError";
apps/web/src/lib\server\runtime-observability.ts:178:  const errorMessage = args.error instanceof Error ? args.error.message : args.error ? String(args.error) : "incident";
apps/web/src/lib\server\runtime-observability.ts:185:    severity: "error",
apps/web/src/lib\server\runtime-observability.ts:188:      errorName,
apps/web/src/lib\server\runtime-observability.ts:189:      errorMessage,
apps/web/src/lib\server\saas-services.ts:360:    console.error("audit chain append failed (non-fatal)", auditChainError);
apps/web/src/lib\server\security-policy-service.ts:308:  } catch (error) {
apps/web/src/lib\server\security-policy-service.ts:309:    console.error("privileged access log write failed", error);
apps/web/src/lib\server\secure-links.ts:334:function isMissingTableError(error: unknown): boolean {
apps/web/src/lib\server\secure-links.ts:335:  if (!error || typeof error !== "object") {
apps/web/src/lib\server\secure-links.ts:339:  const code = (error as { code?: unknown }).code;
apps/web/src/lib\server\secure-links.ts:370:    throw new ApiError(404, "Case not found");
apps/web/src/lib\server\secure-links.ts:682:    throw new ApiError(404, "Secure link not found");
apps/web/src/lib\server\secure-links.ts:738:  } catch (error) {
apps/web/src/lib\server\secure-links.ts:739:    if (error instanceof ApiError) {
apps/web/src/lib\server\secure-links.ts:741:        status: error.status,
apps/web/src/lib\server\secure-links.ts:742:        reason: error.message,
apps/web/src/lib\server\secure-links.ts:746:    throw error;
apps/web/src/lib\server\secure-links.ts:848:    } catch (error) {
apps/web/src/lib\server\secure-links.ts:849:      if (isMissingTableError(error)) {
apps/web/src/lib\server\secure-links.ts:900:  } catch (error) {
apps/web/src/lib\server\secure-links.ts:901:    if (error instanceof ApiError) {
apps/web/src/lib\server\secure-links.ts:903:        status: error.status,
apps/web/src/lib\server\secure-links.ts:904:        reason: error.message,
apps/web/src/lib\server\secure-links.ts:909:    throw error;
apps/web/src/lib\server\signature-evidence.test.ts:20:test("tablet signature validation rejects empty payloads", () => {
apps/web/src/lib\server\signature-evidence.test.ts:28:    /empty or incomplete/,
apps/web/src/lib\server\signature-manager.ts:31:  error?: string;
apps/web/src/lib\server\signature-manager.ts:39:  error?: string;
apps/web/src/lib\server\signature-manager.ts:94:      throw new Error(`Certificate not found: ${certPath}`);
apps/web/src/lib\server\signature-manager.ts:98:      throw new Error(`Private key not found: ${keyPath}`);
apps/web/src/lib\server\signature-manager.ts:141:    } catch (error) {
apps/web/src/lib\server\signature-manager.ts:144:        error: `Signing failed: ${error instanceof Error ? error.message : String(error)}`,
apps/web/src/lib\server\signature-manager.ts:171:          error: 'Manifest hash mismatch - data has been modified',
apps/web/src/lib\server\signature-manager.ts:181:    } catch (error) {
apps/web/src/lib\server\signature-manager.ts:184:        error: `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
apps/web/src/lib\server\signature-orchestration-service.ts:143:      error: String(err),
apps/web/src/lib\server\signature-orchestration-service.ts:323:  if (!sess) throw new SignatureProviderError("Session not found.");
apps/web/src/lib\server\signature-orchestration-service.ts:359:  if (!sess) throw new SignatureProviderError("Session not found.");
apps/web/src/lib\server\signature-orchestration-service.ts:400:  if (!sess) throw new SignatureProviderError("Session not found.");
apps/web/src/lib\server\tenant-admin.ts:126:function isMissingTableError(error: unknown): boolean {
apps/web/src/lib\server\tenant-admin.ts:127:    if (!error || typeof error !== "object") {
apps/web/src/lib\server\tenant-admin.ts:131:    const code = (error as { code?: unknown }).code;
apps/web/src/lib\server\tenant-admin.ts:186:    } catch (error) {
apps/web/src/lib\server\tenant-admin.ts:187:        if (isMissingTableError(error)) {
apps/web/src/lib\server\tenant-admin.ts:191:        throw error;
apps/web/src/lib\server\tenant-admin.ts:248:    } catch (error) {
apps/web/src/lib\server\tenant-admin.ts:249:        if (isMissingTableError(error)) {
apps/web/src/lib\server\tenant-admin.ts:253:        throw error;
apps/web/src/lib\server\tenant-admin.ts:262:    // whole transaction (25P02), which creates noisy non-fatal errors on every
apps/web/src/lib\server\tenantBrandingStore.ts:156:function isMissingTableError(error: unknown, tableName: string): boolean {
apps/web/src/lib\server\tenantBrandingStore.ts:157:    if (!error || typeof error !== "object") {
apps/web/src/lib\server\tenantBrandingStore.ts:161:    const candidate = error as { code?: unknown; meta?: { code?: unknown; message?: unknown } };
apps/web/src/lib\server\tenantBrandingStore.ts:199:    } catch (error) {
apps/web/src/lib\server\tenantBrandingStore.ts:200:        if (isMissingTableError(error, "tenant_branding")) {
apps/web/src/lib\server\tenantBrandingStore.ts:201:            console.warn("[tenant-branding] tenant_branding table not found; returning null profile.");
apps/web/src/lib\server\tenantBrandingStore.ts:204:        throw error;
apps/web/src/lib\server\third-party-risk-service.ts:255:    throw new ApiError(404, "Third-party processor entry was not found");
apps/web/src/lib\server\third-party-risk-service.ts:381:    throw new ApiError(404, "Tenant not found");
apps/web/src/lib\server\training-compliance-service.ts:215:    throw new ApiError(404, "Training item was not found");
apps/web/src/lib\server\training-compliance-service.ts:305:    throw new ApiError(404, "Tenant not found");
apps/web/src/lib\server\tsa-client.ts:71:      } catch (error) {
apps/web/src/lib\server\tsa-client.ts:73:          throw error;
apps/web/src/lib\server\tsa-client.ts:153:          } catch (error) {
apps/web/src/lib\server\tsa-client.ts:154:            reject(new Error(`Failed to parse TSA response: ${error}`));
apps/web/src/lib\server\tsa-client.ts:159:      req.on('error', (error: Error) => {
apps/web/src/lib\server\tsa-client.ts:160:        reject(new Error(`TSA request failed: ${error.message}`));
apps/web/src/lib\server\tsa-client.ts:179:  ): { valid: boolean; error?: string } {
apps/web/src/lib\server\tsa-client.ts:184:        return { valid: false, error: 'Missing timestamp token' };
apps/web/src/lib\server\tsa-client.ts:190:          error: `Invalid token status: ${token.status}`,
apps/web/src/lib\server\tsa-client.ts:200:        return { valid: false, error: 'Timestamp token expired' };
apps/web/src/lib\server\tsa-client.ts:204:    } catch (error) {
apps/web/src/lib\server\tsa-client.ts:207:        error: `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
apps/web/src/lib\server\witness-integrity-service.test.ts:70:test("throws structured error for duplicate identities", () => {
apps/web/src/lib\server\witness-integrity-service.test.ts:84:    (error: unknown) => {
apps/web/src/lib\server\witness-integrity-service.test.ts:85:      const value = error as { message?: string; code?: string; fields?: Record<string, string> };
apps/web/src/lib\server\witness-integrity-service.test.ts:95:test("throws structured error when role composition is invalid", () => {
apps/web/src/lib\server\witness-integrity-service.test.ts:113:    (error: unknown) => {
apps/web/src/lib\server\witness-integrity-service.test.ts:114:      const value = error as { message?: string; code?: string };
apps/web/src/lib\server\witness-integrity-service.test.ts:120:test("throws structured error when attestation is incomplete", () => {
apps/web/src/lib\server\witness-integrity-service.test.ts:137:    (error: unknown) => {
apps/web/src/lib\server\witness-integrity-service.test.ts:138:      const value = error as { message?: string; code?: string };
apps/web/src/lib\server\trakcare\client.ts:109:  } catch (error) {
apps/web/src/lib\server\trakcare\client.ts:110:    if (error instanceof Error && error.name === "AbortError") {
apps/web/src/lib\server\trakcare\client.ts:113:    throw error;
apps/web/src/lib\server\trakcare\client.ts:256:          throw new ApiError(404, "TrakCare record not found");
apps/web/src/lib\server\trakcare\client.ts:288:    } catch (error) {
apps/web/src/lib\server\trakcare\client.ts:289:      finalError = error;
apps/web/src/lib\server\trakcare\client.ts:290:      if (error instanceof ApiError) {
apps/web/src/lib\server\trakcare\client.ts:291:        if (RETRYABLE_STATUS_CODES.has(error.status) && attempt < config.retryCount) {
apps/web/src/lib\server\trakcare\client.ts:316:      errorCode: String(apiError.status),
apps/web/src/lib\server\trakcare\client.ts:317:      errorMessage: apiError.message,
apps/web/src/lib\server\unified-legal-evidence-service.ts:383:  if (!doc) throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\unified-legal-evidence-service.ts:506:  if (!doc) throw new ApiError(404, "Consent document not found");
apps/web/src/lib\server\unified-legal-evidence-service.ts:581:  if (!doc) throw new ApiError(404, "Consent document not found");
END MATCHES

## Audit and logging references in apps/web/src/lib

BEGIN MATCHES
apps/web/src/lib\demo-access.ts:91:    scopeLabel: "Audit and governance review",
apps/web/src/lib\config\ui-refresh-flag.ts:9: *   - NEVER touches: OTP logic, signing workflow, audit chain,
apps/web/src/lib\procedure-education\sample-library.ts:142:        infographicType: "journey_timeline",
apps/web/src/lib\procedure-education\sample-library.ts:270:    recoveryEn: "Defines mobility goals, pain management, and wound-care timeline.",
apps/web/src/lib\config\platform-config.ts:110:// Audit & Retention
apps/web/src/lib\config\platform-config.ts:118:  /** Audit chain algorithm */
apps/web/src/lib\config\platform-config.ts:150:  audit: AUDIT_CONFIG,
apps/web/src/lib\projection\unified-disclosure-types.ts:83:export type AuditMetadataProjection = {
apps/web/src/lib\projection\unified-disclosure-types.ts:84:  auditEventRefs: string[];
apps/web/src/lib\projection\unified-disclosure-types.ts:107:  auditMetadata?: Partial<AuditMetadataProjection>;
apps/web/src/lib\projection\unified-disclosure-types.ts:125:  auditMetadata: AuditMetadataProjection;
apps/web/src/lib\projection\unified-disclosure-shadow-mode.ts:250:    auditMetadata: projected.auditMetadata,
apps/web/src/lib\projection\unified-disclosure-shadow-mode.ts:262:    auditMetadata: projected.auditMetadata,
apps/web/src/lib\projection\unified-disclosure-projection.ts:4:  AuditMetadataProjection,
apps/web/src/lib\projection\unified-disclosure-projection.ts:162:function normalizeAuditMetadata(input: Partial<AuditMetadataProjection> | undefined): AuditMetadataProjection {
apps/web/src/lib\projection\unified-disclosure-projection.ts:172:  const traceabilityStatus: AuditMetadataProjection["traceabilityStatus"] =
apps/web/src/lib\projection\unified-disclosure-projection.ts:178:    auditEventRefs: normalizeStringArray(input?.auditEventRefs),
apps/web/src/lib\projection\unified-disclosure-projection.ts:229:    auditMetadata: normalizeAuditMetadata(input.auditMetadata),
apps/web/src/lib\projection\unified-disclosure-projection.ts:253:  const auditMetadata = normalizeAuditMetadata(input.auditMetadata);
apps/web/src/lib\projection\unified-disclosure-projection.ts:271:    auditMetadata,
apps/web/src/lib\projection\unified-disclosure-projection.ts:292:    auditMetadata,
apps/web/src/lib\permissions\ui-rbac.ts:13:  | "audit.read"
apps/web/src/lib\permissions\ui-rbac.ts:69:    "audit.read",
apps/web/src/lib\permissions\ui-rbac.ts:87:    "audit.read",
apps/web/src/lib\permissions\ui-rbac.ts:105:    "audit.read",
apps/web/src/lib\permissions\ui-rbac.ts:122:    "audit.read",
apps/web/src/lib\permissions\ui-rbac.ts:144:    "audit.read",
apps/web/src/lib\permissions\ui-rbac.ts:149:    "audit.read",
apps/web/src/lib\permissions\ui-rbac.ts:153:    "audit.read",
apps/web/src/lib\demo\legalDemoData.ts:16:export type DemoAuditEvent = {
apps/web/src/lib\demo\legalDemoData.ts:63:    summary: "Audit continuity is established; one final document readiness control remains open prior to issue.",
apps/web/src/lib\demo\legalDemoData.ts:101:    title: "Audit chain verification",
apps/web/src/lib\demo\legalDemoData.ts:110:export const legalDemoAuditTimeline: DemoAuditEvent[] = [
apps/web/src/lib\demo\legalDemoData.ts:138:    action: "Audit chain verified",
apps/web/src/lib\config\feature-flags.ts:63:// Audit & Evidence
apps/web/src/lib\config\feature-flags.ts:66:/** Enable immutable timeline audit events */
apps/web/src/lib\config\feature-flags.ts:75:/** Enable audit chain cryptographic integrity */
apps/web/src/lib\modules\patient-education-events.ts:5: * patient-education telemetry to the existing audit/evidence pipeline. The
apps/web/src/lib\modules\patient-education-events.ts:8: * `ConsentAuditEvent` + `AuditLog` with no schema changes.
apps/web/src/lib\modules\patient-education-events.ts:39:  /** Optional case id propagated to the audit chain. */
apps/web/src/lib\modules\patient-education-events.ts:47: * to the console so that UI flow is not blocked by audit-pipeline outages.
apps/web/src/lib\pdf-engine\access-control\role-policy.ts:7:  | "auditor"
apps/web/src/lib\pdf-engine\access-control\role-policy.ts:17:  | "read-access-audit"
apps/web/src/lib\pdf-engine\access-control\role-policy.ts:31:  auditor: ["view", "verify", "inspect-forensics", "read-access-audit"],
apps/web/src/lib\pdf-engine\access-control\role-policy.ts:32:  "compliance-officer": ["view", "verify", "export", "place-legal-hold", "manage-retention", "read-access-audit"],
apps/web/src/lib\pdf-engine\access-control\role-policy.ts:33:  investigator: ["view", "verify", "inspect-forensics", "export", "read-access-audit"],
apps/web/src/lib\pdf-engine\access-control\role-policy.ts:34:  "legal-admin": ["view", "verify", "export", "place-legal-hold", "inspect-forensics", "read-access-audit", "manage-retention"],
apps/web/src/lib\pdf-engine\access-control\role-policy.ts:38:  "risk-management": ["view", "verify", "inspect-forensics", "manage-retention", "read-access-audit"],
apps/web/src/lib\pdf-engine\access-control\role-policy.ts:42:  auditor: "forensic",
apps/web/src/lib\environment\audit-logging.ts:2: * Environment Audit Logging
apps/web/src/lib\environment\audit-logging.ts:7:export type EnvironmentAuditEventType =
apps/web/src/lib\environment\audit-logging.ts:19:export interface EnvironmentAuditEvent {
apps/web/src/lib\environment\audit-logging.ts:20:  eventType: EnvironmentAuditEventType;
apps/web/src/lib\environment\audit-logging.ts:34: * Log environment-related audit events
apps/web/src/lib\environment\audit-logging.ts:36: * These should be persisted to an audit trail in the database
apps/web/src/lib\environment\audit-logging.ts:38:export function auditEnvironmentEvent(event: EnvironmentAuditEvent): void {
apps/web/src/lib\environment\audit-logging.ts:54:  // - Audit trail database
apps/web/src/lib\environment\audit-logging.ts:58:  // TODO: Implement actual audit logging to database
apps/web/src/lib\environment\audit-logging.ts:65:export function auditTestAccountAccess(
apps/web/src/lib\environment\audit-logging.ts:73:  auditEnvironmentEvent({
apps/web/src/lib\environment\audit-logging.ts:88:export function auditTestSmsSent(
apps/web/src/lib\environment\audit-logging.ts:97:  auditEnvironmentEvent({
apps/web/src/lib\environment\audit-logging.ts:115:export function auditTestCaseCreated(
apps/web/src/lib\environment\audit-logging.ts:122:  auditEnvironmentEvent({
apps/web/src/lib\environment\audit-logging.ts:137:export function auditEvidenceExport(
apps/web/src/lib\environment\audit-logging.ts:146:  auditEnvironmentEvent({
apps/web/src/lib\environment\audit-logging.ts:165:export function auditDataMixing(
apps/web/src/lib\environment\audit-logging.ts:172:  auditEnvironmentEvent({
apps/web/src/lib\environment\audit-logging.ts:186:export function auditTestDataInReport(
apps/web/src/lib\environment\audit-logging.ts:195:  auditEnvironmentEvent({
apps/web/src/lib\core\wording-types.ts:104:  // Governance & Audit
apps/web/src/lib\core\wording-types.ts:109:  auditTrail: WordingAuditEntry[];
apps/web/src/lib\core\wording-types.ts:123: * Audit Entry for Wording Changes
apps/web/src/lib\core\wording-types.ts:125:export interface WordingAuditEntry {
apps/web/src/lib\modules\catalog.ts:86:      en: "Manage discharge refusal cases, secure patient acknowledgment, audit trails, and legal package generation.",
apps/web/src/lib\modules\catalog.ts:90:      en: "Operational discharge-refusal workflows covering patient acknowledgment, audit sequencing, secure evidence, and legal package output.",
apps/web/src/lib\pdf-engine\access-control\evidence-permissions.ts:27:  return !["legal-admin", "auditor", "investigator", "risk-management"].includes(input.role);
apps/web/src/lib\environment\index.ts:32:// Audit logging
apps/web/src/lib\environment\index.ts:34:  type EnvironmentAuditEventType,
apps/web/src/lib\environment\index.ts:35:  type EnvironmentAuditEvent,
apps/web/src/lib\environment\index.ts:36:  auditEnvironmentEvent,
apps/web/src/lib\environment\index.ts:37:  auditTestAccountAccess,
apps/web/src/lib\environment\index.ts:38:  auditTestSmsSent,
apps/web/src/lib\environment\index.ts:39:  auditTestCaseCreated,
apps/web/src/lib\environment\index.ts:40:  auditEvidenceExport,
apps/web/src/lib\environment\index.ts:41:  auditDataMixing,
apps/web/src/lib\environment\index.ts:42:  auditTestDataInReport,
apps/web/src/lib\environment\index.ts:43:} from "./audit-logging";
apps/web/src/lib\core\wording-repository-service.ts:208:      dynamicFieldsModified: true, // Set based on audit trail in production
apps/web/src/lib\core\wording-repository-service.ts:256:      auditTrail: [
apps/web/src/lib\core\wording-repository-service.ts:258:          id: `audit-${Date.now()}`,
apps/web/src/lib\server\admin-bootstrap.ts:43:  { code: "platform_superadmin", name: "Platform Superadmin", isSystem: true, permissions: ["platform:*", "tenants:*", "subscriptions:*", "users:*", "roles:*", "billing:*", "audit:*"] },
apps/web/src/lib\server\admin-bootstrap.ts:44:  { code: "platform_admin", name: "Platform Admin", isSystem: true, permissions: ["tenants:read", "tenants:write", "subscriptions:*", "users:*", "roles:*", "billing:*", "audit:read"] },
apps/web/src/lib\server\admin-bootstrap.ts:45:  { code: "tenant_owner", name: "Tenant Owner", isSystem: true, permissions: ["tenant:manage", "departments:*", "users:*", "memberships:*", "roles:read", "roles:assign", "audit:read"] },
apps/web/src/lib\server\admin-bootstrap.ts:46:  { code: "tenant_admin", name: "Tenant Admin", isSystem: true, permissions: ["tenant:read", "departments:*", "users:*", "memberships:*", "roles:read", "roles:assign", "audit:read"] },
apps/web/src/lib\server\admin-bootstrap.ts:55:  { code: "legal_admin", name: "Legal Admin", isSystem: true, permissions: ["escalation:*", "evidence_bundle:*", "audit:read"] },
apps/web/src/lib\server\admin-bootstrap.ts:58:  { code: "compliance", name: "Compliance", isSystem: true, permissions: ["compliance:review", "audit:read"] },
apps/web/src/lib\modules\informed-consents-rbac.ts:24:  | "audit:view";
apps/web/src/lib\modules\informed-consents-rbac.ts:30:  "audit:view",
apps/web/src/lib\modules\informed-consents-rbac.ts:92:    "audit:view",
apps/web/src/lib\modules\informed-consents-rbac.ts:100:    "audit:view",
apps/web/src/lib\modules\informed-consents-rbac.ts:108:    "audit:view",
apps/web/src/lib\modules\informed-consents-rbac.ts:113:    "audit:view",
apps/web/src/lib\modules\informed-consents-rbac.ts:144:  auditor:          "consent_viewer",
apps/web/src/lib\pdf-engine\verification\verification-validator.ts:3:import { generateAuditChainHash } from "@/lib/pdf-engine/runtime/forensic-audit-chain";
apps/web/src/lib\pdf-engine\verification\verification-validator.ts:8:  auditChainIntegrityValid: boolean;
apps/web/src/lib\pdf-engine\verification\verification-validator.ts:25:  const { currentChainHash, ...chainPayload } = legalEvidencePackage.auditChain;
apps/web/src/lib\pdf-engine\verification\verification-validator.ts:31:  const auditChainIntegrityValid = generateAuditChainHash(chainPayload) === currentChainHash;
apps/web/src/lib\pdf-engine\verification\verification-validator.ts:37:    auditChainIntegrityValid,
apps/web/src/lib\pdf-engine\verification\verification-validator.ts:42:    valid: immutableSealValid && auditChainIntegrityValid && snapshotValid && evidenceHashValid && otpEvidencePresent,
apps/web/src/lib\core\wording-repository-service.test.ts:235:      auditTrail: [],
apps/web/src/lib\core\wording-repository-service.test.ts:266:      auditTrail: [],
apps/web/src/lib\core\wording-repository-service.test.ts:297:      auditTrail: [],
apps/web/src/lib\server\ai-legal-intelligence.ts:32:  auditSourceLabel: "AI-assisted; human review required.";
apps/web/src/lib\server\ai-legal-intelligence.ts:172:    auditSourceLabel: "AI-assisted; human review required.",
apps/web/src/lib\services\dischargeRefusalWorkflow.service.ts:81:type BackendAuditLog = {
apps/web/src/lib\services\dischargeRefusalWorkflow.service.ts:194:  auditLogs: BackendAuditLog[],
apps/web/src/lib\services\dischargeRefusalWorkflow.service.ts:262:    auditTrail: auditLogs.map((item) => ({
apps/web/src/lib\services\dischargeRefusalWorkflow.service.ts:286:  const [workflow, auditTrail, caseDocuments] = await Promise.all([
apps/web/src/lib\services\dischargeRefusalWorkflow.service.ts:288:    apiFetch<BackendAuditLog[]>(`/api/discharge/audit/${encodeURIComponent(caseId)}`).catch(() => []),
apps/web/src/lib\services\dischargeRefusalWorkflow.service.ts:294:  return mapToContract(workflow, auditTrail, caseDocuments);
apps/web/src/lib\pdf-engine\verification\verification-resolver.ts:28:          auditId: archived.legalEvidencePackage.metadata.auditId,
apps/web/src/lib\pdf-engine\verification\verification-resolver.ts:50:          auditId: archived.legalEvidencePackage.metadata.auditId,
apps/web/src/lib\core\base-legal-domain.ts:15:import type { EvidenceCopyType } from "@/lib/core/audit-core";
apps/web/src/lib\core\base-legal-domain.ts:67:  auditChecksum?: string;
apps/web/src/lib\core\base-legal-domain.ts:110:// Base Audit Timeline
apps/web/src/lib\core\base-legal-domain.ts:113:export interface BaseAuditEvent {
apps/web/src/lib\core\base-legal-domain.ts:125:export interface BaseAuditTimeline {
apps/web/src/lib\core\base-legal-domain.ts:128:  events: BaseAuditEvent[];
apps/web/src/lib\core\base-legal-domain.ts:228:  | "audit_export";
apps/web/src/lib\clinical-ai\types\clinical-ai-types.ts:57:export interface ClinicalAiAuditRecord {
apps/web/src/lib\core\audit-core.ts:2: * Audit Core ΓÇö Enterprise Immutable Audit Service
apps/web/src/lib\core\audit-core.ts:4: * Centralized audit logging, timeline creation, and evidence packaging
apps/web/src/lib\core\audit-core.ts:18:export interface AuditEventInput {
apps/web/src/lib\core\audit-core.ts:37:  /** Previous audit chain hash (for chaining) */
apps/web/src/lib\core\audit-core.ts:41:export interface AuditEvent extends AuditEventInput {
apps/web/src/lib\core\audit-core.ts:64: * Compute a deterministic SHA-256 hash for an audit event.
apps/web/src/lib\core\audit-core.ts:99:// In-Process Audit Logger (delegates to Prisma service)
apps/web/src/lib\core\audit-core.ts:103: * Build a structured audit event ready for persistence.
apps/web/src/lib\core\audit-core.ts:106: * Use `writeConsentAudit` in consent-library-service for consent events,
apps/web/src/lib\core\audit-core.ts:109:export function buildAuditEvent(input: AuditEventInput): AuditEvent {
apps/web/src/lib\types\documents.ts:23:export type WorkflowAuditLog = {
apps/web/src/lib\core\audit-core.test.ts:2: * Audit Core Unit Tests
apps/web/src/lib\core\audit-core.test.ts:12:  buildAuditEvent,
apps/web/src/lib\core\audit-core.test.ts:16:} from "./audit-core";
apps/web/src/lib\core\audit-core.test.ts:75:// buildAuditEvent
apps/web/src/lib\core\audit-core.test.ts:78:test("buildAuditEvent returns event with id, timestamp, eventHash", () => {
apps/web/src/lib\core\audit-core.test.ts:79:  const event = buildAuditEvent({
apps/web/src/lib\server\audit-chain-service.test.ts:4:import { buildAuditChainHash, verifyAuditChain } from "./audit-chain-service";
apps/web/src/lib\server\audit-chain-service.test.ts:6:test("audit hash chain verifies a valid sequence", () => {
apps/web/src/lib\server\audit-chain-service.test.ts:7:  const firstHash = buildAuditChainHash({
apps/web/src/lib\server\audit-chain-service.test.ts:18:  const secondHash = buildAuditChainHash({
apps/web/src/lib\server\audit-chain-service.test.ts:29:  const verification = verifyAuditChain([
apps/web/src/lib\server\audit-chain-service.test.ts:58:test("audit hash chain detects tampering", () => {
apps/web/src/lib\server\audit-chain-service.test.ts:59:  const firstHash = buildAuditChainHash({
apps/web/src/lib\server\audit-chain-service.test.ts:70:  const verification = verifyAuditChain([
apps/web/src/lib\types\discharge-refusal.ts:1:import type { CaseDocument, WorkflowAuditLog } from "@/lib/types/documents";
apps/web/src/lib\types\discharge-refusal.ts:82:  auditTrail: WorkflowAuditLog[];
apps/web/src/lib\server\audit-chain-service.ts:10:type AuditChainEventDelegate = {
apps/web/src/lib\server\audit-chain-service.ts:16:function getAuditChainEventDelegate(): AuditChainEventDelegate {
apps/web/src/lib\server\audit-chain-service.ts:17:  const db = prisma() as unknown as { auditChainEvent?: AuditChainEventDelegate };
apps/web/src/lib\server\audit-chain-service.ts:18:  const delegate = db.auditChainEvent;
apps/web/src/lib\server\audit-chain-service.ts:20:    throw new ApiError(500, "Audit chain model is not available in current Prisma client");
apps/web/src/lib\server\audit-chain-service.ts:25:export type AuditChainHashInput = {
apps/web/src/lib\server\audit-chain-service.ts:38:export type AuditChainVerification = {
apps/web/src/lib\server\audit-chain-service.ts:46:export function buildAuditChainHash(input: AuditChainHashInput): string {
apps/web/src/lib\server\audit-chain-service.ts:77:export function verifyAuditChain(events: VerifiableChainEvent[]): AuditChainVerification {
apps/web/src/lib\server\audit-chain-service.ts:83:    const expectedHash = buildAuditChainHash({
apps/web/src/lib\server\audit-chain-service.ts:118:export async function appendAuditChainEvent(args: {
apps/web/src/lib\server\audit-chain-service.ts:130:    throw new ApiError(400, "Missing mandatory audit chain fields");
apps/web/src/lib\server\audit-chain-service.ts:133:  const auditChainEvent = getAuditChainEventDelegate();
apps/web/src/lib\server\audit-chain-service.ts:135:  const previous = await auditChainEvent.findFirst({
apps/web/src/lib\server\audit-chain-service.ts:147:  const currentHash = buildAuditChainHash({
apps/web/src/lib\server\audit-chain-service.ts:160:  return auditChainEvent.create({
apps/web/src/lib\server\audit-chain-service.ts:185:export async function getCaseAuditChain(tenantId: string, caseId: string) {
apps/web/src/lib\server\audit-chain-service.ts:186:  const auditChainEvent = getAuditChainEventDelegate();
apps/web/src/lib\server\audit-chain-service.ts:188:  const events = await auditChainEvent.findMany({
apps/web/src/lib\server\audit-chain-service.ts:195:    verification: verifyAuditChain(events),
apps/web/src/lib\core\ai-core.ts:51:  /** Actor ID for audit */
apps/web/src/lib\server\audit_chain_service.ts:1:export * from "./audit-chain-service";
apps/web/src/lib\clinical-ai\clinical-ai.test.ts:4:import { buildAiGenerationAuditRecord } from "@/lib/clinical-ai/audit/ai-generation-audit";
apps/web/src/lib\clinical-ai\clinical-ai.test.ts:66:test("AI audit payload generation records hash and pending review status", () => {
apps/web/src/lib\clinical-ai\clinical-ai.test.ts:68:  const audit = buildAiGenerationAuditRecord({
apps/web/src/lib\clinical-ai\clinical-ai.test.ts:88:  assert.equal(audit.status, "pending-review");
apps/web/src/lib\clinical-ai\clinical-ai.test.ts:89:  assert.equal(audit.outputHash.length > 10, true);
apps/web/src/lib\core\pdf-core.ts:16:import { computeDocumentChecksum } from "@/lib/core/audit-core";
apps/web/src/lib\pdf-engine\persistence\judicial-export.ts:11:  auditChain: LegalEvidencePackage["auditChain"];
apps/web/src/lib\pdf-engine\persistence\judicial-export.ts:51:    auditChain: input.legalEvidencePackage.auditChain,
apps/web/src/lib\pdf-engine\persistence\evidence-index.ts:2:  auditId: string | null;
apps/web/src/lib\pdf-engine\persistence\evidence-index.ts:11:  auditId?: string | null;
apps/web/src/lib\pdf-engine\persistence\evidence-index.ts:34:      if (query.auditId && record.auditId !== query.auditId) return false;
apps/web/src/lib\clinical-ai\audit\ai-generation-audit.ts:3:import type { ClinicalAiAuditRecord, ClinicalAiGenerationRequest, ClinicalAiProviderResponse } from "@/lib/clinical-ai/types/clinical-ai-types";
apps/web/src/lib\clinical-ai\audit\ai-generation-audit.ts:6:export function buildAiGenerationAuditRecord(input: {
apps/web/src/lib\clinical-ai\audit\ai-generation-audit.ts:11:}): ClinicalAiAuditRecord {
apps/web/src/lib\pdf-engine\ui-models\verification-page-model.ts:2:import type { ForensicVerificationReport } from "@/lib/pdf-engine/audit/forensic-verification";
apps/web/src/lib\pdf-engine\ui-models\verification-page-model.ts:6:  auditChainStatus: string;
apps/web/src/lib\pdf-engine\ui-models\verification-page-model.ts:24:    auditChainStatus: input.forensicVerificationReport.auditChainIntegrityValid ? "valid" : "invalid",
apps/web/src/lib\pdf-engine\persistence\evidence-archive.ts:47:    auditId: legalEvidencePackage.metadata.auditId,
apps/web/src/lib\server\auth.ts:6:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\auth.ts:65:  auditor: "VIEWER",
apps/web/src/lib\server\auth.ts:354:    await writeAuditLog({
apps/web/src/lib\server\auth.ts:372:  } catch (auditError) {
apps/web/src/lib\server\auth.ts:373:    console.error("platform access audit log write failed (non-fatal)", auditError);
apps/web/src/lib\clinical-ai\safety\immutable-legal-protection.ts:7:  "auditMetadata",
apps/web/src/lib\server\backup-dr-service.ts:7:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\backup-dr-service.ts:130:  await writeAuditLog({
apps/web/src/lib\pdf-engine\ui-models\judicial-export-model.ts:4:  auditSummary: string;
apps/web/src/lib\pdf-engine\ui-models\judicial-export-model.ts:14:    auditSummary: `Audit reference ${judicialExport.auditChain.currentChainHash} for ${judicialExport.documentType}.`,
apps/web/src/lib\pdf-engine\ui-models\forensic-inspection-model.ts:1:import type { ForensicVerificationReport } from "@/lib/pdf-engine/audit/forensic-verification";
apps/web/src/lib\pdf-engine\ui-models\forensic-inspection-model.ts:6:  auditChainValidation: string;
apps/web/src/lib\pdf-engine\ui-models\forensic-inspection-model.ts:20:  if (!input.forensicVerificationReport.auditChainIntegrityValid) riskFlags.push("audit-chain-failed");
apps/web/src/lib\pdf-engine\ui-models\forensic-inspection-model.ts:27:    auditChainValidation: input.forensicVerificationReport.auditChainIntegrityValid ? "valid" : "invalid",
apps/web/src/lib\server\case-compliance-service.ts:8:import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
apps/web/src/lib\server\case-compliance-service.ts:15:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\case-compliance-service.ts:141:  await writeAuditLog({
apps/web/src/lib\server\case-compliance-service.ts:153:  await appendAuditChainEvent({
apps/web/src/lib\server\case-compliance-service.ts:249:  await writeAuditLog({
apps/web/src/lib\server\case-compliance-service.ts:261:  await appendAuditChainEvent({
apps/web/src/lib\server\case-compliance-service.ts:460:    await writeAuditLog({
apps/web/src/lib\server\case-compliance-service.ts:475:  await writeAuditLog({
apps/web/src/lib\server\case-compliance-service.ts:491:  await appendAuditChainEvent({
apps/web/src/lib\server\case-compliance-service.ts:620:  await writeAuditLog({
apps/web/src/lib\server\case-compliance-service.ts:636:  await appendAuditChainEvent({
apps/web/src/lib\pdf-engine\ui-models\evidence-timeline-model.ts:1:import type { AuditTimelineEntry } from "@/lib/pdf-engine/audit/audit-timeline";
apps/web/src/lib\pdf-engine\ui-models\evidence-timeline-model.ts:18:  auditTimeline: AuditTimelineEntry[];
apps/web/src/lib\pdf-engine\ui-models\evidence-timeline-model.ts:25:    { completed: true, eventType: "generated", reference: input.legalEvidencePackage.metadata.auditId, timestamp: generatedAt, title: "Generated" },
apps/web/src/lib\pdf-engine\ui-models\evidence-timeline-model.ts:32:  const mappedAuditEvents = input.auditTimeline.map((entry) => ({
apps/web/src/lib\pdf-engine\ui-models\evidence-timeline-model.ts:40:  const archivedPresent = mappedAuditEvents.some((event) => event.eventType === "archive");
apps/web/src/lib\pdf-engine\ui-models\evidence-timeline-model.ts:41:  const verifiedPresent = mappedAuditEvents.some((event) => event.eventType === "forensic-verification");
apps/web/src/lib\pdf-engine\ui-models\evidence-timeline-model.ts:44:    mappedAuditEvents.push({
apps/web/src/lib\pdf-engine\ui-models\evidence-timeline-model.ts:53:    mappedAuditEvents.push({
apps/web/src/lib\pdf-engine\ui-models\evidence-timeline-model.ts:64:    events: [...baseEvents, ...mappedAuditEvents].sort(
apps/web/src/lib\pdf-engine\core\pdf-types.ts:8:  auditId: string | null;
apps/web/src/lib\pdf-engine\branding\wathiqcare-footer.tsx:8:  auditReferenceId: string | null;
apps/web/src/lib\pdf-engine\branding\wathiqcare-footer.tsx:27:      <div class="wc-pdf-footer-row"><strong>Audit Ref:</strong> ${escapeHtml(props.auditReferenceId || "Pending")}</div>
apps/web/src/lib\pdf-engine\management\enterprise-search.ts:1:import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
apps/web/src/lib\pdf-engine\core\pdf-renderer.ts:18:  auditReferenceId?: string | null;
apps/web/src/lib\pdf-engine\core\pdf-renderer.ts:158:        auditReferenceId: context.auditReferenceId || null,
apps/web/src/lib\clinical-ai\prompts\consent-risk.prompt.ts:5:  "Do not generate diagnosis, treatment decisions, emergency advice, legal clauses, PDPL wording, signature blocks, OTP content, audit metadata, evidence footer text, or verification wording.",
apps/web/src/lib\pdf-engine\management\evidence-manager.ts:1:import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
apps/web/src/lib\pdf-engine\operations\compliance-review.ts:2:import type { ForensicVerificationReport } from "@/lib/pdf-engine/audit/forensic-verification";
apps/web/src/lib\pdf-engine\operations\legal-disclosure.ts:3:import type { EvidenceTimelineModel } from "@/lib/pdf-engine/ui-models/evidence-timeline-model";
apps/web/src/lib\pdf-engine\operations\legal-disclosure.ts:6:  auditTimeline: EvidenceTimelineModel;
apps/web/src/lib\pdf-engine\operations\legal-disclosure.ts:8:    auditId: string | null;
apps/web/src/lib\pdf-engine\operations\legal-disclosure.ts:22:  timelineModel: EvidenceTimelineModel;
apps/web/src/lib\pdf-engine\operations\legal-disclosure.ts:26:    auditTimeline: input.timelineModel,
apps/web/src/lib\pdf-engine\operations\legal-disclosure.ts:28:      auditId: input.legalEvidencePackage.metadata.auditId,
apps/web/src/lib\pdf-engine\management\evidence-analytics.ts:1:import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
apps/web/src/lib\pdf-engine\operations\evidence-console.ts:2:import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
apps/web/src/lib\server\compliance-dashboard-service.ts:15:import { verifyAuditChain } from "@/lib/server/audit-chain-service";
apps/web/src/lib\server\compliance-dashboard-service.ts:27:  auditChainVerified: boolean;
apps/web/src/lib\server\compliance-dashboard-service.ts:99:  const cbahiCases = input.cases.filter((item) => item.legalReady && item.auditChainVerified && item.openValidationErrors <= 0);
apps/web/src/lib\server\compliance-dashboard-service.ts:102:  const blockedCases = input.cases.filter((item) => !item.legalReady || !item.auditChainVerified || item.openValidationErrors > 0);
apps/web/src/lib\server\compliance-dashboard-service.ts:333:        auditLogs: { take: 100, orderBy: { createdAt: "desc" } },
apps/web/src/lib\server\compliance-dashboard-service.ts:335:        auditChainEvents: { take: 200, orderBy: { createdAt: "asc" } },
apps/web/src/lib\server\compliance-dashboard-service.ts:361:    const auditVerification = verifyAuditChain(caseRecord.auditChainEvents);
apps/web/src/lib\server\compliance-dashboard-service.ts:391:      auditTrailCaptured: caseRecord.auditLogs.length > 0 || caseRecord.auditChainEvents.length > 0,
apps/web/src/lib\server\compliance-dashboard-service.ts:400:      auditChainVerified: auditVerification.verified,
apps/web/src/lib\server\compliance-dashboard-service.ts:412:      auditChainVerified: auditVerification.verified,
apps/web/src/lib\pdf-engine\audit\forensic-verification.ts:12:  auditChainIntegrityValid: boolean;
apps/web/src/lib\pdf-engine\audit\forensic-verification.ts:39:          auditId: input.legalEvidencePackage.metadata.auditId,
apps/web/src/lib\pdf-engine\audit\forensic-verification.ts:52:        input.legalEvidencePackage.auditChain.currentChainHash,
apps/web/src/lib\pdf-engine\audit\forensic-verification.ts:62:    auditChainIntegrityValid: packageValidation.auditChainIntegrityValid,
apps/web/src/lib\pdf-engine\audit\forensic-verification.ts:70:      packageValidation.auditChainIntegrityValid &&
apps/web/src/lib\pdf-engine\templates\promissory-note.template.tsx:51:    auditReferenceId: payload.evidenceMetadata.auditId,
apps/web/src/lib\pdf-engine\templates\discharge-refusal.template.tsx:51:    auditReferenceId: payload.evidenceMetadata.auditId,
apps/web/src/lib\pdf-engine\operations\evidence-search.ts:5:  auditId?: string | null;
apps/web/src/lib\pdf-engine\operations\evidence-search.ts:15:  auditId: string | null;
apps/web/src/lib\pdf-engine\operations\evidence-search.ts:26:    auditId: record.legalEvidencePackage.metadata.auditId,
apps/web/src/lib\pdf-engine\operations\evidence-search.ts:48:      if (query.auditId && record.auditId !== query.auditId) return false;
apps/web/src/lib\pdf-engine\audit\audit-view.ts:1:import type { AuditTimelineEntry } from "@/lib/pdf-engine/audit/audit-timeline";
apps/web/src/lib\pdf-engine\audit\audit-view.ts:3:export interface AuditViewItem {
apps/web/src/lib\pdf-engine\audit\audit-view.ts:9:export function buildAuditViewModel(timeline: AuditTimelineEntry[]): AuditViewItem[] {
apps/web/src/lib\pdf-engine\audit\audit-view.ts:10:  return timeline.map((entry) => ({
apps/web/src/lib\server\compliance-dashboard-service.test.ts:16:        auditChainVerified: true,
apps/web/src/lib\server\compliance-dashboard-service.test.ts:27:        auditChainVerified: false,
apps/web/src/lib\server\compliance-dashboard-service.test.ts:61:        auditChainVerified: false,
apps/web/src/lib\pdf-engine\templates\informed-consent.template.tsx:24:  auditId: string;
apps/web/src/lib\pdf-engine\templates\informed-consent.template.tsx:53:    auditId: "Audit ID",
apps/web/src/lib\pdf-engine\templates\informed-consent.template.tsx:80:    auditId: "┘à╪╣╪▒┘ü ╪º┘ä╪¬╪»┘é┘è┘é",
apps/web/src/lib\pdf-engine\templates\informed-consent.template.tsx:147:      { label: copy.auditId, value: formatEvidenceValue(payload.evidence.auditId) },
apps/web/src/lib\pdf-engine\templates\informed-consent.template.tsx:170:    auditReferenceId: payload.evidence.auditId,
apps/web/src/lib\pdf-engine\audit\audit-timeline.ts:4:export interface AuditTimelineEntry {
apps/web/src/lib\pdf-engine\audit\audit-timeline.ts:12:export function buildAuditTimeline(input: {
apps/web/src/lib\pdf-engine\audit\audit-timeline.ts:16:}): AuditTimelineEntry[] {
apps/web/src/lib\pdf-engine\audit\audit-timeline.ts:17:  const timeline: AuditTimelineEntry[] = [
apps/web/src/lib\pdf-engine\audit\audit-timeline.ts:21:      reference: input.legalEvidencePackage.auditChain.currentChainHash,
apps/web/src/lib\pdf-engine\audit\audit-timeline.ts:35:    timeline.push({
apps/web/src/lib\pdf-engine\audit\audit-timeline.ts:45:    timeline.push({
apps/web/src/lib\pdf-engine\audit\audit-timeline.ts:54:  return timeline.sort((left, right) => left.timestamp.localeCompare(right.timestamp) || left.title.localeCompare(right.title));
apps/web/src/lib\pdf-engine\audit\audit-timeline.ts:57:export function serializeAuditTimeline(timeline: AuditTimelineEntry[]): string {
apps/web/src/lib\pdf-engine\audit\audit-timeline.ts:58:  return JSON.stringify(timeline);
apps/web/src/lib\pdf-engine\evidence\audit-metadata.ts:3:export interface EvidenceAuditMetadata {
apps/web/src/lib\pdf-engine\evidence\audit-metadata.ts:5:  auditId: string | null;
apps/web/src/lib\pdf-engine\evidence\audit-metadata.ts:16:export interface BuildEvidenceAuditMetadataInput {
apps/web/src/lib\pdf-engine\evidence\audit-metadata.ts:18:  auditId?: string | null;
apps/web/src/lib\pdf-engine\evidence\audit-metadata.ts:29:export function buildEvidenceAuditMetadata(
apps/web/src/lib\pdf-engine\evidence\audit-metadata.ts:30:  input: BuildEvidenceAuditMetadataInput,
apps/web/src/lib\pdf-engine\evidence\audit-metadata.ts:31:): EvidenceAuditMetadata {
apps/web/src/lib\pdf-engine\evidence\audit-metadata.ts:34:    auditId: input.auditId ?? null,
apps/web/src/lib\server\consent-service.ts:8:import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
apps/web/src/lib\server\consent-service.ts:10:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\consent-service.ts:255:  await writeAuditLog({
apps/web/src/lib\server\consent-service.ts:270:  await appendAuditChainEvent({
apps/web/src/lib\server\consent-library-service.ts:20:import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
apps/web/src/lib\server\consent-library-service.ts:21:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\consent-library-service.ts:78:  auditRequired: boolean;
apps/web/src/lib\server\consent-library-service.ts:141:  "auditChecksum",
apps/web/src/lib\server\consent-library-service.ts:150:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:157:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:164:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:171:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:178:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:185:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:192:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:199:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:206:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:213:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:220:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:227:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:234:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:241:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:248:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:354:      auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:364:      auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:373:    auditRequired: true,
apps/web/src/lib\server\consent-library-service.ts:495:async function writeConsentAudit(args: {
apps/web/src/lib\server\consent-library-service.ts:508:  await prisma().consentAuditEvent.create({
apps/web/src/lib\server\consent-library-service.ts:523:  await writeAuditLog({
apps/web/src/lib\server\consent-library-service.ts:541:  await appendAuditChainEvent({
apps/web/src/lib\server\consent-library-service.ts:835:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:1007:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:1128:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:1197:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:1272:      auditEvents: { orderBy: [{ createdAt: "desc" }], take: 100 },
apps/web/src/lib\server\consent-library-service.ts:1483:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:1598:    await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:1687:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:1814:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:1910:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:2036:    await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:2106:      auditChecksum: immutablePdfHash,
apps/web/src/lib\server\consent-library-service.ts:2156:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:2216:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:2310:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:2465:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:2519:    await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:2538:    await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:2613:    await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:2724:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:2794:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:2804:      timelineAction: action,
apps/web/src/lib\server\consent-library-service.ts:2891:  await writeConsentAudit({
apps/web/src/lib\server\consent-library-service.ts:3082:  await writeConsentAudit({
apps/web/src/lib\pdf-engine\evidence\verification-token.ts:22:  auditId?: string | null;
apps/web/src/lib\pdf-engine\evidence\verification-token.ts:34:  const input = [payload.evidenceId, payload.documentHash, payload.auditId || ""].join("|");
apps/web/src/lib\server\dischargeRefusalWorkflow.ts:16:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\dischargeRefusalWorkflow.ts:74:type WorkflowAuditSummary = {
apps/web/src/lib\server\dischargeRefusalWorkflow.ts:718:export async function listWorkflowAudit(auth: AuthContext, caseId: string): Promise<WorkflowAuditSummary[]> {
apps/web/src/lib\server\dischargeRefusalWorkflow.ts:723:    const logs = await getPrisma().auditLog.findMany({
apps/web/src/lib\server\dischargeRefusalWorkflow.ts:920:    await writeAuditLog({
apps/web/src/lib\server\dischargeRefusalWorkflow.ts:954:        await writeAuditLog({
apps/web/src/lib\server\dischargeMedicoLegal.ts:56:	await writeAuditLog({
apps/web/src/lib\server\dischargeMedicoLegal.ts:105:	await writeAuditLog({
apps/web/src/lib\server\dischargeMedicoLegal.ts:148:	await writeAuditLog({
apps/web/src/lib\server\dischargeMedicoLegal.ts:164:function mapLegalEscalationCase(caseRecord: CaseWithAuditLogs): LegalEscalationCase | null {
apps/web/src/lib\server\dischargeMedicoLegal.ts:177:	const notes = (caseRecord.auditLogs || [])
apps/web/src/lib\server\dischargeMedicoLegal.ts:178:		.filter((item: AuditLog) => item.action === "legal_escalation_note_added")
apps/web/src/lib\server\dischargeMedicoLegal.ts:179:		.map((item: AuditLog) => {
apps/web/src/lib\server\dischargeMedicoLegal.ts:190:	const auditTrail = (caseRecord.auditLogs || [])
apps/web/src/lib\server\dischargeMedicoLegal.ts:191:		.filter((item: AuditLog) => LEGAL_AUDIT_ACTIONS.has(item.action))
apps/web/src/lib\server\dischargeMedicoLegal.ts:192:		.map((item: AuditLog) => ({
apps/web/src/lib\server\dischargeMedicoLegal.ts:214:		auditTrail,
apps/web/src/lib\server\dischargeMedicoLegal.ts:218:async function getAuthorizedRefusalCase(auth: AuthContext, caseId: string): Promise<CaseWithAuditLogs> {
apps/web/src/lib\server\dischargeMedicoLegal.ts:223:			auditLogs: {
apps/web/src/lib\server\dischargeMedicoLegal.ts:330:			auditLogs: {
apps/web/src/lib\server\dischargeMedicoLegal.ts:341:function mapRefusalCase(caseRecord: CaseWithAuditLogs): RefusalCaseListItem {
apps/web/src/lib\server\dischargeMedicoLegal.ts:375:import type { AuditLog } from "@prisma/client";
apps/web/src/lib\server\dischargeMedicoLegal.ts:381:type CaseWithAuditLogs = Prisma.CaseGetPayload<{ include: { auditLogs: true } }>;
apps/web/src/lib\server\dischargeMedicoLegal.ts:384:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\dischargeMedicoLegal.ts:434:	auditTrail?: Array<{
apps/web/src/lib\server\dsr-service.ts:7:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\dsr-service.ts:140:  await writeAuditLog({
apps/web/src/lib\server\dsr-service.ts:210:  await writeAuditLog({
apps/web/src/lib\pdf-engine\security\integrity-monitor.ts:1:import { performForensicVerification, type ForensicVerificationReport } from "@/lib/pdf-engine/audit/forensic-verification";
apps/web/src/lib\pdf-engine\security\integrity-monitor.ts:38:    if (!report.auditChainIntegrityValid) anomalies.push("audit-chain-failed");
apps/web/src/lib\pdf-engine\security\access-audit.ts:6:export interface AccessAuditEvent {
apps/web/src/lib\pdf-engine\security\access-audit.ts:19:const accessAuditTrail: AccessAuditEvent[] = [];
apps/web/src/lib\pdf-engine\security\access-audit.ts:21:export function buildAccessAuditEvent(input: Omit<AccessAuditEvent, "createdAt" | "eventId">): AccessAuditEvent {
apps/web/src/lib\pdf-engine\security\access-audit.ts:35:export function logEvidenceAccess(input: Omit<AccessAuditEvent, "createdAt" | "eventId">): AccessAuditEvent {
apps/web/src/lib\pdf-engine\security\access-audit.ts:36:  const event = buildAccessAuditEvent(input);
apps/web/src/lib\pdf-engine\security\access-audit.ts:37:  accessAuditTrail.push(event);
apps/web/src/lib\pdf-engine\security\access-audit.ts:41:export function retrieveAccessAuditTrail(query: {
apps/web/src/lib\pdf-engine\security\access-audit.ts:45:} = {}): AccessAuditEvent[] {
apps/web/src/lib\pdf-engine\security\access-audit.ts:46:  return accessAuditTrail
apps/web/src/lib\pdf-engine\security\forensic-alerts.ts:1:import type { ForensicVerificationReport } from "@/lib/pdf-engine/audit/forensic-verification";
apps/web/src/lib\pdf-engine\security\forensic-alerts.ts:3:import type { AccessAuditEvent } from "@/lib/pdf-engine/security/access-audit";
apps/web/src/lib\pdf-engine\security\forensic-alerts.ts:31:  accessAuditTrail?: AccessAuditEvent[];
apps/web/src/lib\pdf-engine\security\forensic-alerts.ts:38:  const deniedEvents = (input.accessAuditTrail || []).filter((event) => event.outcome === "denied");
apps/web/src/lib\pdf-engine\security\forensic-alerts.ts:60:  if (input.forensicVerificationReport && !input.forensicVerificationReport.auditChainIntegrityValid) {
apps/web/src/lib\pdf-engine\security\forensic-alerts.ts:64:        message: "Forensic audit chain mismatch detected.",
apps/web/src/lib\server\education-library-service.ts:63:export type RecordEducationAuditEventInput = {
apps/web/src/lib\server\education-library-service.ts:194:export async function recordEducationAuditEvent(input: RecordEducationAuditEventInput) {
apps/web/src/lib\server\education-library-service.ts:200:  return prisma().educationAuditEvent.create({
apps/web/src/lib\server\education-library-service.ts:308:    await tx.educationAuditEvent.create({
apps/web/src/lib\server\education-library-service.ts:409:    await tx.educationAuditEvent.create({
apps/web/src/lib\server\education-library-service.ts:523:    await tx.educationAuditEvent.create({
apps/web/src/lib\server\education-library-service.ts:609:    await tx.educationAuditEvent.create({
apps/web/src/lib\server\education-library-service.ts:759:    await tx.educationAuditEvent.create({
apps/web/src/lib\server\education-session-service.ts:19:type EducationAuditEvent = {
apps/web/src/lib\server\education-session-service.ts:46:  events?: EducationAuditEvent[];
apps/web/src/lib\server\evidence-package-2-service.ts:208:      auditEvents: { orderBy: { createdAt: "asc" } },
apps/web/src/lib\server\evidence-package-2-service.ts:209:      timelineEvents: { orderBy: { createdAt: "asc" } },
apps/web/src/lib\server\evidence-package-2-service.ts:217:  const educationEvents = doc.auditEvents.filter((event) => {
apps/web/src/lib\server\evidence-package-2-service.ts:288:  const timelineRecords = [
apps/web/src/lib\server\evidence-package-2-service.ts:321:  const timelineSummary = timelineRecords
apps/web/src/lib\server\evidence-package-2-service.ts:351:      timelineSummary,
apps/web/src/lib\server\evidence-package-2-service.ts:362:  for (const item of timelineRecords) {
apps/web/src/lib\server\evidence-package-2-service.ts:460:      timelineJson: {
apps/web/src/lib\server\evidence-package-2-service.ts:461:        steps: timelineRecords.map((item) => ({
apps/web/src/lib\server\evidence-package-2-service.ts:467:      summaryText: timelineSummary,
apps/web/src/lib\server\evidence-package-2-service.ts:478:    timelineSummary,
apps/web/src/lib\server\evidence-package-2-service.ts:516:      timeline: true,
apps/web/src/lib\server\export-approval-service.test.ts:59:      reason: "Quarterly audit",
apps/web/src/lib\pdf-engine\runtime\forensic-audit-chain.ts:4:export interface BuildForensicAuditEventInput {
apps/web/src/lib\pdf-engine\runtime\forensic-audit-chain.ts:15:export interface ForensicAuditEvent {
apps/web/src/lib\pdf-engine\runtime\forensic-audit-chain.ts:27:export function generateAuditChainHash(
apps/web/src/lib\pdf-engine\runtime\forensic-audit-chain.ts:28:  input: Omit<ForensicAuditEvent, "currentChainHash">,
apps/web/src/lib\pdf-engine\runtime\forensic-audit-chain.ts:35:export function buildForensicAuditEvent(
apps/web/src/lib\pdf-engine\runtime\forensic-audit-chain.ts:36:  input: BuildForensicAuditEventInput,
apps/web/src/lib\pdf-engine\runtime\forensic-audit-chain.ts:37:): ForensicAuditEvent {
apps/web/src/lib\pdf-engine\runtime\forensic-audit-chain.ts:39:  const auditEventBase = {
apps/web/src/lib\pdf-engine\runtime\forensic-audit-chain.ts:51:    ...auditEventBase,
apps/web/src/lib\pdf-engine\runtime\forensic-audit-chain.ts:52:    currentChainHash: generateAuditChainHash(auditEventBase),
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:1:import type { EvidenceAuditMetadata } from "@/lib/pdf-engine/evidence/audit-metadata";
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:9:  buildForensicAuditEvent,
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:10:  type ForensicAuditEvent,
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:11:} from "@/lib/pdf-engine/runtime/forensic-audit-chain";
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:24:  auditMetadata: EvidenceAuditMetadata;
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:41:  auditChain: ForensicAuditEvent;
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:42:  auditChainReference: string;
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:48:  metadata: EvidenceAuditMetadata;
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:81:  const auditChain = buildForensicAuditEvent({
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:83:    actor: input.auditMetadata.generatedBy,
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:85:    ipAddress: input.ipAddress ?? input.auditMetadata.ipAddress,
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:104:    auditChain,
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:105:    auditChainReference: auditChain.currentChainHash,
apps/web/src/lib\pdf-engine\runtime\legal-evidence-package.ts:111:    metadata: input.auditMetadata,
apps/web/src/lib\server\incident-response-service.ts:6:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\incident-response-service.ts:135:  await writeAuditLog({
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.test.ts:50:      auditChecksum: null,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.test.ts:86:      auditChecksum: null,
apps/web/src/lib\server\informed-consent-clinical-ai-service.ts:4:import { buildAiGenerationAuditRecord } from "@/lib/clinical-ai/audit/ai-generation-audit";
apps/web/src/lib\server\informed-consent-clinical-ai-service.ts:78:  const auditRecord = buildAiGenerationAuditRecord({
apps/web/src/lib\server\informed-consent-clinical-ai-service.ts:86:    auditRecord,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:2:import { buildEvidenceAuditMetadata } from "@/lib/pdf-engine/evidence/audit-metadata";
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:9:import { buildForensicAuditEvent } from "@/lib/pdf-engine/runtime/forensic-audit-chain";
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:47:  auditChecksum: string | null;
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:59:  auditMetadata: ReturnType<typeof buildEvidenceAuditMetadata>;
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:102:  auditMetadata: ReturnType<typeof buildEvidenceAuditMetadata>,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:112:    auditMetadata,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:127:      auditChecksum: input.document.auditChecksum,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:138:    auditChain: buildForensicAuditEvent({
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:140:      actor: auditMetadata.generatedBy,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:142:      ipAddress: auditMetadata.ipAddress,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:145:      previousChainHash: legalEvidencePackage.auditChain.currentChainHash,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:167:    auditId: null,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:194:      hash: input.document.auditChecksum || input.document.immutablePdfHash || hash,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:213:    auditId: basePayload.evidence.auditId,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:215:  const auditMetadata = buildEvidenceAuditMetadata({
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:217:    auditId: basePayload.evidence.auditId,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:231:    auditMetadata,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:239:        forensicChainReference: legalEvidencePackage.auditChain.currentChainHash,
apps/web/src/lib\server\informed-consent-pdf-preview-adapter.ts:255:    auditMetadata,
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:4:import { buildAuditTimeline, serializeAuditTimeline } from "@/lib/pdf-engine/audit/audit-timeline";
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:5:import { buildAuditViewModel } from "@/lib/pdf-engine/audit/audit-view";
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:6:import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:22:import { logEvidenceAccess, retrieveAccessAuditTrail } from "@/lib/pdf-engine/security/access-audit";
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:25:import { buildEvidenceTimelineModel } from "@/lib/pdf-engine/ui-models/evidence-timeline-model";
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:44:  auditChainHash: string;
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:45:  auditTimeline: string;
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:46:  auditView: ReturnType<typeof buildAuditViewModel>;
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:116:  const auditTimelineModel = buildAuditTimeline({
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:143:    auditTimeline: auditTimelineModel,
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:180:    timelineModel: evidenceTimelineModel,
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:184:    accessAuditTrail: retrieveAccessAuditTrail({ evidenceId: preview.legalEvidencePackage.evidenceId }),
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:214:    auditChainHash: preview.legalEvidencePackage.auditChain.currentChainHash,
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:215:    auditTimeline: serializeAuditTimeline(auditTimelineModel),
apps/web/src/lib\server\informed-consent-pdf-runtime-probe.ts:216:    auditView: buildAuditViewModel(auditTimelineModel),
apps/web/src/lib\server\informed-consents-evidence-vault-service.ts:6:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\informed-consents-evidence-vault-service.ts:146:      auditEvents: { orderBy: { createdAt: "asc" } },
apps/web/src/lib\server\informed-consents-evidence-vault-service.ts:147:      timelineEvents: { orderBy: { createdAt: "asc" } },
apps/web/src/lib\server\informed-consents-evidence-vault-service.ts:191:  const auditTimeline = doc.timelineEvents.map((item) => ({
apps/web/src/lib\server\informed-consents-evidence-vault-service.ts:226:    auditTimeline,
apps/web/src/lib\server\informed-consents-evidence-vault-service.ts:230:    timelineSummary: evidenceV2.timelineSummary,
apps/web/src/lib\server\informed-consents-evidence-vault-service.ts:256:          timelineSummary: evidenceV2.timelineSummary,
apps/web/src/lib\server\informed-consents-evidence-vault-service.ts:264:            "audit-timeline.json",
apps/web/src/lib\server\informed-consents-evidence-vault-service.ts:294:  await writeAuditLog({
apps/web/src/lib\server\informed-consents-evidence-vault-service.ts:326:      "audit-timeline.json",
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:565:      auditEvents: { orderBy: { createdAt: "asc" } },
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:566:      timelineEvents: { orderBy: { createdAt: "asc" } },
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:748:    document.auditChecksum || document.immutablePdfHash || computeFixedClauseChecksum(document),
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:1043:  const auditReference = evidenceVault.verificationToken || effectiveHash || document.id;
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:1046:  const latestIp = patientSignatureRaw?.ipAddress || guardianSignatureRaw?.ipAddress || document.timelineEvents.at(-1)?.ipAddress || null;
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:1048:    patientSignatureRaw?.userAgent || guardianSignatureRaw?.userAgent || document.timelineEvents.at(-1)?.userAgent || null;
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:1121:    { labelAr: "├ÖΓÇª├ÿ┬▒├ÿ┬¼├ÿ┬╣ ├ÿ┬│├ÿ┬¼├ÖΓÇ₧ ├ÿ┬º├ÖΓÇ₧├ÿ┬¬├ÿ┬»├ÖΓÇÜ├Ö┼á├ÖΓÇÜ", labelEn: "Audit Trail Reference", valueAr: auditReference, valueEn: auditReference },
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:1218:      auditTrailReference: auditReference,
apps/web/src/lib\server\informed-consents-final-pdf-payload.ts:2106:        "X-Wathiq-Audit-Checksum": payload.immutablePdfHash || "",
apps/web/src/lib\server\informed-consents-saudi-template-library.ts:758:      sectionKey: "25_legal_seal_audit",
apps/web/src/lib\server\informed-consents-saudi-template-library.ts:761:      titleEn: "Legal Seal and Audit Trail",
apps/web/src/lib\server\informed-consents-saudi-template-library.ts:763:      contentEn: "The document is sealed with a legal hash and linked to an immutable audit trail.",
apps/web/src/lib\server\informed-consents-wording-governance-service.ts:7:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\informed-consents-wording-governance-service.ts:133:async function appendAudit(args: {
apps/web/src/lib\server\informed-consents-wording-governance-service.ts:142:  await writeAuditLog({
apps/web/src/lib\server\informed-consents-wording-governance-service.ts:241:  await appendAudit({
apps/web/src/lib\server\informed-consents-wording-governance-service.ts:337:  await appendAudit({
apps/web/src/lib\server\informed-consents-wording-governance-service.ts:418:  await appendAudit({
apps/web/src/lib\server\informed-consents-wording-governance-service.ts:470:  await appendAudit({
apps/web/src/lib\server\legal-case-pdf-service.ts:16:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\legal-case-pdf-service.ts:20:import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
apps/web/src/lib\server\legal-case-pdf-service.ts:400:      auditLogs: {
apps/web/src/lib\server\legal-case-pdf-service.ts:477:  const hasAuditSummary = caseRecord.auditLogs.length > 0;
apps/web/src/lib\server\legal-case-pdf-service.ts:573:      key: "audit_summary",
apps/web/src/lib\server\legal-case-pdf-service.ts:574:      label: "Audit summary",
apps/web/src/lib\server\legal-case-pdf-service.ts:576:      satisfied: hasAuditSummary,
apps/web/src/lib\server\legal-case-pdf-service.ts:577:      reason: hasAuditSummary ? "Available" : "No audit events available",
apps/web/src/lib\server\legal-case-pdf-service.ts:628:function buildAuditRows(caseRecord: Awaited<ReturnType<typeof getAuthorizedCase>>) {
apps/web/src/lib\server\legal-case-pdf-service.ts:629:  return caseRecord.auditLogs.slice(0, 20).map((log) => ({
apps/web/src/lib\server\legal-case-pdf-service.ts:743:    auditTrail: buildAuditRows(caseRecord),
apps/web/src/lib\server\legal-case-pdf-service.ts:774:function renderAuditRows(rows: Array<{ event: string; user: string; role: string; timestamp: string }>): string {
apps/web/src/lib\server\legal-case-pdf-service.ts:937:      <h2>9. Audit Trail Summary</h2>
apps/web/src/lib\server\legal-case-pdf-service.ts:940:        <tbody>${renderAuditRows(payload.auditTrail)}</tbody>
apps/web/src/lib\server\legal-case-pdf-service.ts:1252:  await writeAuditLog({
apps/web/src/lib\server\legal-case-pdf-service.ts:1319:  await writeAuditLog({
apps/web/src/lib\server\legal-case-pdf-service.ts:1459:    await writeAuditLog({
apps/web/src/lib\server\legal-case-pdf-service.ts:1477:    await writeAuditLog({
apps/web/src/lib\server\legal-case-pdf-service.ts:1492:    const auditChainEvent = await appendAuditChainEvent({
apps/web/src/lib\server\legal-case-pdf-service.ts:1508:    if (auditChainEvent && typeof auditChainEvent === "object" && "currentHash" in auditChainEvent) {
apps/web/src/lib\server\legal-case-pdf-service.ts:1509:      const currentHash = (auditChainEvent as { currentHash?: unknown }).currentHash;
apps/web/src/lib\server\legal-case-pdf-service.ts:1516:              immutable_audit_reference: currentHash,
apps/web/src/lib\server\legal-case-pdf-service.ts:1742:  await writeAuditLog({
apps/web/src/lib\server\legal-case-pdf-service.ts:1792:  await writeAuditLog({
apps/web/src/lib\server\legal-package-module-service.ts:12:import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
apps/web/src/lib\server\legal-package-module-service.ts:13:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\legal-package-module-service.ts:75:type LegalPackageAuditEventRecord = {
apps/web/src/lib\server\legal-package-module-service.ts:88:  audit_trail_reference: string | null;
apps/web/src/lib\server\legal-package-module-service.ts:93:  audit_events: LegalPackageAuditEventRecord[];
apps/web/src/lib\server\legal-package-module-service.ts:102:  audit_trail_reference: string | null;
apps/web/src/lib\server\legal-package-module-service.ts:166:  const auditEventsRaw = Array.isArray(raw?.audit_events) ? raw?.audit_events : [];
apps/web/src/lib\server\legal-package-module-service.ts:174:    audit_trail_reference: getString(raw, "audit_trail_reference") || null,
apps/web/src/lib\server\legal-package-module-service.ts:204:    audit_events: auditEventsRaw
apps/web/src/lib\server\legal-package-module-service.ts:236:      auditLogs: true,
apps/web/src/lib\server\legal-package-module-service.ts:237:      auditChainEvents: true,
apps/web/src/lib\server\legal-package-module-service.ts:304:  const auditExists = (caseRecord.auditLogs?.length || 0) > 0 || (caseRecord.auditChainEvents?.length || 0) > 0;
apps/web/src/lib\server\legal-package-module-service.ts:350:      key: "audit_trail_exists",
apps/web/src/lib\server\legal-package-module-service.ts:351:      label: "Audit trail exists",
apps/web/src/lib\server\legal-package-module-service.ts:352:      passed: auditExists,
apps/web/src/lib\server\legal-package-module-service.ts:353:      reason: "Audit trail is missing",
apps/web/src/lib\server\legal-package-module-service.ts:450:    audit_trail_reference: state.audit_trail_reference,
apps/web/src/lib\server\legal-package-module-service.ts:485:async function appendPackageAudit(args: {
apps/web/src/lib\server\legal-package-module-service.ts:493:  await writeAuditLog({
apps/web/src/lib\server\legal-package-module-service.ts:505:  await appendAuditChainEvent({
apps/web/src/lib\server\legal-package-module-service.ts:539:      audit_events: [
apps/web/src/lib\server\legal-package-module-service.ts:546:        ...state.audit_events,
apps/web/src/lib\server\legal-package-module-service.ts:551:    await appendPackageAudit({
apps/web/src/lib\server\legal-package-module-service.ts:597:    audit_trail_reference: `case:${caseId}:legal_package:${Date.now()}`,
apps/web/src/lib\server\legal-package-module-service.ts:608:    audit_events: [
apps/web/src/lib\server\legal-package-module-service.ts:615:      ...state.audit_events,
apps/web/src/lib\server\legal-package-module-service.ts:620:  await appendPackageAudit({
apps/web/src/lib\server\legal-package-module-service.ts:671:      audit_events: [
apps/web/src/lib\server\legal-package-module-service.ts:678:        ...state.audit_events,
apps/web/src/lib\server\legal-package-module-service.ts:683:    await appendPackageAudit({
apps/web/src/lib\server\legal-package-module-service.ts:751:    audit_events: [
apps/web/src/lib\server\legal-package-module-service.ts:758:      ...state.audit_events,
apps/web/src/lib\server\legal-package-module-service.ts:763:  await appendPackageAudit({
apps/web/src/lib\server\legal-package-module-service.ts:867:    audit_events: [
apps/web/src/lib\server\legal-package-module-service.ts:874:      ...state.audit_events,
apps/web/src/lib\server\legal-package-module-service.ts:879:  await appendPackageAudit({
apps/web/src/lib\server\legal-package-module-service.ts:946:    audit_events: [
apps/web/src/lib\server\legal-package-module-service.ts:953:      ...state.audit_events,
apps/web/src/lib\server\legal-package-module-service.ts:958:  await appendPackageAudit({
apps/web/src/lib\server\legal-package-module-service.ts:1062:    include: { documents: true, auditLogs: true, auditChainEvents: true },
apps/web/src/lib\server\legal-readiness-service.test.ts:24:    auditTrailCaptured: true,
apps/web/src/lib\server\legal-readiness-service.test.ts:30:    auditChainVerified: true,
apps/web/src/lib\server\legal-readiness-service.test.ts:58:    auditTrailCaptured: true,
apps/web/src/lib\server\legal-readiness-service.test.ts:64:    auditChainVerified: false,
apps/web/src/lib\server\legal-risk-dashboard-service.ts:201:    auditLogs: Array<{ action: string; createdAt: Date; metadataJson: unknown }>;
apps/web/src/lib\server\legal-risk-dashboard-service.ts:255:    input.caseRecord.auditLogs.some((log) => normalize(log.action).includes("communication"));
apps/web/src/lib\server\legal-risk-dashboard-service.ts:260:    input.caseRecord.auditLogs.some((log) => normalize(log.action).includes("social"));
apps/web/src/lib\server\legal-risk-dashboard-service.ts:486:      auditLogs: {
apps/web/src/lib\server\legal-readiness-service.ts:6:import { verifyAuditChain } from "@/lib/server/audit-chain-service";
apps/web/src/lib\server\legal-readiness-service.ts:33:    auditChainVerified: boolean;
apps/web/src/lib\server\legal-readiness-service.ts:53:  auditTrailCaptured: boolean;
apps/web/src/lib\server\legal-readiness-service.ts:59:  auditChainVerified: boolean;
apps/web/src/lib\server\legal-readiness-service.ts:144:      key: "audit_trail_complete",
apps/web/src/lib\server\legal-readiness-service.ts:147:      satisfied: input.auditTrailCaptured && input.auditChainVerified,
apps/web/src/lib\server\legal-readiness-service.ts:149:        input.auditTrailCaptured && input.auditChainVerified
apps/web/src/lib\server\legal-readiness-service.ts:151:          : "Audit trail is incomplete or hash chain verification failed.",
apps/web/src/lib\server\legal-readiness-service.ts:211:      auditChainVerified: input.auditChainVerified,
apps/web/src/lib\server\legal-readiness-service.ts:225:      auditLogs: {
apps/web/src/lib\server\legal-readiness-service.ts:232:      auditChainEvents: {
apps/web/src/lib\server\legal-readiness-service.ts:262:  const auditVerification = verifyAuditChain(caseRecord.auditChainEvents);
apps/web/src/lib\server\legal-readiness-service.ts:290:    auditTrailCaptured: caseRecord.auditLogs.length > 0 || caseRecord.auditChainEvents.length > 0,
apps/web/src/lib\server\legal-readiness-service.ts:299:    auditChainVerified: auditVerification.verified,
apps/web/src/lib\server\magic-link-route-flow.ts:62:    auditLog(args: {
apps/web/src/lib\server\magic-link-route-flow.ts:77:    auditLog(args: {
apps/web/src/lib\server\magic-link-route-flow.ts:208:                await deps.auditLog({
apps/web/src/lib\server\magic-link-route-flow.ts:222:            } catch (auditError) {
apps/web/src/lib\server\magic-link-route-flow.ts:223:                console.error("magic-link request: audit write failed", auditError);
apps/web/src/lib\server\magic-link-route-flow.ts:270:            await deps.auditLog({
apps/web/src/lib\server\magic-link-route-flow.ts:280:            await deps.auditLog({
apps/web/src/lib\server\magic-link-route-flow.ts:289:        } catch (auditError) {
apps/web/src/lib\server\magic-link-route-flow.ts:290:            console.error("magic-link verify: audit write failed", auditError);
apps/web/src/lib\server\module-secure-signing-service.test.ts:87:test("audit-visible OTP progression updates opened/requested/verified", () => {
apps/web/src/lib\server\module-secure-signing-service.ts:5:import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
apps/web/src/lib\server\module-secure-signing-service.ts:9:import { recordSmsAuditAttempt } from "@/services/sms/smsAuditService";
apps/web/src/lib\server\module-secure-signing-service.ts:311:  await recordSmsAuditAttempt({
apps/web/src/lib\server\module-secure-signing-service.ts:348:    await appendAuditChainEvent({
apps/web/src/lib\server\module-secure-signing-service.ts:362:        emailDeliveryAuditId: secureSigningEmail.auditId,
apps/web/src/lib\server\module-secure-signing-service.ts:367:    console.error("[module-secure-signing] appendAuditChainEvent failed", error);
apps/web/src/lib\server\module-jobs-service.ts:4:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\module-jobs-service.ts:14:  | "audit_export"
apps/web/src/lib\server\module-jobs-service.ts:61:  await writeAuditLog({
apps/web/src/lib\server\operations.ts:12:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\operations.ts:309:  await writeAuditLog({
apps/web/src/lib\server\operations.ts:443:  await writeAuditLog({
apps/web/src/lib\server\patient-education-evidence.ts:6:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\patient-education-evidence.ts:11: * Persists patient-education telemetry as part of the existing audit/evidence
apps/web/src/lib\server\patient-education-evidence.ts:13: *   - `ConsentAuditEvent`  (consent-scoped JSON metadata, no consentDocumentId
apps/web/src/lib\server\patient-education-evidence.ts:15: *   - `AuditLog` + audit-chain (cross-entity tamper-evident trail, via
apps/web/src/lib\server\patient-education-evidence.ts:16: *                               `writeAuditLog`)
apps/web/src/lib\server\patient-education-evidence.ts:57:  /** Optional case id propagated to the audit chain. */
apps/web/src/lib\server\patient-education-evidence.ts:99:  const auditEvent = await prismaClient.consentAuditEvent.create({
apps/web/src/lib\server\patient-education-evidence.ts:113:  // Cross-entity tamper-evident audit trail (existing infrastructure).
apps/web/src/lib\server\patient-education-evidence.ts:114:  await writeAuditLog({
apps/web/src/lib\server\patient-education-evidence.ts:133:    eventId: auditEvent.id,
apps/web/src/lib\server\patient-education-evidence.ts:135:    timestamp: auditEvent.createdAt.toISOString(),
apps/web/src/lib\server\pdf-engine-phase-one.test.ts:4:import { buildEvidenceAuditMetadata } from "@/lib/pdf-engine/evidence/audit-metadata";
apps/web/src/lib\server\pdf-engine-phase-one.test.ts:26:test("buildEvidenceAuditMetadata returns reusable evidence metadata", () => {
apps/web/src/lib\server\pdf-engine-phase-one.test.ts:27:  const metadata = buildEvidenceAuditMetadata({
apps/web/src/lib\server\pdf-engine-phase-one.test.ts:52:      auditId: "audit-1",
apps/web/src/lib\server\pdf-engine-phase-two.test.ts:7:import { buildForensicAuditEvent, generateAuditChainHash } from "@/lib/pdf-engine/runtime/forensic-audit-chain";
apps/web/src/lib\server\pdf-engine-phase-two.test.ts:27:test("generateAuditChainHash is stable for the same forensic event payload", () => {
apps/web/src/lib\server\pdf-engine-phase-two.test.ts:39:  assert.equal(generateAuditChainHash(eventBase), generateAuditChainHash(eventBase));
apps/web/src/lib\server\pdf-engine-phase-two.test.ts:65:    auditMetadata: {
apps/web/src/lib\server\pdf-engine-phase-two.test.ts:67:      auditId: "audit-1",
apps/web/src/lib\server\pdf-engine-phase-two.test.ts:97:  assert.equal(evidencePackage.auditChainReference, evidencePackage.auditChain.currentChainHash);
apps/web/src/lib\server\pdf-engine-phase-two.test.ts:104:test("buildForensicAuditEvent produces an append-only chain hash", () => {
apps/web/src/lib\server\pdf-engine-phase-two.test.ts:105:  const event = buildForensicAuditEvent({
apps/web/src/lib\server\pdf-engine-phase-five.test.ts:14:import { buildAccessAuditEvent } from "@/lib/pdf-engine/security/access-audit";
apps/web/src/lib\server\pdf-engine-phase-five.test.ts:25:    auditMetadata: {
apps/web/src/lib\server\pdf-engine-phase-five.test.ts:27:      auditId: `audit-${input.evidenceId}`,
apps/web/src/lib\server\pdf-engine-phase-five.test.ts:127:    accessAuditTrail: [
apps/web/src/lib\server\pdf-engine-phase-five.test.ts:128:      buildAccessAuditEvent({ action: "view", actorId: "u1", actorTenantId: "tenant-a", department: "legal", evidenceId: "e1", outcome: "denied", reason: "blocked", role: "physician" }),
apps/web/src/lib\server\pdf-engine-phase-five.test.ts:129:      buildAccessAuditEvent({ action: "view", actorId: "u1", actorTenantId: "tenant-a", department: "legal", evidenceId: "e1", outcome: "denied", reason: "blocked", role: "physician" }),
apps/web/src/lib\server\pdf-engine-phase-five.test.ts:130:      buildAccessAuditEvent({ action: "view", actorId: "u1", actorTenantId: "tenant-a", department: "legal", evidenceId: "e1", outcome: "denied", reason: "blocked", role: "physician" }),
apps/web/src/lib\server\pdf-engine-foundation.test.ts:12:    auditId: "audit-1",
apps/web/src/lib\server\pdf-engine-foundation.test.ts:37:    auditId: "audit-1",
apps/web/src/lib\server\pdf-engine-foundation.test.ts:58:      auditId: "audit-1",
apps/web/src/lib\server\pdf-engine-phase-three.test.ts:4:import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
apps/web/src/lib\server\pdf-engine-phase-three.test.ts:16:    auditMetadata: {
apps/web/src/lib\server\pdf-engine-phase-three.test.ts:18:      auditId: "audit-archive-1",
apps/web/src/lib\server\pdf-engine-phase-four.test.ts:4:import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
apps/web/src/lib\server\pdf-engine-phase-four.test.ts:13:import { buildEvidenceTimelineModel } from "@/lib/pdf-engine/ui-models/evidence-timeline-model";
apps/web/src/lib\server\pdf-engine-phase-four.test.ts:19:    auditMetadata: {
apps/web/src/lib\server\pdf-engine-phase-four.test.ts:21:      auditId: "audit-phase4-1",
apps/web/src/lib\server\pdf-engine-phase-four.test.ts:77:    auditTimeline: [],
apps/web/src/lib\server\pdf-engine-phase-four.test.ts:128:  const timelineModel = buildEvidenceTimelineModel({
apps/web/src/lib\server\pdf-engine-phase-four.test.ts:129:    auditTimeline: [],
apps/web/src/lib\server\pdf-engine-phase-four.test.ts:139:    timelineModel,
apps/web/src/lib\server\pilot-email-enterprise-template.test.ts:46:      recordAuditAttempt: async () => "audit-1",
apps/web/src/lib\server\pilot-email-override.test.ts:8:  let auditedRecipient = "";
apps/web/src/lib\server\pilot-email-override.test.ts:35:      recordAuditAttempt: async (args) => {
apps/web/src/lib\server\pilot-email-override.test.ts:36:        auditedRecipient = args.recipient;
apps/web/src/lib\server\pilot-email-override.test.ts:37:        return "audit-1";
apps/web/src/lib\server\pilot-email-override.test.ts:43:  assert.equal(auditedRecipient, "patient@example.com");
apps/web/src/lib\server\pilot-email-override.test.ts:72:      recordAuditAttempt: async () => "audit-2",
apps/web/src/lib\server\retention-service.ts:6:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\retention-service.ts:106:    await writeAuditLog({
apps/web/src/lib\server\retention-service.ts:140:  await writeAuditLog({
apps/web/src/lib\server\report-access-service.test.ts:15:      reportKey: "audit_chain_viewer",
apps/web/src/lib\server\report-access-service.test.ts:31:  assert.equal(summary.byReportKey.audit_chain_viewer, 1);
apps/web/src/lib\server\roles.ts:22:    "auditor",
apps/web/src/lib\server\roles.ts:85:    auditor: "auditor",
apps/web/src/lib\server\roles.ts:137:        case "auditor":
apps/web/src/lib\server\policy-attestation-service.ts:8:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\policy-attestation-service.ts:376:  await writeAuditLog({
apps/web/src/lib\server\pilot-email-override.ts:26:  auditId: string | null;
apps/web/src/lib\server\pilot-email-override.ts:34:  auditId: string | null;
apps/web/src/lib\server\pilot-email-override.ts:39:type SecureSigningEmailAuditArgs = {
apps/web/src/lib\server\pilot-email-override.ts:52:  recordAuditAttempt: (args: SecureSigningEmailAuditArgs) => Promise<string | null>;
apps/web/src/lib\server\pilot-email-override.ts:85:async function recordEmailAuditAttempt(args: {
apps/web/src/lib\server\pilot-email-override.ts:203:                    <p style="margin:0;font-size:14px;line-height:22px;color:#2F2F2F;">Γ£ô Electronic Audit Trail Enabled</p>
apps/web/src/lib\server\pilot-email-override.ts:315:    "- Electronic Audit Trail Enabled",
apps/web/src/lib\server\pilot-email-override.ts:387:      auditId: null,
apps/web/src/lib\server\pilot-email-override.ts:401:    const auditId = await recordEmailAuditAttempt({
apps/web/src/lib\server\pilot-email-override.ts:423:      auditId,
apps/web/src/lib\server\pilot-email-override.ts:429:    const auditId = await recordEmailAuditAttempt({
apps/web/src/lib\server\pilot-email-override.ts:451:      auditId,
apps/web/src/lib\server\pilot-email-override.ts:534:  const recordAuditAttempt = dependencies?.recordAuditAttempt ?? recordEmailAuditAttempt;
apps/web/src/lib\server\pilot-email-override.ts:553:      const auditId = await recordAuditAttempt({
apps/web/src/lib\server\pilot-email-override.ts:574:        auditId,
apps/web/src/lib\server\pilot-email-override.ts:580:    const auditId = await recordAuditAttempt({
apps/web/src/lib\server\pilot-email-override.ts:600:      auditId,
apps/web/src/lib\server\pilot-email-override.ts:606:    const auditId = await recordAuditAttempt({
apps/web/src/lib\server\pilot-email-override.ts:626:      auditId,
apps/web/src/lib\server\pilot-email-override.ts:702:  const recordAuditAttempt = dependencies?.recordAuditAttempt ?? recordEmailAuditAttempt;
apps/web/src/lib\server\pilot-email-override.ts:738:      const auditId = await recordAuditAttempt({
apps/web/src/lib\server\pilot-email-override.ts:759:        auditId,
apps/web/src/lib\server\pilot-email-override.ts:765:    const auditId = await recordAuditAttempt({
apps/web/src/lib\server\pilot-email-override.ts:785:      auditId,
apps/web/src/lib\server\pilot-email-override.ts:791:    const auditId = await recordAuditAttempt({
apps/web/src/lib\server\pilot-email-override.ts:811:      auditId,
apps/web/src/lib\server\pilot-email-override.ts:833:  const recordAuditAttempt = dependencies?.recordAuditAttempt ?? recordEmailAuditAttempt;
apps/web/src/lib\server\pilot-email-override.ts:868:      const auditId = await recordAuditAttempt({
apps/web/src/lib\server\pilot-email-override.ts:887:        auditId,
apps/web/src/lib\server\pilot-email-override.ts:893:    const auditId = await recordAuditAttempt({
apps/web/src/lib\server\pilot-email-override.ts:911:      auditId,
apps/web/src/lib\server\pilot-email-override.ts:917:    const auditId = await recordAuditAttempt({
apps/web/src/lib\server\pilot-email-override.ts:935:      auditId,
apps/web/src/lib\server\remediation-tracker-service.ts:8:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\remediation-tracker-service.ts:125:    sourceType: normalizeText(raw.sourceType, "audit_finding"),
apps/web/src/lib\server\remediation-tracker-service.ts:276:    sourceType: normalizeText(payload.sourceType, current?.sourceType ?? "audit_finding"),
apps/web/src/lib\server\remediation-tracker-service.ts:368:  await writeAuditLog({
apps/web/src/lib\server\promissory-note-service.ts:8:import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
apps/web/src/lib\server\promissory-note-service.ts:9:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\promissory-note-service.ts:180:  await writeAuditLog({
apps/web/src/lib\server\promissory-note-service.ts:197:  await appendAuditChainEvent({
apps/web/src/lib\server\saas-services.ts:11:import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
apps/web/src/lib\server\saas-services.ts:302:type AuditArgs = {
apps/web/src/lib\server\saas-services.ts:318:export async function writeAuditLog(args: AuditArgs): Promise<void> {
apps/web/src/lib\server\saas-services.ts:325:  await prisma().auditLog.create({
apps/web/src/lib\server\saas-services.ts:342:    await appendAuditChainEvent({
apps/web/src/lib\server\saas-services.ts:359:  } catch (auditChainError) {
apps/web/src/lib\server\saas-services.ts:360:    console.error("audit chain append failed (non-fatal)", auditChainError);
apps/web/src/lib\server\secure-links.ts:6:import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
apps/web/src/lib\server\secure-links.ts:8:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\secure-links.ts:111:type PublicDecisionAuditAction = {
apps/web/src/lib\server\secure-links.ts:257:async function appendPublicDecisionAudit(args: {
apps/web/src/lib\server\secure-links.ts:279:  const auditActions: PublicDecisionAuditAction[] = [
apps/web/src/lib\server\secure-links.ts:307:  for (const auditAction of auditActions) {
apps/web/src/lib\server\secure-links.ts:308:    await writeAuditLog({
apps/web/src/lib\server\secure-links.ts:313:      action: auditAction.action,
apps/web/src/lib\server\secure-links.ts:314:      details: auditAction.details,
apps/web/src/lib\server\secure-links.ts:321:    await appendAuditChainEvent({
apps/web/src/lib\server\secure-links.ts:324:      eventType: auditAction.eventType,
apps/web/src/lib\server\secure-links.ts:327:      payloadSummary: auditAction.details,
apps/web/src/lib\server\secure-links.ts:613:  await writeAuditLog({
apps/web/src/lib\server\secure-links.ts:705:  await writeAuditLog({
apps/web/src/lib\server\secure-links.ts:811:    await appendPublicDecisionAudit({
apps/web/src/lib\server\public-signing-service.ts:7:import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
apps/web/src/lib\server\public-signing-service.ts:38:import { recordSmsAuditAttempt } from "@/services/sms/smsAuditService";
apps/web/src/lib\server\public-signing-service.ts:672:async function writePublicConsentAudit(args: {
apps/web/src/lib\server\public-signing-service.ts:681:  await prisma().consentAuditEvent.create({
apps/web/src/lib\server\public-signing-service.ts:694:  await appendAuditChainEvent({
apps/web/src/lib\server\public-signing-service.ts:899:  const events = await prisma().consentAuditEvent.findMany({
apps/web/src/lib\server\public-signing-service.ts:1102:  await writePublicConsentAudit({
apps/web/src/lib\server\public-signing-service.ts:1211:  const events = await prisma().consentAuditEvent.findMany({
apps/web/src/lib\server\public-signing-service.ts:1391:  await writePublicConsentAudit({
apps/web/src/lib\server\public-signing-service.ts:1970:  let otpEmailAuditId: string | null = null;
apps/web/src/lib\server\public-signing-service.ts:1990:    otpEmailAuditId = otpEmailDelivery.auditId;
apps/web/src/lib\server\public-signing-service.ts:2022:      otpEmailAuditId,
apps/web/src/lib\server\public-signing-service.ts:2028:  await appendAuditChainEvent({
apps/web/src/lib\server\public-signing-service.ts:2041:      otpEmailAuditId,
apps/web/src/lib\server\public-signing-service.ts:2048:  await recordSmsAuditAttempt({
apps/web/src/lib\server\public-signing-service.ts:2062:      otpEmailAuditId,
apps/web/src/lib\server\public-signing-service.ts:2214:  await writePublicConsentAudit({
apps/web/src/lib\server\public-signing-service.ts:2230:  await appendAuditChainEvent({
apps/web/src/lib\server\public-signing-service.ts:2379:      pdfHash: doc.auditChecksum || doc.immutablePdfHash || documentHash,
apps/web/src/lib\server\public-signing-service.ts:2400:    await writePublicConsentAudit({
apps/web/src/lib\server\public-signing-service.ts:2513:  const pdfHash = doc.auditChecksum || doc.immutablePdfHash || documentHash;
apps/web/src/lib\server\public-signing-service.ts:2538:  await writePublicConsentAudit({
apps/web/src/lib\server\security-policy-service.ts:8:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\security-policy-service.ts:23:  "auditor",
apps/web/src/lib\server\security-policy-service.ts:313:    await writeAuditLog({
apps/web/src/lib\server\security-policy-service.ts:399:  const recentAuditExports = await prisma().reportAccessLog.findMany({
apps/web/src/lib\server\security-policy-service.ts:403:        { reportKey: { contains: "audit" } },
apps/web/src/lib\server\security-policy-service.ts:415:    recentAuditExports,
apps/web/src/lib\server\security-policy-service.ts:419:      auditExportCount: recentAuditExports.length,
apps/web/src/lib\server\signature-orchestration-service.ts:23:import { buildTimelineEntry } from "@/lib/core/audit-core";
apps/web/src/lib\server\training-compliance-service.ts:8:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\training-compliance-service.ts:325:  await writeAuditLog({
apps/web/src/lib\server\third-party-risk-service.ts:8:import { writeAuditLog } from "@/lib/server/saas-services";
apps/web/src/lib\server\third-party-risk-service.ts:401:  await writeAuditLog({
apps/web/src/lib\server\tsa-client.ts:5: * Ensures evidence bundle timestamps are trusted and auditable.
apps/web/src/lib\server\unified-legal-evidence-service.ts:68:  audit: {
apps/web/src/lib\server\unified-legal-evidence-service.ts:69:    timeline: TimelineEntry[];
apps/web/src/lib\server\unified-legal-evidence-service.ts:224:  auditEvents: Array<{
apps/web/src/lib\server\unified-legal-evidence-service.ts:244:  const auditTimeline = args.auditEvents.map((event) => ({
apps/web/src/lib\server\unified-legal-evidence-service.ts:245:    source: event.source || "consent_audit_event",
apps/web/src/lib\server\unified-legal-evidence-service.ts:286:  return [...auditTimeline, ...otpTimeline, ...signatureTimeline, ...refusalTimeline]
apps/web/src/lib\server\unified-legal-evidence-service.ts:366:      auditEvents: {
apps/web/src/lib\server\unified-legal-evidence-service.ts:389:  const educationEvent = [...doc.auditEvents]
apps/web/src/lib\server\unified-legal-evidence-service.ts:396:  const decisionEvent = [...doc.auditEvents]
apps/web/src/lib\server\unified-legal-evidence-service.ts:405:  const technicalAuditMetadata = [...doc.auditEvents]
apps/web/src/lib\server\unified-legal-evidence-service.ts:418:    ? getNullableString(refusalSignature.ipAddress) || getNullableString(technicalAuditMetadata.ipAddress)
apps/web/src/lib\server\unified-legal-evidence-service.ts:419:    : acceptedSignature?.ipAddress || getNullableString(technicalAuditMetadata.ipAddress);
apps/web/src/lib\server\unified-legal-evidence-service.ts:421:    ? getNullableString(refusalSignature.userAgent) || getNullableString(technicalAuditMetadata.userAgent)
apps/web/src/lib\server\unified-legal-evidence-service.ts:422:    : acceptedSignature?.userAgent || getNullableString(technicalAuditMetadata.userAgent);
apps/web/src/lib\server\unified-legal-evidence-service.ts:473:    audit: {
apps/web/src/lib\server\unified-legal-evidence-service.ts:474:      timeline: buildTimeline({
apps/web/src/lib\server\unified-legal-evidence-service.ts:475:        auditEvents: doc.auditEvents,
END MATCHES

## Buttons and clickable handlers in prisma

_No matches found._

## Inputs selects and forms in prisma

_No matches found._

## API calls in prisma

_No matches found._

## Mock static placeholder risks in prisma

BEGIN MATCHES
prisma\seed.js:473:  const sampleCase = existing
prisma\seed.js:480:      caseId: sampleCase.id,
prisma\seed.js:501:        caseId: sampleCase.id,
prisma\seed.js:525:      entityId: sampleCase.id,
prisma\seed.js:536:        entityId: sampleCase.id,
prisma\seed.js:539:        caseId: sampleCase.id,
prisma\seed.js:548:  return sampleCase;
END MATCHES

## Loading error and empty states in prisma

BEGIN MATCHES
prisma\seed.js:599:  .catch((error) => {
prisma\seed.js:600:    console.error("Seed failed", error);
prisma\recover_saas_admin.js:299:    .catch((error) => {
prisma\recover_saas_admin.js:300:        console.error("recovery_failed", error);
prisma\ensure-admin-access.js:72:  } catch (error) {
prisma\ensure-admin-access.js:73:    if (error && typeof error === "object" && (error.code === "P2022" || error.code === "P2010" || error.code === "P2021")) {
prisma\ensure-admin-access.js:77:    throw error;
prisma\ensure-admin-access.js:137:  } catch (error) {
prisma\ensure-admin-access.js:138:    if (error && typeof error === "object" && error.code === "P2021") {
prisma\ensure-admin-access.js:144:    throw error;
prisma\ensure-admin-access.js:250:  .catch((error) => {
prisma\ensure-admin-access.js:251:    console.error("[ensure-admin-access] Failed:", error);
prisma\make-platform-admin.js:79:        console.error("[ERROR] A valid email address is required.");
prisma\make-platform-admin.js:93:        console.error(`[ERROR] No user found with email: ${email}`);
prisma\make-platform-admin.js:94:        console.error("  Please check the email or create the user first via:");
prisma\make-platform-admin.js:95:        console.error("    node prisma/recover_saas_admin.js");
prisma\make-platform-admin.js:129:            console.warn("[make-platform-admin] WARN: user_type column not found, skipping that field.");
prisma\make-platform-admin.js:149:        console.error(`[ERROR] UPDATE returned no rows.  Check that the email matches exactly: ${email}`);
prisma\make-platform-admin.js:193:    console.error("[make-platform-admin] FATAL:", err.message || err);
END MATCHES

## Audit and logging references in prisma

BEGIN MATCHES
prisma\seed.js:522:  const existingSeedAudit = await prisma.auditLog.findFirst({
prisma\seed.js:530:  if (!existingSeedAudit) {
prisma\seed.js:531:    await prisma.auditLog.create({
prisma\schema.prisma:174:  auditLogs          AuditLog[]
prisma\schema.prisma:254:  auditLogs           AuditLog[]
prisma\schema.prisma:333:  auditLogs        AuditLog[]
prisma\schema.prisma:487:  auditLogs          AuditLog[]
prisma\schema.prisma:494:model AuditLog {
prisma\schema.prisma:516:  @@map("audit_logs")
END MATCHES


## Required manual closure checklist

- [ ] Create Consent: all 8 steps connected to APIs.
- [ ] Pending Consents: queue data reminders resend cancel connected.
- [ ] Consent Records: archive search PDF evidence package connected.
- [ ] Approved Forms: template library preview governance connected.
- [ ] Anesthesia Queue: same consent case review connected.
- [ ] Patient Education: library attach send acknowledgement connected.
- [ ] Compliance Review: readiness score missing items legal controls connected.
- [ ] Audit Trail: timeline signature evidence export connected.
- [ ] Settings and Support: legal support technical ticket settings connected.
- [ ] No production mock data.
- [ ] No dead buttons.
- [ ] No unvalidated required fields.
- [ ] Every write action has audit event.
- [ ] Every page has loading error empty states.
- [ ] Every protected action has RBAC.
