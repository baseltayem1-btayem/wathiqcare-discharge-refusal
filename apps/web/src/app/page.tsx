import WathiqcareWhiteLanding from "@/components/landing/WathiqcareWhiteLanding";
import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "WathiqCare™ | Human-Centered Informed Consent, Legally Protected Care",
  description:
    "A smart digital platform for informed consent and medical authorization in Saudi Arabia. Powered by WathiqCare in partnership with IMC.",
};

export default function HomePage() {
  return <WathiqcareWhiteLanding />;
}
