import React from 'react';
import { Bot, FileCheck, BookOpen, AlertCircle, PenTool, ChevronRight } from 'lucide-react';

interface FeatureCard {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  status: 'available' | 'pending' | 'ready';
  statusLabel: string;
  statusLabelAr: string;
  statusColor: string;
}

const features: FeatureCard[] = [
  {
    id: 'ai-assistant',
    icon: Bot,
    title: 'AI Form Assistant',
    titleAr: 'مساعد النماذج الذكي',
    description: 'Auto-populate consent fields using patient history and encounter data',
    descriptionAr: 'ملء تلقائي لحقول الموافقة باستخدام سجل المريض وبيانات الزيارة',
    status: 'available',
    statusLabel: 'Available',
    statusLabelAr: 'متاح',
    statusColor: '#10B981',
  },
  {
    id: 'legal-review',
    icon: FileCheck,
    title: 'Legal Review Status',
    titleAr: 'حالة المراجعة القانونية',
    description: 'Track regulatory compliance and legal team sign-off',
    descriptionAr: 'تتبع الامتثال التنظيمي وموافقة الفريق القانوني',
    status: 'ready',
    statusLabel: 'Compliant',
    statusLabelAr: 'متوافق',
    statusColor: '#10B981',
  },
  {
    id: 'patient-education',
    icon: BookOpen,
    title: 'Patient Education Materials',
    titleAr: 'مواد تثقيف المريض',
    description: 'Attach procedure-specific videos and educational content',
    descriptionAr: 'إرفاق فيديوهات ومحتوى تعليمي خاص بالإجراء',
    status: 'pending',
    statusLabel: '2 items ready',
    statusLabelAr: 'عنصران جاهزان',
    statusColor: '#3B82F6',
  },
  {
    id: 'risk-alerts',
    icon: AlertCircle,
    title: 'Sign-in Alerts & Risk Stratification',
    titleAr: 'تنبيهات الدخول وتقييم المخاطر',
    description: 'Pre-procedure checklist and patient risk scoring',
    descriptionAr: 'قائمة التحقق قبل الإجراء وتسجيل مخاطر المريض',
    status: 'ready',
    statusLabel: 'ARI: 67%',
    statusLabelAr: 'ARI: 67%',
    statusColor: '#F59E0B',
  },
  {
    id: 'digital-signature',
    icon: PenTool,
    title: 'Digital Signature Workflow',
    titleAr: 'سير عمل التوقيع الرقمي',
    description: 'Configure signature capture method and witness requirements',
    descriptionAr: 'تهيئة طريقة التقاط التوقيع ومتطلبات الشاهد',
    status: 'pending',
    statusLabel: 'Configure',
    statusLabelAr: 'تهيئة',
    statusColor: '#6B7280',
  },
];

interface Props {
  lang: 'en' | 'ar';
  onCardClick?: (id: string) => void;
}

export function FeatureCards({ lang, onCardClick }: Props) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" dir={dir}>
      {features.map(feature => {
        const Icon = feature.icon;
        return (
          <div
            key={feature.id}
            onClick={() => onCardClick?.(feature.id)}
            className="bg-white border border-[#D8DCE3] rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(0, 43, 92, 0.08)' }}
              >
                <Icon className="w-5 h-5" style={{ color: '#002B5C' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[#2F2F2F] mb-1">
                  {lang === 'en' ? feature.title : feature.titleAr}
                </h3>
                <p className="text-xs text-[#6B7280] leading-relaxed mb-3">
                  {lang === 'en' ? feature.description : feature.descriptionAr}
                </p>
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      background: `${feature.statusColor}15`,
                      color: feature.statusColor,
                    }}
                  >
                    {lang === 'en' ? feature.statusLabel : feature.statusLabelAr}
                  </span>
                  <ChevronRight
                    className="w-4 h-4 text-[#D8DCE3] group-hover:text-[#002B5C] transition-colors"
                    style={{ transform: lang === 'ar' ? 'rotate(180deg)' : 'none' }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
