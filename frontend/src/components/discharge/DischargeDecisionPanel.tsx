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
      <h3 className="text-base font-semibold text-slate-900">Discharge Refusal Management</h3>
      <p className="mt-1 text-sm text-slate-600">Capture SHC-required discharge refusal decision and alternatives.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Discharge Status</span>
          <select
            value={dischargeStatus}
            onChange={(event) => onDischargeStatusChange(event.target.value as DischargeStatus)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="accept_discharge">Accept Discharge</option>
            <option value="refuse_discharge">Refuse Discharge</option>
          </select>
        </label>

        {dischargeStatus === "refuse_discharge" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Discharge Alternative</span>
            <select
              value={dischargeAlternative}
              onChange={(event) => onAlternativeChange(event.target.value as DischargeAlternative)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Select</option>
              <option value="home_care">Home Care</option>
              <option value="transfer_hospital">Transfer Hospital</option>
              <option value="financial_responsibility">Patient Accepts Financial Responsibility</option>
            </select>
          </label>
        ) : null}
      </div>
    </section>
  );
}
