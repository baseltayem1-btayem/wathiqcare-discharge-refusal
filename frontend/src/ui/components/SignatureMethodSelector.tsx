import SignatureMethodCard from "@/ui/components/SignatureMethodCard";

export default function SignatureMethodSelector() {
  return (
    <section className="ui-panel p-4">
      <h3 className="text-base font-semibold text-[var(--ui-text)]">Signature Methods</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <SignatureMethodCard method="SMS OTP" strength="Medium" availability="Available" />
        <SignatureMethodCard method="Nafath" strength="Very High" availability="Limited" />
        <SignatureMethodCard method="Tablet Signature" strength="High" availability="Available" />
      </div>
    </section>
  );
}
