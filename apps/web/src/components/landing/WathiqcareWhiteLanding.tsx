"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Stethoscope,
  Users,
  ShieldCheck,
  Scale,
  HeartPulse,
  FileCheck2,
  Signature,
  Archive,
  Languages,
  Network,
  Hospital,
} from "lucide-react";

type WathiqcareWhiteLandingProps = {
  lang?: string;
};

const NAV_ITEMS = ["Home", "How It Works", "FAQ", "News", "Contact"];

const STAKEHOLDER_CARDS = [
  { title: "Health Facilities", Icon: Building2 },
  { title: "Doctors & Care Staff", Icon: Stethoscope },
  { title: "Patients & Their Families", Icon: Users },
];

const FOCUS_TILES = [
  { title: "Regulatory Compliance", Icon: ShieldCheck },
  { title: "Legal Protection", Icon: Scale },
  { title: "Human-Centered Patient Experience", Icon: HeartPulse },
  { title: "Security Assessment 100%", Icon: ShieldCheck },
];

const CONSENT_FEATURES = [
  { title: "Consent Editing in Seconds", Icon: FileCheck2 },
  { title: "Digital Signature via Nafaz", Icon: Signature },
  { title: "Smart Archiving Solutions", Icon: Archive },
  { title: "Strong Legal & Medical Foundation", Icon: Scale },
  { title: "Multilingual Tech Solution", Icon: Languages },
  { title: "Integrates with Hospital Systems", Icon: Network },
];

