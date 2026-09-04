import { redirect } from "next/navigation";

export default function LegacyDashboardPage() {
  redirect("/modules/discharge-refusal/dashboard");
}
