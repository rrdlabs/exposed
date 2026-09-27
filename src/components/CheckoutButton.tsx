"use client";

import { useState } from "react";
import EmbeddedCheckout from "./EmbeddedCheckout";

export default function CheckoutButton({
  plan,
  label,
  featured = false,
}: {
  plan: "solo" | "pro";
  label: string;
  featured?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full rounded-lg py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition ${
          featured
            ? "bg-neon text-void hover:bg-volt"
            : "border border-edge-strong bg-panel/60 text-white hover:border-neon/60 hover:text-neon"
        }`}
      >
        {label}
      </button>

      {open ? <EmbeddedCheckout plan={plan} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
