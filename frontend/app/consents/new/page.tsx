import { redirect } from "next/navigation";

// Backward-compatible route: old consent creation URL now maps to case creation.
export default function NewConsentRedirectPage() {
  redirect("/cases/new");
}
