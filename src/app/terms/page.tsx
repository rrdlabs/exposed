import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Terms of service — Exposed",
  description: "Terms of service for Exposed, an rrdlabs.online product.",
};

const SECTIONS = [
  {
    h: "1. What this service does",
    p: [
      "Exposed performs passive, read-only monitoring of the public footprint of domains you register with us. For each domain it reads public Certificate Transparency logs, public DNS records, completes a normal TLS handshake, and requests ordinary web pages to inspect response headers.",
      "Exposed does not port scan, brute force credentials, fuzz inputs, send payloads, exploit vulnerabilities, or access any system that is not publicly responding to a standard request. If you want that, you want a different product and probably a pentest engagement with written authorisation.",
    ],
  },
  {
    h: "2. Your authorisation to monitor a domain",
    p: [
      "You represent and warrant that you own the domain you submit, or that you have the express written authorisation of its owner to monitor it. Unauthorised monitoring is a legal problem for you, not for us, and we will cooperate with lawful requests to identify the source of abusive traffic.",
      "We may ask you to verify ownership by adding a DNS TXT record or a file under /.well-known/. We may suspend or terminate any account where we have reasonable grounds to believe it is unauthorised.",
    ],
  },
  {
    h: "3. Acceptable use",
    p: [
      "Do not use Exposed to monitor a domain you are not authorised to monitor. Do not use the findings to attack any system. Findings describe publicly observable weaknesses; acting on them against a third party is your responsibility and your legal exposure.",
      "Automated access to Exposed itself must stay reasonable. The anonymous free scan is rate limited, and circumvention of that limit is a breach of these terms.",
    ],
  },
  {
    h: "4. Plans, billing and cancellation",
    p: [
      "Paid subscriptions are billed monthly in advance through Lemon Squeezy, who acts as merchant of record and collects and remits any applicable sales tax or VAT. Prices are shown in Canadian dollars unless stated otherwise.",
      "You can cancel at any time from the billing portal. Cancellation takes effect at the end of the period you have already paid for; we do not pro-rate partial months. Accounts that lapse return to the free tier and retain their scan history.",
      "Refunds are discretionary and handled by the founder. If a scan is systematically broken for a plan tier, tell us and we will make it right.",
    ],
  },
  {
    h: "5. Charity monitoring",
    p: [
      "Registered charities and nonprofit organisations receive free monitoring at the Solo tier. We verify the registration number by hand and may revoke free status if a claim cannot be substantiated or if it is used for an unauthorised domain. Free charity monitoring is a standing offer, not a contract, and can be changed with notice.",
    ],
  },
  {
    h: "6. Availability and data",
    p: [
      "Exposed is provided as is, with no guarantee of uptime, scan frequency or accuracy. Findings are derived from public sources that can be incomplete, stale or wrong. A clean report is not a security assessment and is not evidence that a domain is secure.",
      "We store the domains you monitor, the findings we produce, and the scan history required to diff consecutive scans. Free anonymous scans are stored for a limited period. We do not sell data and we do not run third-party advertising or analytics trackers on this site.",
    ],
  },
  {
    h: "7. Liability",
    p: [
      "To the maximum extent permitted by law, the liability of rrdlabs.online and its operator for any loss arising from use of Exposed is limited to the amount you paid us in the twelve months preceding the event giving rise to the claim. We are not liable for indirect, incidental, consequential or reputational loss, or for lost profits or lost data.",
      "Nothing in these terms excludes liability that cannot lawfully be excluded.",
    ],
  },
  {
    h: "8. Changes and contact",
    p: [
      "We may update these terms. Material changes will be announced in the product or by email to paying accounts before they take effect. Continuing to use Exposed after a change means you accept the revised terms.",
      "Questions go to founder@rrdlabs.online. Exposed is a product of Ranger-Andrews Research & Development, operating as rrdlabs.online.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-neon">Legal</p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white">
            Terms of service
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
            <Link href="/privacy" className="text-neon underline underline-offset-4">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
