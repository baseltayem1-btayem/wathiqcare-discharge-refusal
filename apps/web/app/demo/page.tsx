"use client";
import Link from "next/link";
import Image from "next/image";

export default function DemoPage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cyan-50 to-slate-100">
            <div className="flex flex-col items-center gap-6 p-8 rounded-2xl shadow-lg bg-white/90 border border-slate-200 max-w-lg">
                <Image src="/logo.svg" alt="WathiqCare Logo" width={80} height={80} className="mb-2" />
                <h1 className="text-2xl font-bold text-cyan-900">طلب تجربة النظام</h1>
                <p className="text-center text-slate-700 text-lg max-w-md">
                    يرجى التواصل معنا لتجربة منصة وثيق كير لإدارة رفض الخروج الطبي.
                </p>
                <a
                    href="mailto:demo@wathiqcare.online"
                    className="mt-4 px-8 py-3 rounded-xl bg-cyan-700 text-white text-lg font-semibold shadow hover:bg-cyan-800 transition"
                >
                    طلب تجربة
                </a>
                <Link href="/" className="text-cyan-700 underline mt-2">العودة للصفحة الرئيسية</Link>
            </div>
        </main>
    );
}
