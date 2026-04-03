// Legacy example workflow tracker component removed
{ id: 'issuance', titleAr: 'إصدار المستند', titleEn: 'Document Issuance', clickable: false },
{ id: 'archive', titleAr: 'الأرشفة', titleEn: 'Archive', clickable: false },
        ],
informed_consent: [
    { id: 'selection', titleAr: 'اختيار الإجراء', titleEn: 'Procedure Selection', clickable: true, subtitleAr: 'مكتمل', subtitleEn: 'Completed' },
    { id: 'education', titleAr: 'المادة التثقيفية', titleEn: 'Educational Material', clickable: true, subtitleAr: 'مكتمل', subtitleEn: 'Completed' },
    { id: 'explanation', titleAr: 'الشرح السريري', titleEn: 'Clinical Explanation', state: 'current', clickable: true, subtitleAr: 'نشط', subtitleEn: 'Active' },
    { id: 'patient_signature', titleAr: 'توقيع المريض', titleEn: 'Patient Signature', clickable: false },
    { id: 'physician_signature', titleAr: 'توقيع الطبيب', titleEn: 'Physician Signature', clickable: false },
    { id: 'documentation', titleAr: 'التوثيق', titleEn: 'Documentation', clickable: false },
    { id: 'archive', titleAr: 'الأرشفة', titleEn: 'Archive', clickable: false },
],
    financial_acknowledgment: [
        { id: 'request', titleAr: 'إنشاء الطلب', titleEn: 'Request Creation', clickable: true, subtitleAr: 'مكتمل', subtitleEn: 'Completed' },
        { id: 'financial_data', titleAr: 'البيانات المالية', titleEn: 'Financial Data', clickable: true, subtitleAr: 'مكتمل', subtitleEn: 'Completed' },
        { id: 'obligation_review', titleAr: 'مراجعة الالتزام', titleEn: 'Obligation Review', state: 'current', clickable: true, subtitleAr: 'قيد المراجعة', subtitleEn: 'Under review' },
        { id: 'patient_signature', titleAr: 'توقيع المريض', titleEn: 'Patient Signature', clickable: false },
        { id: 'admin_approval', titleAr: 'اعتماد إداري', titleEn: 'Administrative Approval', state: 'warning', clickable: false, subtitleAr: 'يتطلب توضيحا', subtitleEn: 'Needs clarification' },
        { id: 'issuance', titleAr: 'إصدار المستند', titleEn: 'Document Issuance', clickable: false },
        { id: 'archive', titleAr: 'الأرشفة', titleEn: 'Archive', clickable: false },
    ],
        administrative_case: [
            { id: 'intake', titleAr: 'استلام الطلب', titleEn: 'Request Intake', clickable: true, subtitleAr: 'مكتمل', subtitleEn: 'Completed' },
            { id: 'verification', titleAr: 'تحقق البيانات', titleEn: 'Data Verification', clickable: true, subtitleAr: 'مكتمل', subtitleEn: 'Completed' },
            { id: 'compliance', titleAr: 'مطابقة الامتثال', titleEn: 'Compliance Check', state: 'current', clickable: true, subtitleAr: 'قيد الفحص', subtitleEn: 'Under review' },
            { id: 'approval', titleAr: 'الموافقة الإدارية', titleEn: 'Administrative Approval', clickable: false },
            { id: 'notification', titleAr: 'الإشعار الرسمي', titleEn: 'Official Notification', clickable: false },
            { id: 'issuance', titleAr: 'إصدار القرار', titleEn: 'Decision Issuance', clickable: false },
            { id: 'archive', titleAr: 'الأرشفة', titleEn: 'Archive', clickable: false },
        ],
    };

integrationNote = '';

    get activeSteps(): WorkflowProgressStep[] {
    return this.workflows[this.selectedWorkflow];
}

    get direction(): 'rtl' | 'ltr' {
    return this.language === 'ar' ? 'rtl' : 'ltr';
}

onStepSelected(step: WorkflowStepViewModel): void {
    this.integrationNote = this.language === 'ar' ? `تم اختيار الخطوة: ${step.id}` : `Step selected: ${step.id}`;
}
}
