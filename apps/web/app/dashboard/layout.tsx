import { requirePageSessionOrRedirect } from "@/lib/server/pageAuth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requirePageSessionOrRedirect("/dashboard");
  return children;
}