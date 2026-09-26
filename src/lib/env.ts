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
  get lemonSqueezyStoreId() {
    return optional("LEMON_SQUEEZY_STORE_ID");
  },
  get lemonSqueezyWebhookSecret() {
    return required("LEMON_SQUEEZY_WEBHOOK_SECRET");
  },
  get soloVariantId() {
    return optional("LEMON_SQUEEZY_SOLO_VARIANT_ID");
  },
  get proVariantId() {
    return optional("LEMON_SQUEEZY_PRO_VARIANT_ID");
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
