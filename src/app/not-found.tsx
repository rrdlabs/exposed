import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="max-w-lg text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyber-rose">
            404
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold text-white">
            Nothing here but an open port.
          </h1>
          <p className="mt-4 leading-relaxed text-mist">
            That page does not exist. Reports also expire from the anonymous store after a while, so
            an old report link may have been cleaned up.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-lg bg-neon px-6 py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-void transition hover:bg-volt"
            >
              Scan a domain
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-edge-strong bg-panel/60 px-6 py-3.5 font-mono text-[12px] uppercase tracking-[0.12em] text-white transition hover:border-neon/60 hover:text-neon"
            >
              See pricing
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
