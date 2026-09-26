import Link from "next/link";
import { Wordmark } from "./SiteHeader";

const year = new Date().getFullYear();

export default function SiteFooter() {
  return (
    <footer className="border-t border-edge bg-abyss/70">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-mist/80">
              Continuous attack-surface monitoring for small teams. Built in-house by
              rrdlabs.online.
            </p>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">Product</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/#how" className="text-sm text-mist/80 transition hover:text-white">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-mist/80 transition hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/charity" className="text-sm text-mist/80 transition hover:text-white">
                  Free for charities
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">Legal</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/terms" className="text-sm text-mist/80 transition hover:text-white">
                  Terms of service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-mist/80 transition hover:text-white">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">Elsewhere</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href="https://rrdlabs.online"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-mist/80 transition hover:text-white"
                >
                  rrdlabs.online
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/rrdlabs/exposed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-mist/80 transition hover:text-white"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="mailto:founder@rrdlabs.online"
                  className="text-sm text-mist/80 transition hover:text-white"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-edge pt-6 sm:flex-row sm:items-center">
          <p className="font-mono text-[11px] text-mist/60">
            © {year} Exposed · an rrdlabs.online product
          </p>
          <p className="font-mono text-[11px] text-mist/60">
            Passive monitoring only. <span className="text-neon">We never attack.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
