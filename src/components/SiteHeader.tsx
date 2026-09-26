import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-md border border-neon/40 bg-neon/10 font-mono text-sm font-bold text-neon">
        E
      </span>
      <span className="font-mono text-sm tracking-tight text-mist">
        exposed
        <span className="text-neon">.</span>
      </span>
    </Link>
  );
}

export default function SiteHeader({
  authenticated = false,
}: {
  authenticated?: boolean;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Wordmark />

        <nav className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.14em]">
          <Link href="/pricing" className="hidden text-mist transition hover:text-white sm:block">
            Pricing
          </Link>
          <Link href="/#how" className="hidden text-mist transition hover:text-white sm:block">
            How it works
          </Link>
          <Link href="/charity" className="hidden text-mist transition hover:text-white sm:block">
            Charities
          </Link>

          {authenticated ? (
            <>
              <Link href="/dashboard" className="text-mist transition hover:text-white">
                Dashboard
              </Link>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-md border border-edge-strong bg-panel/60 px-4 py-2 font-semibold text-white transition hover:border-neon/60 hover:text-neon"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-mist transition hover:text-white">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-neon px-4 py-2 font-semibold text-void transition hover:bg-volt"
              >
                Start free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
