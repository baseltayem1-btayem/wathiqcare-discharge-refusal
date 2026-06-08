import React from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

export interface Alert {
  id: string;
  type: 'warning' | 'info';
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  actionLabel?: string;
  actionLabelAr?: string;
  dismissable?: boolean;
}

const defaultAlerts: Alert[] = [
  {
    id: 'alert-1',
    type: 'warning',
    title: 'Attention: Flagged Clinical Context',
    titleAr: 'انتباه: سياق سريري مميز',
    message: 'This patient has a documented allergy to latex. Ensure all consent materials and procedure setup avoid latex exposure.',
    messageAr: 'لدى هذا المريض حساسية موثقة من اللاتكس. تأكد من أن جميع مواد الموافقة وإعداد الإجراء تتجنب التعرض لللاتكس.',
    actionLabel: 'Review Allergies',
    actionLabelAr: 'مراجعة الحساسيات',
    dismissable: false,
  },
  {
    id: 'alert-2',
    type: 'info',
    title: 'Recent Encounter Note',
    titleAr: 'ملاحظة الزيارة الأخيرة',
    message: 'The attending physician has noted concerns about post-op mobility. Consider additional consent language.',
    messageAr: 'لاحظ الطبيب المعالج مخاوف بشأن الحركة بعد العملية. فكر في لغة موافقة إضافية.',
    actionLabel: 'View Note',
    actionLabelAr: 'عرض الملاحظة',
    dismissable: true,
  },
];

interface Props {
  lang: 'en' | 'ar';
  alerts?: Alert[];
  onDismiss?: (id: string) => void;
  onAction?: (id: string) => void;
}

export function AttentionAlerts({ lang, alerts = defaultAlerts, onDismiss, onAction }: Props) {
  const [visibleAlerts, setVisibleAlerts] = React.useState<string[]>(alerts.map(a => a.id));
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const handleDismiss = (id: string) => {
    setVisibleAlerts(prev => prev.filter(alertId => alertId !== id));
    onDismiss?.(id);
  };

  const filteredAlerts = alerts.filter(a => visibleAlerts.includes(a.id));

  if (filteredAlerts.length === 0) return null;

  return (
    <div className="space-y-3" dir={dir}>
      {filteredAlerts.map(alert => {
        const isWarning = alert.type === 'warning';
        const bgColor = isWarning ? '#FEF3C7' : '#DBEAFE';
        const borderColor = isWarning ? '#F59E0B' : '#3B82F6';
        const textColor = isWarning ? '#92400E' : '#1E40AF';
        const iconColor = isWarning ? '#F59E0B' : '#3B82F6';

        return (
          <div
            key={alert.id}
            className="border rounded-lg p-4"
            style={{ background: bgColor, borderColor }}
          >
            <div className="flex items-start gap-3">
              {isWarning ? (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: iconColor }} />
              ) : (
                <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: iconColor }} />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-semibold" style={{ color: textColor }}>
                    {lang === 'en' ? alert.title : alert.titleAr}
                  </h4>
                  {alert.dismissable && (
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="w-4 h-4" style={{ color: textColor }} />
                    </button>
                  )}
                </div>

                <p className="text-xs leading-relaxed mb-3" style={{ color: textColor }}>
                  {lang === 'en' ? alert.message : alert.messageAr}
                </p>

                {alert.actionLabel && (
                  <button
                    onClick={() => onAction?.(alert.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded border transition-colors"
                    style={{
                      background: 'white',
                      borderColor,
                      color: textColor,
                    }}
                  >
                    {lang === 'en' ? alert.actionLabel : alert.actionLabelAr}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
