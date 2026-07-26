export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  // Apple Sign In
  appleClientId: process.env.APPLE_CLIENT_ID ?? "",
  appleTeamId: process.env.APPLE_TEAM_ID ?? "",
  appleKeyId: process.env.APPLE_KEY_ID ?? "",
  applePrivateKey: process.env.APPLE_PRIVATE_KEY ?? "",
  appleServiceId: process.env.APPLE_SERVICE_ID ?? "",
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
  // PayPal
  paypalClientId: process.env.PAYPAL_CLIENT_ID ?? "",
  paypalSecret: process.env.PAYPAL_SECRET ?? "",
  // App base URL
  appBaseUrl: process.env.APP_BASE_URL ?? "https://getphame.app",
  // SMTP
  systemSmtpHost: process.env.SYSTEM_SMTP_HOST ?? "",
  systemSmtpPort: parseInt(process.env.SYSTEM_SMTP_PORT ?? "587"),
  systemSmtpUser: process.env.SYSTEM_SMTP_USER ?? "",
  systemSmtpPass: process.env.SYSTEM_SMTP_PASS ?? "",
  systemFromEmail: process.env.SYSTEM_FROM_EMAIL ?? "",
};
