import Image from "next/image";
import { OTP_PAGE_BRANDING } from "@/lib/branding/otp-page-branding";

type OtpVerificationBrandingProps = {
  children?: React.ReactNode;
  className?: string;
};

export function OtpVerificationBranding({
  className = "",
  children,
}: OtpVerificationBrandingProps) {
  return (
    <div className={`otp-verification-branding relative flex min-h-full w-full flex-col overflow-hidden ${className}`}>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.12),transparent_38%),linear-gradient(180deg,#f8fbff_0%,#f5f7fb_45%,#eef3f8_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-white/80 to-transparent" />

      <header className="otp-header flex items-center justify-center pt-4">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/88 px-8 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <Image
            src={OTP_PAGE_BRANDING.header.imcLogoSrc}
            alt={OTP_PAGE_BRANDING.header.imcLogoAlt}
            width={220}
            height={78}
            priority
            className="imc-logo h-auto w-auto max-h-16 object-contain"
          />
        </div>
      </header>

      {children ? <div className="flex-1">{children}</div> : null}

      <footer
        dir="ltr"
        className="otp-footer mt-10 flex items-center justify-center gap-3 pb-4"
      >
        <span className="secured-by-label text-sm font-medium tracking-[0.18em] text-slate-500 uppercase">
          {OTP_PAGE_BRANDING.footer.securedByLabel}
        </span>

        <Image
          src={OTP_PAGE_BRANDING.footer.wathiqCareLogoSrc}
          alt={OTP_PAGE_BRANDING.footer.wathiqCareLogoAlt}
          width={192}
          height={48}
          className="wathiqcare-logo h-auto w-auto max-h-12 object-contain"
        />
      </footer>
    </div>
  );
}
