"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

export default function LegalQueueNav() {
    const { lang } = useI18n();

    return (
        <nav className="mb-6">
            <ul className="flex gap-4">
                <li>
                    <Link href="/legal" className="text-blue-600 hover:underline">{lang === "ar" ? "الطابور القانوني" : "Legal Queue"}</Link>
                </li>
                <li>
                    <Link href="/cases" className="text-blue-600 hover:underline">{lang === "ar" ? "الحالات" : "Cases"}</Link>
                </li>
            </ul>
        </nav>
    );
}
