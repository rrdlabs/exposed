"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function AuthForm({
  mode,
  defaultDomain,
  redirectTo,
}: {
  mode: "login" | "signup";
  defaultDomain?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [domain, setDomain] = useState(defaultDomain ?? "");
  const [isCharity, setIsCharity] = useState(false);
  const [charityName, setCharityName] = useState("");
  const [charityNumber, setCharityNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          domain,
          charity: isCharity,
          charityName,
          charityNumber,
        }),
      });

      const body = (await res.json()) as { error?: string; redirect?: string };

      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }

      router.push(redirectTo ?? body.redirect ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-edge-strong bg-panel/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-mist/40 focus:border-neon/60 focus:ring-2 focus:ring-neon/20";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-mist/70">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-mist/70">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? 10 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder={isSignup ? "At least 10 characters" : "••••••••••"}
        />
      </div>

      {isSignup ? (
        <>
          <div>
            <label htmlFor="domain" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-mist/70">
              Domain to monitor
            </label>
            <input
              id="domain"
              type="text"
              required
              spellCheck={false}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className={inputClass}
              placeholder="yourdomain.com"
            />
          </div>

          <div className="rounded-lg border border-edge bg-panel/30 p-4">
            <label className="flex items-start gap-3 text-sm text-mist">
              <input
                type="checkbox"
                checked={isCharity}
                onChange={(e) => setIsCharity(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#ecaf3e]"
              />
              <span>
                We are a registered charity or nonprofit — apply for free monitoring.
              </span>
            </label>

            {isCharity ? (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={charityName}
                  onChange={(e) => setCharityName(e.target.value)}
                  className={inputClass}
                  placeholder="Organisation name"
                  aria-label="Organisation name"
                />
                <input
                  type="text"
                  value={charityNumber}
                  onChange={(e) => setCharityNumber(e.target.value)}
                  className={inputClass}
                  placeholder="Registration number"
                  aria-label="Registration number"
                />
                <p className="text-xs text-mist/60">
                  Verified by hand, usually within a day. Until then you are on the free plan.
                </p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {error ? (
        <p className="rounded-md border border-cyber-rose/40 bg-cyber-rose/10 px-4 py-3 text-sm text-cyber-rose">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-neon py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-void transition hover:bg-volt disabled:opacity-50"
      >
        {busy ? "Working" : isSignup ? "Create account" : "Log in"}
      </button>

      <p className="text-center text-sm text-mist/70">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-neon underline underline-offset-4">
              Log in
            </Link>
          </>
        ) : (
          <>
            No account yet?{" "}
            <Link href="/signup" className="text-neon underline underline-offset-4">
              Start free
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
