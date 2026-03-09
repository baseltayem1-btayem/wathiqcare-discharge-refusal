import { redirect } from "next/navigation";

// Backward-compatible route: old consents listing URL maps to cases list.
export default function ConsentsRedirectPage() {
  redirect("/cases");
}
