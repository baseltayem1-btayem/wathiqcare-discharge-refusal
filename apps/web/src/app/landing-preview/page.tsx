import type { Metadata } from "next";
import WathiqcareWhiteLanding from "@/components/landing/WathiqcareWhiteLanding";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "WathiqCare™ | Approved Landing Preview",
  description: "Preview of the approved WathiqCare white landing page.",
};

export default function LandingPreviewPage() {
  return <WathiqcareWhiteLanding lang="en" />;
}
