import { redirect } from "next/navigation";

// Backward-compatible route: old dashboard URL maps to home dashboard.
export default function DashboardRedirectPage() {
  redirect("/");
}
