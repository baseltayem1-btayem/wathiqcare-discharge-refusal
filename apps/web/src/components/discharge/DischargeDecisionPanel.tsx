type DischargeStatus = "accept_discharge" | "refuse_discharge";
type DischargeAlternative = "home_care" | "transfer_hospital" | "financial_responsibility" | "";

type Props = {
  dischargeStatus: DischargeStatus;
  dischargeAlternative: DischargeAlternative;
  onDischargeStatusChange: (value: DischargeStatus) => void;
  onAlternativeChange: (value: DischargeAlternative) => void;
};

export default function DischargeDecisionPanel({
  dischargeStatus,
  dischargeAlternative,
  onDischargeStatusChange,
  onAlternativeChange,
}: Props) {
  return (
    <section className="md:col-span-2 rounded-xl border border-slate-300 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">إدارة رفض الخروج</h3>
      <p className="mt-1 text-sm text-slate-600">تسجيل قرار رفض الخروج والبدائل المطلوبة حسب إجراءات SHC.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">حالة الخروج</span>
          <select
            value={dischargeStatus}
            onChange={(event) => onDischargeStatusChange(event.target.value as DischargeStatus)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="accept_discharge">قبول الخروج</option>
            <option value="refuse_discharge">رفض الخروج</option>
          </select>
        </label>

        {dischargeStatus === "refuse_discharge" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">بديل الخروج</span>
            <select
              value={dischargeAlternative}
              onChange={(event) => onAlternativeChange(event.target.value as DischargeAlternative)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">اختر</option>
              <option value="home_care">رعاية منزلية</option>
              <option value="transfer_hospital">التحويل إلى مستشفى آخر</option>
              <option value="financial_responsibility">المريض يوافق على تحمل المسؤولية المالية</option>
            </select>
          </label>
        ) : null}
      </div>
    </section>
  );
}
