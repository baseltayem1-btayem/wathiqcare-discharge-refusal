import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    WorkflowProgressStep,
    WorkflowProgressTrackerComponent,
    WorkflowStepViewModel,
} from '../../../shared/components/workflow-progress-tracker';

type WorkflowKind = 'discharge_refusal' | 'informed_consent' | 'financial_acknowledgment' | 'administrative_case';

@Component({
    selector: 'app-case-details-workflow-tracker-example',
    standalone: true,
    imports: [CommonModule, FormsModule, WorkflowProgressTrackerComponent],
    templateUrl: './case-details-workflow-tracker.example.component.html',
    styleUrl: './case-details-workflow-tracker.example.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseDetailsWorkflowTrackerExampleComponent {
    language: 'ar' | 'en' = 'ar';
    selectedWorkflow: WorkflowKind = 'discharge_refusal';

    readonly workflows: Record<WorkflowKind, WorkflowProgressStep[]> = {
        discharge_refusal: [
            { id: 'registration', titleAr: 'تسجيل الحالة', titleEn: 'Case Registration', clickable: true, subtitleAr: 'مكتمل', subtitleEn: 'Completed' },
            { id: 'data_entry', titleAr: 'إدخال البيانات', titleEn: 'Data Entry', clickable: true, subtitleAr: 'مكتمل', subtitleEn: 'Completed' },
            { id: 'risk_counseling', titleAr: 'الإرشاد بالمخاطر', titleEn: 'Risk Counseling', state: 'current', clickable: true, subtitleAr: 'قيد التنفيذ', subtitleEn: 'In Progress' },
            { id: 'signature', titleAr: 'توقيع المريض / الوصي', titleEn: 'Patient / Guardian Signature', clickable: false, subtitleAr: 'بانتظار التوقيع', subtitleEn: 'Awaiting signature' },
            { id: 'physician_approval', titleAr: 'اعتماد الطبيب', titleEn: 'Physician Approval', clickable: false },
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
