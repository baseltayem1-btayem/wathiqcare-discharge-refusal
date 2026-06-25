import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function WhiteLandingPreviewIndex() {
  redirect("/preview/white-landing/en");
}
