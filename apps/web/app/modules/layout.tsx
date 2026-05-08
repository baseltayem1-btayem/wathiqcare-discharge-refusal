import { requirePageSessionOrRedirect } from "@/lib/server/pageAuth";

export default async function ModulesLayout({ children }: { children: React.ReactNode }) {
  await requirePageSessionOrRedirect("/modules");
  return children;
}