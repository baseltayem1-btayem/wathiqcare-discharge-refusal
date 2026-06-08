import React from 'react';
import { Activity, Pill, ClipboardList, TrendingUp } from 'lucide-react';

interface WorkflowItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelAr: string;
  value: string;
  valueAr: string;
  progress?: number;
  color: string;
}

interface Props {
  lang: 'en' | 'ar';
  anesthesiaType?: string;
  ariScore?: number;
  medsCount?: number;
  workflowProgress?: number;
}

export function WorkflowProgress({
  lang,
  anesthesiaType = 'General',
  ariScore = 67,
  medsCount = 4,
  workflowProgress = 40,
}: Props) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const items: WorkflowItem[] = [
    {
      id: 'anesthesia',
      icon: Activity,
      label: 'Anesthesia Type',
      labelAr: 'نوع التخدير',
      value: anesthesiaType,
      valueAr: anesthesiaType === 'General' ? 'عام' : anesthesiaType === 'Local' ? 'موضعي' : 'تخدير نخاعي',
      color: '#002B5C',
    },
    {
      id: 'ari',
      icon: TrendingUp,
      label: 'ARI Score',
      labelAr: 'درجة ARI',
      value: `${ariScore}%`,
      valueAr: `${ariScore}٪`,
      progress: ariScore,
      color: ariScore >= 70 ? '#EF4444' : ariScore >= 50 ? '#F59E0B' : '#10B981',
    },
    {
      id: 'meds',
      icon: Pill,
      label: 'Meds List',
      labelAr: 'قائمة الأدوية',
      value: `${medsCount} items`,
      valueAr: `${medsCount} عناصر`,
      color: '#6366F1',
    },
    {
      id: 'workflow',
      icon: ClipboardList,
      label: 'Workflow',
      labelAr: 'سير العمل',
      value: `${workflowProgress}%`,
      valueAr: `${workflowProgress}٪`,
      progress: workflowProgress,
      color: '#10B981',
    },
  ];

  return (
    <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden" dir={dir}>
      <div className="px-5 py-3 border-b border-[#D8DCE3] bg-[#F4F6F9]">
        <h3 className="text-sm font-semibold text-[#2F2F2F]">
          {lang === 'en' ? 'Workflow Progress' : 'تقدم سير العمل'}
        </h3>
        <p className="text-xs text-[#6B7280] mt-0.5">
          {lang === 'en' ? 'Real-time clinical workflow metrics' : 'مقاييس سير العمل السريري في الوقت الفعلي'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#EEF1F5]" style={{ direction: 'ltr' }}>
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="p-4 flex flex-col gap-2"
              style={{ direction: dir }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                  style={{ background: `${item.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <span className="text-xs text-[#6B7280]">
                  {lang === 'en' ? item.label : item.labelAr}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-lg font-semibold" style={{ color: item.color }}>
                  {lang === 'en' ? item.value : item.valueAr}
                </div>

                {item.progress !== undefined && (
                  <div className="w-full bg-[#EEF1F5] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${item.progress}%`,
                        background: item.color,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
