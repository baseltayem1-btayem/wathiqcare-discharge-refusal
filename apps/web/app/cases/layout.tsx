import { requirePageSessionOrRedirect } from "@/lib/server/pageAuth";

export default async function CasesLayout({ children }: { children: React.ReactNode }) {
  await requirePageSessionOrRedirect("/cases");
  return children;
}