import { redirect } from "next/navigation";

// /ar redirects to root; the I18nProvider reads the wathiqcare_lang cookie
// which is set to "ar" by LanguageSwitcher when the user selects Arabic.
// Deep-linked /ar/* paths are handled by the rewrite in next.config.js.
export default function ArPage() {
  redirect("/");
}

export const dynamic = "force-dynamic";
