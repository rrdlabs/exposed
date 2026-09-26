import type { Metadata } from "next";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Log in — Exposed",
  description: "Log in to your Exposed monitoring dashboard.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Only ever follow a same-app relative path. Anything absolute, protocol
  // relative, or otherwise shaped is discarded so this cannot be used as an
  // open redirect after login.
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") && !next.includes("..")
      ? next
      : undefined;

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-neon">Welcome back</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-white">Log in</h1>
          <p className="mt-2 text-sm text-mist">
            Pick up where your last scan left off.
          </p>

          <div className="mt-8">
            <AuthForm mode="login" redirectTo={safeNext} />
          </div>

          <p className="mt-8 text-center text-xs text-mist/50">
            <Link href="/" className="text-mist/70 underline underline-offset-4">
              Back to the free scan
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
