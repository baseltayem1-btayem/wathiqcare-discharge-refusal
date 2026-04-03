
"use client";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cyan-50 to-slate-100">
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl shadow-lg bg-white/90 border border-slate-200 max-w-lg">
        <Image src="/logo.svg" alt="WathiqCare Logo" width={80} height={80} className="mb-2" />
        <h1 className="text-3xl font-bold text-cyan-900">منصة وثيق كير لإدارة رفض الخروج الطبي</h1>
        <p className="text-center text-slate-700 text-lg max-w-md">
          نظام متكامل لإدارة حالات رفض الخروج الطبي، التوثيق القانوني، الأرشفة، مؤشرات الأداء، وتكامل الملف الطبي الإلكتروني.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/demo"
            className="px-8 py-3 rounded-xl bg-cyan-50 text-cyan-800 text-lg font-semibold border border-cyan-200 shadow hover:bg-cyan-100 transition text-center"
          >
            طلب تجربة النظام
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl bg-cyan-700 text-white text-lg font-semibold shadow hover:bg-cyan-800 transition text-center"
          >
            دخول المشتركين
          </Link>
        </div>
      </div>
      <footer className="mt-12 text-slate-400 text-xs">جميع الحقوق محفوظة © {new Date().getFullYear()} WathiqCare</footer>
    </main>
  );
}