export default function WathiqcareWhiteLanding({
  lang = "en",
}: WathiqcareWhiteLandingProps) {
  const routePrefix = lang ? `/${lang}` : "";

  return (
    <main className="landing-root bg-white text-[#07111F]">
      <section className="hero relative min-h-[84vh] overflow-hidden">
        <Image
          src="/images/demo-hero.jpg"
          alt="Healthcare professionals collaborating in a clinical environment"
          fill
          priority
          loading="eager"
          sizes="100vw"
          className="object-cover"
        />
        <div className="hero-overlay absolute inset-0" />

        <div className="relative z-10 mx-auto flex min-h-[84vh] w-full max-w-7xl flex-col px-6 pb-16 pt-6 md:px-10">
          <header className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between md:items-center md:gap-5">
            <Image
              src="/images/wathiqcare-logo.png"
              alt="WathiqCare"
              width={460}
              height={130}
              priority
              className="h-auto w-auto shrink-0 object-contain brightness-0 invert max-w-[280px] max-h-[84px] sm:max-w-[300px] sm:max-h-[90px] md:max-w-[430px] md:max-h-[128px] lg:max-w-[520px] lg:max-h-[156px]"
            />

            <nav className="hidden items-center gap-4 text-xs font-medium text-white/95 2xl:flex">
              {NAV_ITEMS.map((item) => (
                <a key={item} href="#" className="transition hover:text-white">
                  {item}
                </a>
              ))}
            </nav>

            <Link
              href={`${routePrefix}/contact`}
              className="self-end rounded-lg border border-white/35 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:self-auto sm:px-4 sm:text-sm"
            >
              Get in Touch
            </Link>
          </header>

          <div className="my-auto max-w-3xl pt-14 md:pt-10">
            <h1 className="font-[Manrope,Inter,system-ui,sans-serif] text-4xl font-extrabold leading-tight text-white md:text-6xl">
              Human-Centered Informed Consent, Legally Protected Care.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90 md:text-xl">
              A Smart Digital Platform for Informed Consent and Medical
              Authorization in Saudi Arabia.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`${routePrefix}/request-demo`}
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#075061] shadow-lg transition hover:bg-slate-100"
              >
                Get started now
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-white/35 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Learn more information
              </a>
            </div>

            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm text-white/90">
              <span className="font-semibold">Trusted by industry experts</span>
              <span className="h-1 w-1 rounded-full bg-white/80" />
              <span className="font-bold">4.9</span>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-[linear-gradient(90deg,#0B5A70_0%,#2596BE_100%)] px-6 py-8 text-white md:px-10">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 text-center md:grid-cols-4 md:text-left">
          <div className="text-lg font-bold">Why To Choose WathiqCare?</div>
          <div className="text-sm font-semibold">100% Secure Data Handling</div>
          <div className="text-sm font-semibold">99.9% System Reliability</div>
          <div className="text-sm font-semibold">0 Security Breaches</div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 md:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <h2 className="text-3xl font-extrabold text-[#07111F] md:text-4xl">
            Designed for Every Stakeholder in the Healthcare Journey
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-[#4B5563]">
            An advanced medical platform that leverages technology to streamline
            clinical workflows, enhance patient engagement, and enable
            data-driven healthcare decisions with confidence.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:col-span-8">
              {STAKEHOLDER_CARDS.map(({ title, Icon }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#0B5A70_0%,#2596BE_100%)] p-6 text-white shadow-[0_14px_28px_rgba(7,80,97,0.2)]"
                >
                  <Icon className="h-7 w-7 text-white" />
                  <h3 className="mt-4 text-lg font-bold">{title}</h3>
                </article>
              ))}
            </div>

            <article className="rounded-2xl bg-[linear-gradient(180deg,#075061_0%,#2596BE_100%)] p-7 text-white shadow-[0_18px_36px_rgba(7,80,97,0.24)] lg:col-span-4">
              <Hospital className="h-8 w-8" />
              <h3 className="mt-4 text-2xl font-extrabold leading-snug">
                Where Privacy Meets Performance Excellence
              </h3>
              <p className="mt-3 text-sm leading-7 text-white/90">
                Built to protect patient autonomy while accelerating clinical and
                legal workflows across modern care environments.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white px-6 py-20 md:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <h2 className="text-3xl font-extrabold text-[#07111F] md:text-4xl">
            What We Focus On
          </h2>
          <p className="mt-4 max-w-5xl text-base leading-8 text-[#4B5563]">
            We focus on delivering safer, more human-centered healthcare through
            strict regulatory compliance with PDPL and Saudi Ministry of Health
            standards, strong legal protection for healthcare providers through
            transparent documentation, and a patient-first experience that
            respects privacy, autonomy, and informed decision-making.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            {FOCUS_TILES.map(({ title, Icon }) => (
              <article
                key={title}
                className="relative overflow-hidden rounded-2xl border border-[#2596BE]/20"
              >
                <Image
                  src="/images/demo-hero.jpg"
                  alt={title}
                  width={1100}
                  height={500}
                  className="h-52 w-full object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,31,0.72),rgba(37,150,190,0.38))]" />
                <div className="absolute inset-0 flex items-end p-6">
                  <div className="flex items-center gap-3 text-white">
                    <Icon className="h-6 w-6" />
                    <h3 className="text-lg font-bold">{title}</h3>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 md:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <h2 className="text-3xl font-extrabold text-[#07111F] md:text-4xl">
            Consent Made Simple, Secure, and Smart
          </h2>
          <p className="mt-4 max-w-5xl text-base leading-8 text-[#4B5563]">
            Our platform streamlines the creation, digital signing, and secure
            archiving of patient consent forms with full legal compliance,
            offering a bilingual interface that ensures clarity for patients and
            seamless integration with hospital systems to enhance workflow and
            safety.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CONSENT_FEATURES.map(({ title, Icon }) => (
              <article
                key={title}
                className="rounded-2xl bg-[linear-gradient(180deg,#0B5A70_0%,#2596BE_100%)] p-6 text-white shadow-[0_14px_28px_rgba(7,80,97,0.2)]"
              >
                <Icon className="h-6 w-6" />
                <h3 className="mt-4 text-lg font-bold leading-snug">{title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 md:px-10">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="grid grid-cols-2 gap-3 lg:col-span-5">
            <article className="overflow-hidden rounded-2xl border border-[#2596BE]/20 bg-white p-3 shadow-sm">
              <Image
                src="/images/demo-hero.jpg"
                alt="Healthcare collaboration"
                width={700}
                height={500}
                className="h-40 w-full rounded-xl object-cover"
              />
            </article>
            <article className="overflow-hidden rounded-2xl border border-[#2596BE]/20 bg-white p-3 shadow-sm">
              <Image
                src="/images/imc-logo.png"
                alt="International Medical Center"
                width={500}
                height={500}
                className="h-40 w-full rounded-xl bg-white object-contain p-5"
              />
            </article>
          </div>

          <div className="lg:col-span-7">
            <h2 className="text-3xl font-extrabold text-[#07111F] md:text-4xl">
              Our Partners
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[#4B5563]">
              Our platform thrives on a strong partnership between legal experts
              and tech innovators, ensuring secure, compliant, and
              patient-focused healthcare solutions tailored for the medical
              sector.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-[#2596BE]/18 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[#07111F]">
                  Dar Al Meethaq Law Firm
                </h3>
              </article>
              <article className="rounded-2xl border border-[#2596BE]/18 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[#07111F]">Tayem & Co</h3>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(90deg,#0B5A70_0%,#2596BE_100%)] px-6 py-16 md:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-5 text-center md:flex-row md:text-left">
          <h2 className="text-3xl font-extrabold text-white md:text-4xl">
            Ready to Transform Your Consent Process?
          </h2>
          <Link
            href={`${routePrefix}/request-demo`}
            className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#075061] transition hover:bg-slate-100"
          >
            Get Started Now
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#2596BE]/20 bg-white px-6 py-14 md:px-10">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="relative h-10 w-44">
              <Image
                src="/images/wathiqcare-logo.png"
                alt="WathiqCare"
                fill
                sizes="176px"
                className="object-contain"
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#07111F]">Quick Links</h4>
            <ul className="mt-3 space-y-2 text-sm text-[#4B5563]">
              <li>Home</li>
              <li>How It Works</li>
              <li>FAQ</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#07111F]">Resources</h4>
            <ul className="mt-3 space-y-2 text-sm text-[#4B5563]">
              <li>News</li>
              <li>Insights</li>
              <li>Support</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#07111F]">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm text-[#4B5563]">
              <li>Contact</li>
              <li>Privacy</li>
              <li>Terms</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 w-full max-w-7xl border-t border-[#2596BE]/16 pt-5 text-sm text-[#4B5563]">
          <p>© 2026 WathiqCare. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
