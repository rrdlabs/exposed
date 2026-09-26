import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import CharityQueue from "@/components/CharityQueue";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Charity queue",
  robots: { index: false, follow: false },
};

export default async function AdminCharitiesPage() {
  if (!(await isAdmin())) redirect("/admin");

  const queue = await db
    .select({
      id: users.id,
      email: users.email,
      charityName: users.charityName,
      charityNumber: users.charityNumber,
      charityClaimed: users.charityClaimed,
      charityVerified: users.charityVerified,
      plan: users.plan,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.charityClaimed, true))
    .orderBy(desc(users.createdAt));

  const pending = queue.filter((u) => !u.charityVerified);
  const approved = queue.filter((u) => u.charityVerified);

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-neon">
        Operations
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-white">Charity queue</h1>
      <p className="mt-2 text-sm text-mist/70">
        {pending.length} awaiting review · {approved.length} approved
      </p>

      <div className="mt-8">
        <CharityQueue pending={pending} approved={approved} />
      </div>

      <p className="mt-10 border-t border-edge pt-6 text-sm text-mist/60">
        <Link href="/dashboard" className="underline underline-offset-4">
          Back to product
        </Link>
      </p>
    </main>
  );
}
