export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  // Pin the exact redirect URI registered in Google Cloud Console.
  // This ensures the same URI is used in both dev and production.
  gmailRedirectUri: process.env.GMAIL_REDIRECT_URI ?? "",
  // Zoho Books integration
  zohoClientId: process.env.ZOHO_CLIENT_ID ?? "",
  zohoClientSecret: process.env.ZOHO_CLIENT_SECRET ?? "",
  zohoOrgId: process.env.ZOHO_ORG_ID ?? "",
  zohoRefreshToken: process.env.ZOHO_REFRESH_TOKEN ?? "",
};
