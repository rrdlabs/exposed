function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example and README.md.`,
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get databasePath() {
    return optional("DATABASE_PATH");
  },
  get resendApiKey() {
    return optional("RESEND_API_KEY");
  },
  get mailFrom() {
    return optional("MAIL_FROM") ?? "Exposed <alerts@rrdlabs.online>";
  },
  /**
   * Stripe. Deliberately optional rather than required: a missing key has to
   * degrade to a clear "billing is not configured" message on the checkout
   * route, not crash the app at import time, which is what a required() getter
   * would do for anyone booting a dev environment to work on anything other
   * than billing.
   */
  get stripeSecretKey() {
    return optional("STRIPE_SECRET_KEY");
  },
  get stripePublishableKey() {
    return optional("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  },
  get stripeWebhookSecret() {
    return optional("STRIPE_WEBHOOK_SECRET");
  },
  get stripeSoloPriceId() {
    return optional("STRIPE_SOLO_PRICE_ID");
  },
  get stripeProPriceId() {
    return optional("STRIPE_PRO_PRICE_ID");
  },

  get adminToken() {
    return required("ADMIN_TOKEN");
  },
  get siteUrl() {
    return optional("SITE_URL") ?? "https://rrdlabs.online/exposed";
  },
};

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
