"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import LoginBrandPanel from "@/components/login/LoginBrandPanel";
import PasswordField from "@/components/login/PasswordField";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuthSession, useLoginMutation } from "@/lib/hooks/use-auth";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    tenantCode: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const { t, isRtl } = useI18n();
    const { status } = useAuthSession();
    const loginMutation = useLoginMutation();

    function resolveNextPath() {
        if (typeof window === "undefined") {
            return "/dashboard";
        }

        return new URLSearchParams(window.location.search).get("next") || "/dashboard";
    }

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email:
                process.env.NODE_ENV === "development" &&
                    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN_PREFILL === "true"
                    ? "admin@wathiqcare.local"
                    : "",
            password:
                process.env.NODE_ENV === "development" &&
                    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN_PREFILL === "true"
                    ? "Admin@12345"
                    : "",
            tenantCode: "",
        },
    });

    useEffect(() => {
        if (status === "authenticated") {
            const nextPath = resolveNextPath();
            router.replace(nextPath);
        }
    }, [status, router]);

    async function onSubmit(values: LoginFormValues) {
        await loginMutation.mutateAsync({
            email: values.email,
            password: values.password,
            tenantCode: values.tenantCode?.trim() || undefined,
        });

        const nextPath = resolveNextPath();
        router.push(nextPath);
    }

    return (
        <main
            className="min-h-screen"
            style={{ background: "linear-gradient(160deg, #f0fdff 0%, #f5f7fa 60%, #e0f2fe 100%)" }}
        >
            <div style={{ height: "3px", background: "linear-gradient(90deg, #0891b2, #06b6d4, #0891b2)" }} />

            <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
                <div className="mb-4 flex items-center justify-end">
                    <LanguageSwitcher className="bg-white/95" />
                </div>

                <section
                    className="overflow-hidden rounded-2xl"
                    style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 8px 32px rgba(8,145,178,0.10), 0 2px 8px rgba(0,0,0,0.06)",
                    }}
                >
                    <div className="grid gap-0 lg:grid-cols-[1fr_1.1fr]">
                        <div
                            className="border-b p-5 md:p-7 lg:border-b-0 lg:border-e"
                            style={{ background: "#f0fdff", borderColor: "#e0f2fe" }}
                        >
                            <LoginBrandPanel />
                        </div>

                        <div className="p-5 md:p-7 lg:p-9" dir={isRtl ? "rtl" : "ltr"}>
                            <div
                                className="mx-auto w-full max-w-xl rounded-2xl p-5 md:p-6"
                                style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
                            >
                                <div className="mb-5 flex justify-center">
                                    <div className="relative w-[160px] sm:w-[190px] md:w-[210px]">
                                        <Image
                                            src="https://cdn.phototourl.com/uploads/2026-03-08-8e081936-6059-4849-a3de-b482e86049fd.png"
                                            alt="WathiqCare"
                                            width={420}
                                            height={120}
                                            className="h-auto w-full object-contain"
                                            priority
                                        />
                                    </div>
                                </div>

                                <h2 className="text-xl font-bold text-gray-900">{t("login.formTitle")}</h2>
                                <p className="mt-1.5 text-sm text-gray-500">{t("login.formSubtitle")}</p>

                                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
                                    <div>
                                        <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-gray-700">
                                            {t("login.email")}
                                        </label>
                                        <input
                                            id="login-email"
                                            className="w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2"
                                            style={{ borderColor: "#cbd5e1" }}
                                            autoComplete="email"
                                            disabled={loginMutation.isPending}
                                            {...form.register("email")}
                                        />
                                        {form.formState.errors.email ? (
                                            <p className="mt-1 text-xs text-red-700">{form.formState.errors.email.message}</p>
                                        ) : null}
                                    </div>

                                    <PasswordField
                                        id="login-password"
                                        label={t("login.password")}
                                        value={form.watch("password") || ""}
                                        showPassword={false}
                                        isDisabled={loginMutation.isPending}
                                        showLabel={t("login.showPassword")}
                                        hideLabel={t("login.hidePassword")}
                                        onChange={(value) => form.setValue("password", value, { shouldValidate: true })}
                                        onToggleVisibility={() => undefined}
                                    />
                                    {form.formState.errors.password ? (
                                        <p className="-mt-2 text-xs text-red-700">{form.formState.errors.password.message}</p>
                                    ) : null}

                                    <div>
                                        <label htmlFor="tenant-code" className="mb-1 block text-sm font-medium text-gray-700">
                                            Tenant Code (optional)
                                        </label>
                                        <input
                                            id="tenant-code"
                                            className="w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2"
                                            style={{ borderColor: "#cbd5e1" }}
                                            autoComplete="organization"
                                            disabled={loginMutation.isPending}
                                            {...form.register("tenantCode")}
                                        />
                                    </div>

                                    {loginMutation.error ? (
                                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                            {loginMutation.error.message}
                                        </div>
                                    ) : null}

                                    <button
                                        type="submit"
                                        disabled={loginMutation.isPending}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                        style={{
                                            background: "linear-gradient(135deg, #0891b2, #06b6d4)",
                                            boxShadow: "0 4px 14px rgba(8,145,178,0.28)",
                                        }}
                                    >
                                        <LogIn className="h-4 w-4" />
                                        {loginMutation.isPending ? t("login.submitting") : t("login.submit")}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
