"use client";

import WathiqcareRequestDemoPage from "@/components/request-demo/WathiqcareRequestDemoPage";
import { useI18n } from "@/i18n/I18nProvider";
import { useEffect, useState } from "react";

export const dynamic = "force-static";

export default function RequestDemoPage() {
  const { lang } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by rendering the server-safe default locale
  // (en) on first paint, then switching to the user's persisted locale
  // after mount.
  const effectiveLang = mounted ? lang : "en";

  return <WathiqcareRequestDemoPage lang={effectiveLang} />;
}
