import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create an account — Exposed",
  description: "Start monitoring your attack surface daily with Exposed.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { domain } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-neon">Get started</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-white">
            Create an account
          </h1>
          <p className="mt-2 text-sm text-mist">
            Free accounts monitor one domain. Upgrade any time to watch it daily.
          </p>

          <div className="mt-8">
            <AuthForm mode="signup" defaultDomain={domain} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
