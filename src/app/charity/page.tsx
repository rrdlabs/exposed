import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Free monitoring for charities — Exposed",
  description:
    "Registered charities and nonprofits get continuous attack-surface monitoring from Exposed at no cost. Claim it with your registration number.",
};

export default function CharityPage() {
  return (
    <>
      <SiteHeader />
      <main className="relative flex-1">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-gold/10 blur-[140px]" />

        <div className="relative mx-auto max-w-4xl px-6 py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
            Tech for good
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Free monitoring for registered charities.
          </h1>

          <div className="mt-6 space-y-5 text-lg leading-relaxed text-mist">
            <p>
              Most charities are one phishing email and one unpatched WordPress install away from a
              real problem, with no budget line for security tooling. That is not a failing on your
              part. It is a gap in the market.
            </p>
            <p>
              So this is free for you. Same daily re-scans, same alerts, same history as a paid Solo
              account. Not a trial, not a discount that expires. Claim it and it stays on.
            </p>
            <p>
              It takes one form. Give us the registration number, we verify it by hand, and the
              account upgrades to Solo permanently. Usually under a day.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-xl border border-edge bg-void/60 p-7">
              <h2 className="font-display text-xl font-semibold text-white">Claim it</h2>
              <p className="mt-2 text-sm text-mist">
                Tick the charity box during signup and add your registration number.
              </p>
              <div className="mt-6">
                <Link
                  href="/signup"
                  className="block rounded-lg bg-gold py-3.5 text-center font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-void transition hover:bg-neon"
                >
                  Create your account
                </Link>
              </div>
              <p className="mt-4 text-xs text-mist/60">
                Already registered? Log in and reply to your welcome email, or just email{" "}
                <a
                  href="mailto:founder@rrdlabs.online"
                  className="text-gold underline underline-offset-4"
                >
                  founder@rrdlabs.online
                </a>{" "}
                with your number.
              </p>
            </div>

            <div className="rounded-xl border border-edge bg-panel/40 p-7">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">
                Who qualifies
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-mist">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-volt" />
                  Registered charities with a charity or nonprofit registration number.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-volt" />
                  Congregations, schools and community land trusts without a number — just ask.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-volt" />
                  One organisation, all of its domains, up to the Solo domain limit.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
