import { requirePageSessionOrRedirect } from "@/lib/server/pageAuth";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requirePageSessionOrRedirect("/reports");
  return children;
}