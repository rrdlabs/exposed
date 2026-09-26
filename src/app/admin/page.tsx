import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/admin";
import AdminLoginForm from "@/components/AdminLoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin — Exposed",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ out?: string }>;
}) {
  if (await isAdmin()) redirect("/admin/charities");

  const { out } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-6 py-20">
      <div className="w-full max-w-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-neon">Operations</p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-white">Admin access</h1>
        <p className="mt-2 text-sm text-mist/70">
          Enter the admin token. This page is not linked from the product.
        </p>

        {out === "1" ? (
          <p className="mt-4 rounded-lg border border-cyber-rose/30 bg-cyber-rose/5 px-4 py-3 text-sm text-cyber-rose">
            Wrong token.
          </p>
        ) : null}

        <div className="mt-6">
          <AdminLoginForm />
        </div>

        <p className="mt-8 text-sm text-mist/60">
          <Link href="/" className="underline underline-offset-4">
            Back to Exposed
          </Link>
        </p>
      </div>
    </main>
  );
}
