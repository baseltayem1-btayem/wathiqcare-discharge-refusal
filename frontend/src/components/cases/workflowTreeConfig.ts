import type { WorkflowStep } from "@/components/cases/workflowTreeTypes";

const YES_NO = [
  { label: "نعم", value: "yes" },
  { label: "لا", value: "no" },
];

export const CASE_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "case_created",
    title: "إنشاء الحالة",
    fields: [
      {
        id: "intake_status",
        label: "حالة استقبال الحالة",
        options: [
          { label: "تم الإنشاء", value: "created" },
          { label: "قيد الانتظار", value: "pending" },
        ],
      },
    ],
  },
  {
    id: "risk_identified",
    title: "تحديد المخاطر",
    fields: [
      {
        id: "risk_level",
        label: "مستوى الخطورة",
        options: [
          { label: "منخفض", value: "low" },
          { label: "متوسط", value: "moderate" },
          { label: "مرتفع", value: "high" },
          { label: "حرج", value: "critical" },
        ],
      },
      {
        id: "barrier_type",
        label: "نوع العائق",
        options: [
          { label: "المريض يرفض الخروج", value: "patient_refuses_discharge" },
          { label: "الأسرة ترفض الخطة", value: "family_refuses_plan" },
          { label: "لا توجد جهة مستقبِلة", value: "no_accepting_facility" },
          { label: "لا توجد جهة تغطية مالية", value: "no_payer" },
          { label: "عدم أهلية / عدم وجود ممثل نظامي", value: "no_capacity_or_no_surrogate" },
          { label: "مخاوف سلوكية / تتعلق بالسلامة", value: "behavioral_or_safety_concern" },
        ],
      },
    ],
  },
  {
    id: "discharge_planned",
    title: "التخطيط للخروج",
    fields: [
      {
        id: "discharge_destination",
        label: "جهة الخروج",
        options: [
          { label: "المنزل", value: "home" },
          { label: "المنزل مع خدمات", value: "home_with_services" },
          { label: "مرفق تمريض متخصص", value: "skilled_nursing_facility" },
          { label: "رعاية حادة طويلة الأجل", value: "long_term_acute_care" },
          { label: "مرفق تأهيل", value: "rehabilitation_facility" },
          { label: "إيواء اجتماعي", value: "social_placement" },
          { label: "أخرى", value: "other" },
        ],
      },
      {
        id: "medical_stability",
        label: "الاستقرار الطبي",
        options: [
          { label: "مستقر للخروج", value: "stable_for_discharge" },
          { label: "بانتظار المراجعة", value: "pending_review" },
          { label: "غير مستقر بعد", value: "not_yet_stable" },
        ],
      },
      {
        id: "patient_notified_discharge_decision",
        label: "إبلاغ المريض / ولي الأمر بقرار الخروج الطبي",
        options: YES_NO,
      },
      {
        id: "patient_ack_homecare_provision",
        label: "إقرار المريض / ولي الأمر بتوفير الرعاية الصحية المنزلية",
        options: YES_NO,
      },
    ],
  },
  {
    id: "patient_refusal_recorded",
    title: "تسجيل رفض المريض",
    fields: [
      {
        id: "refusal_type",
        label: "نوع الرفض",
        options: [
          { label: "رفض شفهي", value: "verbal_refusal" },
          { label: "رفض خطي", value: "written_refusal" },
          { label: "رفض من الأسرة", value: "family_refusal" },
          { label: "رفض من الممثل النظامي", value: "surrogate_refusal" },
        ],
      },
      {
        id: "family_present",
        label: "حضور الأسرة",
        options: YES_NO,
      },
    ],
  },
  {
    id: "social_review",
    title: "المراجعة الاجتماعية",
    fields: [
      {
        id: "social_work_status",
        label: "حالة الخدمة الاجتماعية",
        options: [
          { label: "بانتظار الإجراء", value: "pending" },
          { label: "قيد التنفيذ", value: "in_progress" },
          { label: "مكتمل", value: "completed" },
          { label: "غير مطلوب", value: "not_required" },
        ],
      },
    ],
  },
  {
    id: "administrative_escalation",
    title: "التصعيد الإداري",
    fields: [
      {
        id: "escalation_level",
        label: "مستوى التصعيد",
        options: [
          { label: "المستوى 1", value: "level_1" },
          { label: "المستوى 2", value: "level_2" },
          { label: "المستوى 3", value: "level_3" },
        ],
      },
      {
        id: "administration_notified",
        label: "تم إشعار الإدارة",
        options: YES_NO,
      },
    ],
  },
  {
    id: "financial_notice",
    title: "الإشعار المالي",
    fields: [
      {
        id: "financial_notice_status",
        label: "حالة الإشعار المالي",
        options: [
          { label: "غير مُصدر", value: "not_issued" },
          { label: "مسودة", value: "drafted" },
          { label: "تم الإصدار", value: "issued" },
          { label: "تم الإقرار", value: "acknowledged" },
        ],
      },
    ],
  },
  {
    id: "legal_review",
    title: "المراجعة القانونية",
    fields: [
      {
        id: "legal_status",
        label: "الحالة القانونية",
        options: [
          { label: "لم يبدأ", value: "not_started" },
          { label: "قيد المراجعة", value: "under_review" },
          { label: "تم إعداد إشعار قانوني", value: "legal_notice_prepared" },
          { label: "تم النظر في إجراء خارجي", value: "external_action_considered" },
          { label: "أُغلقت من الشؤون القانونية", value: "closed_by_legal" },
        ],
      },
    ],
  },
  {
    id: "case_closed",
    title: "إغلاق الحالة",
    fields: [
      {
        id: "closure_outcome",
        label: "نتيجة الإغلاق",
        options: [
          { label: "تم الخروج", value: "discharged" },
          { label: "غادر خلافًا للتوصية الطبية", value: "left_against_advice" },
          { label: "خروج إداري", value: "administrative_discharge" },
          { label: "تم التحويل", value: "transferred" },
          { label: "تم إلغاء الحالة", value: "case_cancelled" },
        ],
      },
    ],
  },
];
