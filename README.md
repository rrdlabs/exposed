# Exposed

Continuous attack-surface monitoring for a domain, as a subscription.

Exposed re-reads the public footprint of a domain every day — Certificate
Transparency logs, public DNS records, the TLS handshake, and ordinary HTTP
response headers — and emails you when any of it changes.

It is deliberately **passive**. It reads what the internet already publishes.
It does not port scan, brute force, fuzz, send payloads, or touch anything that
is not publicly answering a standard request. That is a product decision, not a
limitation: it is what makes the service legal to offer as a self-serve product
to strangers, and it is what makes the findings trustworthy.

Live at **https://rrdlabs.online/exposed/**

---

## How it works

1. Someone enters a domain. Anonymous, no account, rate limited by IP.
2. The scanner runs four collectors against public sources only:
   - `crt.sh` for names in Certificate Transparency logs
   - DNS-over-HTTPS for records, nameservers, and dangling delegations
   - a real TLS handshake for chain, validity, and protocol support
   - one HTTP request per host for `http://` and `https://` response headers
3. Rules turn the snapshot into findings with a stable fingerprint each.
4. Findings are compared against the previous scan, so a subscriber is only
   alerted about what is *new*. A finding that merely persists does not re-alert.
5. Anonymous results are stored behind an unguessable token, so the report link
   survives a restart and can be shared.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) | mounted at `/exposed` on the existing nginx vhost |
| Database | SQLite via `@libsql/client` + Drizzle ORM | `better-sqlite3` falls back to a source build on this 1 vCPU box and hangs |
| Scans | separate PM2 worker process | a web restart can never interrupt a scan mid-flight |
| Billing | Stripe Embedded Checkout | form mounts in-page, so no redirect off the site to enter a card |
| Email | Resend | alerts only; no analytics anywhere in the product |

## Local setup

```bash
npm ci
cp .env.example .env.local     # then fill in SESSION_SECRET, ADMIN_TOKEN, ...
npm run db:generate            # only after editing src/lib/db/schema.ts
npm run dev
```

The database is created and migrated automatically on first boot by
`src/instrumentation.ts`. You do not need to run migrations by hand for local
work.

To verify the scanner against a real domain without the app:

```bash
npm run probe -- rrdlabs.online
```

## Production

Two processes, both rooted at the project directory:

```bash
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

`ecosystem.config.cjs` defines `exposed-web` (Next on port 3101) and
`exposed-worker` (the scan queue). nginx proxies `/exposed/` to
`127.0.0.1:3101`; see the vhost at `/etc/nginx/sites-available/rrdlabs-online`.

Memory note: this host has 1 vCPU and 1.9 GiB of RAM. The build needs
`NODE_OPTIONS=--max-old-space-size=1536` and adequate swap, or it will be
OOM-killed during the TypeScript step.

## Environment

See `.env.example`. The two that are genuinely required:

- `SESSION_SECRET` — signs session cookies. Rotating it logs everyone out.
- `ADMIN_TOKEN` — grants access to `/admin`.

### Stripe

Billing is inert until these are set; nothing fails closed and no card form is
ever shown to a customer who cannot pay.

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | inlined into the client bundle at build time | changing it needs a rebuild, not just a restart |
| `STRIPE_SECRET_KEY` | server only | never sent to the browser |
| `STRIPE_SOLO_PRICE_ID` | server only | recurring monthly price, not a one-off |
| `STRIPE_PRO_PRICE_ID` | server only | recurring monthly price, not a one-off |
| `STRIPE_WEBHOOK_SECRET` | server only | from the endpoint's signing secret, not the API key's |

Dashboard endpoint: `https://rrdlabs.online/exposed/api/webhooks/stripe`
(the path includes the base path, and nginx will not route it otherwise).

Subscribe it to `checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`invoice.paid`, and `invoice.payment_failed`. The exported `HANDLED_EVENTS`
array in the webhook route is the same list; anything else is acknowledged and
ignored rather than retried.

Three details that are easy to get wrong and expensive to debug:

- **The webhook is the only thing that grants a plan.** The browser is
  redirected to `/dashboard/billing?session_id=...` and that page verifies the
  session server-side, but it deliberately cannot change entitlement: a
  customer can hand-edit any query string, and the client secret is public by
  design. Display and entitlement are separate on purpose.
- **Stripe redelivers.** A failed event is retried for up to three days, and a
  2xx suppresses the retry permanently. The handler claims `event.id` before
  doing any work and returns 500 on failure, so a transient database error
  delays a grant instead of losing it. Never acknowledge a failed handler.
- **The nginx CSP must allow Stripe.** `js.stripe.com` in `script-src`,
  `checkout.stripe.com` in `frame-src`, `api.stripe.com` and
  `m.stripe.network` in `connect-src`. A missing origin produces a silently
  blank modal, not an error message. See
  `/etc/nginx/snippets/rrdlabs-security-headers.conf`.

Self-serve cancellation runs through the Stripe Customer Portal, which needs
the cancel and payment-method features enabled in the Dashboard. Lemon Squeezy
was merchant of record, so VAT and sales tax were its problem; under Stripe
that liability is now the studio's, and `automatic_tax` stays off until Stripe
Tax is configured.

## Operations

- `/admin` — enter `ADMIN_TOKEN` to review charity claims at `/admin/charities`.
  Approving a claim grants a permanent free Solo plan. Revoking it does not
  downgrade an account that has an active paid subscription.
- Charity registration is verified by hand against the official register. There
  is no automated verification, and the UI says so.

## Security posture

- Passwords are hashed with scrypt. Sessions are opaque random IDs in the
  database, delivered in an `httpOnly`, `sameSite=lax` cookie signed with
  HMAC-SHA256. Logging out deletes the row, not just the cookie.
- `proxy.ts` is an **optimistic** gate only: it checks that a session cookie is
  present so anonymous traffic is bounced before touching the database. Every
  protected page and API route independently calls `getCurrentUser()` and
  rejects a null user. A forged cookie that passes the proxy achieves nothing.
- The admin surface is a separate HMAC-signed cookie, and is not linked from the
  product.
- All domain input passes through `normalizeDomain()`, which rejects anything
  that is not a plausible public hostname, so user input cannot become a DNS or
  TLS target for something internal.
- Anonymous scans store a salted HMAC of the caller's IP for rate limiting. It
  cannot be reversed, and it is deleted with the scan.
- The webhook reads the raw request body as text. Stripe signs exact bytes, and
  re-serialising parsed JSON changes them and invalidates the signature.
- Every webhook handler writes through a claim on `webhook_events`, so a
  redelivery cannot grant a plan twice or send a second receipt.

## Limitations worth stating plainly

- A clean report is not a security assessment. It reflects public sources, which
  can be incomplete, stale, or wrong.
- Findings are passive observations. Acting on one against a system you do not
  own is your legal problem, not ours.
- You must be authorised to monitor a domain you add. The terms make that your
  responsibility, and accounts can be suspended on reasonable suspicion.
