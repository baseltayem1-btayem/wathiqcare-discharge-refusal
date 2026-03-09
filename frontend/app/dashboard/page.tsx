import { redirect } from "next/navigation";

// Route dashboard URL to the existing admin dashboard implementation.
export default function DashboardRedirectPage() {
  redirect("/admin");
}
