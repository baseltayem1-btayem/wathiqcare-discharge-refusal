import { redirect } from "next/navigation";

// /en redirects to the root homepage (EN is default language)
export default function EnPage() {
  redirect("/");
}

export const dynamic = "force-dynamic";
