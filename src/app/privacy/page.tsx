import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Privacy — Exposed",
  description: "What Exposed stores, for how long, and what it deliberately does not do.",
};

const SECTIONS = [
  {
    h: "The short version",
    p: [
      "We store the minimum needed to diff one scan against the next. We do not sell anything, we do not run advertising trackers, and there is no third-party analytics script anywhere on this site.",
    ],
  },
  {
    h: "What we store",
    p: [
      "Account data: your email address, a scrypt hash of your password, your plan, your Lemon Squeezy customer and subscription identifiers, and if you claimed charity status, your organisation name and registration number.",
      "Monitoring data: the domains you register, each scan's findings, and the raw snapshot of the previous scan so we can compute what changed. Session records with an expiry so you stay logged in.",
      "Billing: handled entirely by Lemon Squeezy as merchant of record. Card numbers never reach our servers and we never see them.",
      "Anonymous free scans: the domain, the findings, and a one-way salted hash of your IP address used only to rate limit. We cannot reverse the hash back to an address, and the hash is discarded along with the scan.",
    ],
  },
  {
    h: "What we deliberately do not do",
    p: [
      "No third-party analytics, no advertising pixels, no session recording, no fingerprinting. The only outbound requests this service makes are to public DNS resolvers, to crt.sh, and to the domain you asked us to monitor.",
    ],
  },
  {
    h: "Who we share it with",
    p: [
      "Our hosting provider, which stores the database on disk, and our email provider, which sends alert messages to the address on the account. Our payment processor, which receives the minimum needed to bill you. Nobody else.",
      "We will disclose data if we receive a lawful request. We will tell you, unless we are legally prevented from doing so.",
    ],
  },
  {
    h: "Retention and deletion",
    p: [
      "Scan history is retained while your account is active. Deleting a monitored domain removes its findings and snapshots. Deleting your account removes your user record, and cascades to your domains, findings and sessions.",
      "Anonymous free scans are retained for a short operational period so report links keep working, then deleted. Ask us and we will delete yours immediately.",
    ],
  },
  {
    h: "Your rights",
    p: [
      "You can request a copy of your data, correct it, or have it deleted by emailing founder@rrdlabs.online. We will action it. If you are in the EEA or UK you also have the statutory rights of access, rectification, erasure, restriction and portability, and you may complain to your supervisory authority.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-neon">Legal</p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white">
            Privacy
          </h1>
          <p className="mt-3 font-mono text-[12px] text-mist/70">
            Last updated {new Date().getUTCFullYear()} · Exposed, an rrdlabs.online product
          </p>

          <div className="mt-12 space-y-10">
            {SECTIONS.map((section) => (
              <section key={section.h}>
                <h2 className="font-display text-xl font-semibold text-white">{section.h}</h2>
                {section.p.map((para) => (
                  <p key={para.slice(0, 40)} className="mt-3 leading-relaxed text-mist">
                    {para}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <p className="mt-14 border-t border-edge pt-6 text-sm text-mist/60">
            See also the{" "}
            <Link href="/terms" className="text-neon underline underline-offset-4">
              terms of service
            </Link>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
