"use client";

import { useEffect, useRef, useState } from "react";
// Two imports on purpose. The value comes from /pure: the default entry injects
// the Stripe.js script from a bare `Promise.resolve().then()` at module scope,
// so merely importing this component made every visitor to the pricing page
// download ~270 KB from Stripe even while billing was unconfigured and
// loadStripe was never called. /pure loads nothing until loadStripe() is called.
//
// The type still has to come from the default entry, because /pure exports only
// the loader. An `import type` is erased at compile time, so naming the default
// entry here does not re-introduce the eager injection.
import { loadStripe } from "@stripe/stripe-js/pure";
import type { StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { apiFetch } from "@/lib/client/api";
import type { PlanId } from "@/lib/billing/plans";

// Inlined at build time by Next. Safe to ship to the browser: a publishable key
// may only create and read, and the client secret it is paired with can mount
// one checkout and nothing else.
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

/**
 * Stripe Embedded Checkout, mounted in a dialog over the pricing page.
 *
 * The parent renders this only while the dialog is open, so every open starts
 * from clean state and there is no reset effect to keep in sync.
 */
export default function EmbeddedCheckout({
  plan,
  onClose,
}: {
  plan: PlanId;
  onClose: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const checkout = useRef<StripeEmbeddedCheckout | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function mount() {
      if (!PUBLISHABLE_KEY) {
        setError(
          "Checkout is not configured yet. Email founder@rrdlabs.online and we will switch it on.",
        );
        return;
      }

      try {
        const stripe = await loadStripe(PUBLISHABLE_KEY);
        if (!stripe) throw new Error("Stripe.js failed to load.");
        if (cancelled || !container.current) return;

        // createEmbeddedCheckoutPage, not initEmbeddedCheckout. That older
        // initEmbeddedCheckout() + mount() pair was removed in stripe-js v9,
        // and the tutorials that still show it do not compile here. The options
        // and the mount/destroy lifecycle are otherwise unchanged.
        const instance = await stripe.createEmbeddedCheckoutPage({
          // fetchClientSecret rather than clientSecret: Stripe owns the pending
          // state while it resolves, so there is no blank form followed by a
          // pop-in, and the secret never sits in React state.
          fetchClientSecret: async () => {
            const body = await apiFetch<{ clientSecret: string }>("/api/billing/checkout", {
              method: "POST",
              body: JSON.stringify({ plan }),
            });
            return body.clientSecret;
          },
        });

        if (cancelled) {
          instance.destroy();
          return;
        }

        checkout.current = instance;
        instance.mount(container.current);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load checkout.");
      }
    }

    void mount();
    return () => {
      cancelled = true;
      // Destroying on unmount releases the Stripe iframe and the session.
      // Without it a closed dialog leaves an orphaned instance behind.
      checkout.current?.destroy();
      checkout.current = null;
    };
  }, [plan]);

  // Escape to close, and stop the page behind the dialog scrolling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-void/85 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        // Only a press that both starts and ends on the backdrop closes, so a
        // drag that began inside the form cannot dismiss it.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Checkout"
        tabIndex={-1}
        className="my-8 w-full max-w-lg rounded-xl border border-edge-strong bg-panel shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            Secure checkout
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="rounded p-1 text-mist/70 transition hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/*
          Stripe injects an iframe into this element, and mount() throws if the
          target has any existing child nodes. So the loading placeholder has to
          be a sibling, positioned over the top, not a child: putting it inside
          is the obvious thing to do and it fails at mount time with a message
          that does not obviously point at the placeholder.
        */}
        <div className="relative min-h-[400px]">
          <div ref={container} aria-busy={!ready} />

          {!ready && !error ? (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.16em] text-mist/60">
              Loading secure form…
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="border-t border-edge px-5 py-4 text-sm text-cyber-rose">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
