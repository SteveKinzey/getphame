export const BULK_SENDER_PROVIDER_IDS = [
  "sendgrid",
  "amazon_ses",
  "mailgun",
  "mailjet",
  "mailersend",
  "smtp2go",
  "brevo",
  "postmark",
  "sparkpost",
  "elastic_email",
  "zoho_zeptomail",
  "socketlabs",
  "custom_smtp",
] as const;

export type BulkSenderProvider = (typeof BULK_SENDER_PROVIDER_IDS)[number];
export type BulkSenderSecurity = "starttls" | "tls";
export type BulkSenderUsernameMode = "user" | "fixed" | "secret";

export interface BulkSenderRegionOption {
  id: string;
  label: string;
  host: string;
}

export interface BulkSenderPreset {
  label: string;
  description: string;
  docsUrl: string;
  defaultHost: string;
  defaultPort: number;
  defaultSecurity: BulkSenderSecurity;
  usernameMode: BulkSenderUsernameMode;
  fixedUsername?: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  secretLabel: string;
  secretPlaceholder: string;
  secretHelp: string;
  defaultRegion?: string;
  regions?: readonly BulkSenderRegionOption[];
}

const AMAZON_SES_REGIONS = [
  ["us-east-1", "US East (N. Virginia)"],
  ["us-east-2", "US East (Ohio)"],
  ["us-west-1", "US West (N. California)"],
  ["us-west-2", "US West (Oregon)"],
  ["ap-south-1", "Asia Pacific (Mumbai)"],
  ["ap-northeast-3", "Asia Pacific (Osaka)"],
  ["ap-northeast-2", "Asia Pacific (Seoul)"],
  ["ap-southeast-1", "Asia Pacific (Singapore)"],
  ["ap-southeast-2", "Asia Pacific (Sydney)"],
  ["ap-northeast-1", "Asia Pacific (Tokyo)"],
  ["ca-central-1", "Canada (Central)"],
  ["eu-central-1", "Europe (Frankfurt)"],
  ["eu-west-1", "Europe (Ireland)"],
  ["eu-west-2", "Europe (London)"],
  ["eu-west-3", "Europe (Paris)"],
  ["eu-north-1", "Europe (Stockholm)"],
  ["sa-east-1", "South America (São Paulo)"],
  ["us-gov-west-1", "AWS GovCloud (US-West)"],
  ["us-gov-east-1", "AWS GovCloud (US-East)"],
] as const;

export const BULK_SENDER_PRESETS: Record<BulkSenderProvider, BulkSenderPreset> = {
  sendgrid: {
    label: "SendGrid",
    description: "Twilio SendGrid SMTP relay",
    docsUrl: "https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api",
    defaultHost: "smtp.sendgrid.net",
    defaultPort: 587,
    defaultSecurity: "starttls",
    usernameMode: "fixed",
    fixedUsername: "apikey",
    usernameLabel: "SMTP username",
    usernamePlaceholder: "apikey",
    secretLabel: "API key",
    secretPlaceholder: "SG.…",
    secretHelp: "Use an API key with at least Mail permission.",
  },
  amazon_ses: {
    label: "Amazon SES",
    description: "Region-specific Amazon SES SMTP relay",
    docsUrl: "https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html",
    defaultHost: "email-smtp.us-east-1.amazonaws.com",
    defaultPort: 587,
    defaultSecurity: "starttls",
    usernameMode: "user",
    usernameLabel: "SES SMTP username",
    usernamePlaceholder: "Region-specific SMTP username",
    secretLabel: "SES SMTP password",
    secretPlaceholder: "Region-specific SMTP password",
    secretHelp: "Use IAM-derived SES SMTP credentials, not your normal AWS access keys.",
    defaultRegion: "us-east-1",
    regions: AMAZON_SES_REGIONS.map(([id, label]) => ({
      id,
      label,
      host: `email-smtp.${id}.amazonaws.com`,
    })),
  },
  mailgun: {
    label: "Mailgun",
    description: "Mailgun SMTP relay for US or EU domains",
    docsUrl: "https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/send-smtp",
    defaultHost: "smtp.mailgun.org",
    defaultPort: 587,
    defaultSecurity: "starttls",
    usernameMode: "user",
    usernameLabel: "Mailgun SMTP username",
    usernamePlaceholder: "postmaster@mg.yourdomain.com",
    secretLabel: "Mailgun SMTP password",
    secretPlaceholder: "Domain-specific SMTP password",
    secretHelp: "Use the SMTP credentials for the sending domain, not the Mailgun API key.",
    defaultRegion: "us",
    regions: [
      { id: "us", label: "United States", host: "smtp.mailgun.org" },
      { id: "eu", label: "European Union", host: "smtp.eu.mailgun.org" },
    ],
  },
  mailjet: {
    label: "Mailjet",
    description: "Mailjet SMTP relay",
    docsUrl: "https://documentation.mailjet.com/hc/en-us/articles/360043229473-How-can-I-configure-my-SMTP-parameters",
    defaultHost: "in-v3.mailjet.com",
    defaultPort: 587,
    defaultSecurity: "starttls",
    usernameMode: "user",
    usernameLabel: "Mailjet API key",
    usernamePlaceholder: "Public API key",
    secretLabel: "Mailjet Secret key",
    secretPlaceholder: "Secret key shown once by Mailjet",
    secretHelp: "Use the API Key as the username and the Secret Key as the password. Do not use your Mailjet account password.",
  },
  mailersend: {
    label: "MailerSend",
    description: "MailerSend SMTP relay",
    docsUrl: "https://www.mailersend.com/help/smtp-relay",
    defaultHost: "smtp.mailersend.net",
    defaultPort: 587,
    defaultSecurity: "starttls",
    usernameMode: "user",
    usernameLabel: "MailerSend SMTP username",
    usernamePlaceholder: "Generated SMTP username",
    secretLabel: "MailerSend SMTP password",
    secretPlaceholder: "Generated SMTP password",
    secretHelp: "Copy the generated SMTP credentials from your MailerSend domain settings.",
  },
  smtp2go: {
    label: "SMTP2GO",
    description: "SMTP2GO relay with optional regional endpoints",
    docsUrl: "https://support.smtp2go.com/hc/en-gb/articles/223087627-SMTP-Settings",
    defaultHost: "mail.smtp2go.com",
    defaultPort: 2525,
    defaultSecurity: "starttls",
    usernameMode: "user",
    usernameLabel: "SMTP2GO username",
    usernamePlaceholder: "SMTP User username",
    secretLabel: "SMTP2GO password",
    secretPlaceholder: "SMTP User password",
    secretHelp: "Use a credential from Sending → SMTP Users.",
    defaultRegion: "default",
    regions: [
      { id: "default", label: "Automatic", host: "mail.smtp2go.com" },
      { id: "us", label: "United States", host: "mail-us.smtp2go.com" },
      { id: "eu_uk", label: "EU / United Kingdom", host: "mail-eu.smtp2go.com" },
      { id: "eu", label: "European Union only", host: "mail-eu2.smtp2go.com" },
      { id: "au", label: "Australia", host: "mail-au.smtp2go.com" },
    ],
  },
  brevo: {
    label: "Brevo",
    description: "Brevo transactional SMTP relay",
    docsUrl: "https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP",
    defaultHost: "smtp-relay.brevo.com",
    defaultPort: 587,
    defaultSecurity: "starttls",
    usernameMode: "user",
    usernameLabel: "Brevo SMTP login",
    usernamePlaceholder: "SMTP login email",
    secretLabel: "Brevo SMTP key",
    secretPlaceholder: "Generated SMTP key",
    secretHelp: "Use an SMTP key, not a Brevo API key.",
  },
  postmark: {
    label: "Postmark",
    description: "Postmark SMTP relay",
    docsUrl: "https://postmarkapp.com/developer/user-guide/send-email-with-smtp",
    defaultHost: "smtp.postmarkapp.com",
    defaultPort: 587,
    defaultSecurity: "starttls",
    usernameMode: "secret",
    usernameLabel: "Server API Token",
    usernamePlaceholder: "The token is used for both fields",
    secretLabel: "Server API Token",
    secretPlaceholder: "Postmark Server API Token",
    secretHelp: "Postmark uses the Server API Token as both SMTP username and password.",
  },
  sparkpost: {
    label: "SparkPost",
    description: "SparkPost SMTP relay for US or EU accounts",
    docsUrl: "https://developers.sparkpost.com/api/smtp/",
    defaultHost: "smtp.sparkpostmail.com",
    defaultPort: 587,
    defaultSecurity: "starttls",
    usernameMode: "fixed",
    fixedUsername: "SMTP_Injection",
    usernameLabel: "SMTP username",
    usernamePlaceholder: "SMTP_Injection",
    secretLabel: "SparkPost API key",
    secretPlaceholder: "API key with Send via SMTP permission",
    secretHelp: "Use an API key with Send via SMTP permission.",
    defaultRegion: "us",
    regions: [
      { id: "us", label: "United States", host: "smtp.sparkpostmail.com" },
      { id: "eu", label: "European Union", host: "smtp.eu.sparkpostmail.com" },
    ],
  },
  elastic_email: {
    label: "Elastic Email",
    description: "Elastic Email SMTP relay",
    docsUrl: "https://help.elasticemail.com/en/articles/4803409-smtp-settings",
    defaultHost: "smtp.elasticemail.com",
    defaultPort: 2525,
    defaultSecurity: "starttls",
    usernameMode: "user",
    usernameLabel: "Elastic Email SMTP login",
    usernamePlaceholder: "Account email or SMTP login",
    secretLabel: "Elastic Email SMTP password",
    secretPlaceholder: "Generated SMTP password",
    secretHelp: "Use the generated SMTP password from your Elastic Email account.",
  },
  zoho_zeptomail: {
    label: "Zoho ZeptoMail",
    description: "Zoho ZeptoMail transactional SMTP relay",
    docsUrl: "https://www.zoho.com/zeptomail/help/smtp-home.html",
    defaultHost: "smtp.zeptomail.com",
    defaultPort: 587,
    defaultSecurity: "starttls",
    usernameMode: "user",
    usernameLabel: "ZeptoMail SMTP username",
    usernamePlaceholder: "emailapikey or configured From address",
    secretLabel: "ZeptoMail SMTP password",
    secretPlaceholder: "Generated SMTP password",
    secretHelp: "Use the credentials shown in your ZeptoMail SMTP setup.",
  },
  socketlabs: {
    label: "SocketLabs",
    description: "SocketLabs SMTP relay",
    docsUrl: "https://help.socketlabs.com/docs/smtp-connections",
    defaultHost: "smtp.socketlabs.com",
    defaultPort: 587,
    defaultSecurity: "starttls",
    usernameMode: "user",
    usernameLabel: "SocketLabs SMTP username",
    usernamePlaceholder: "For example, server12345",
    secretLabel: "SocketLabs SMTP password",
    secretPlaceholder: "SMTP password",
    secretHelp: "Find these credentials under Configuration → SMTP Credentials.",
  },
  custom_smtp: {
    label: "Custom SMTP",
    description: "Any standards-compatible SMTP relay",
    docsUrl: "https://datatracker.ietf.org/doc/html/rfc6409",
    defaultHost: "",
    defaultPort: 587,
    defaultSecurity: "starttls",
    usernameMode: "user",
    usernameLabel: "SMTP username",
    usernamePlaceholder: "Provider-supplied username",
    secretLabel: "SMTP password",
    secretPlaceholder: "Provider-supplied password",
    secretHelp: "Enter the exact connection details supplied by your email provider.",
  },
};

export function getBulkSenderPreset(provider: BulkSenderProvider): BulkSenderPreset {
  return BULK_SENDER_PRESETS[provider];
}

export function resolveBulkSenderHost(provider: BulkSenderProvider, region?: string | null): string {
  const preset = getBulkSenderPreset(provider);
  if (!preset.regions?.length) return preset.defaultHost;
  const selectedRegion = region ?? preset.defaultRegion;
  return preset.regions.find((option) => option.id === selectedRegion)?.host ?? preset.defaultHost;
}

export function resolveBulkSenderUsername(
  provider: BulkSenderProvider,
  enteredUsername: string,
  secret: string,
): string {
  const preset = getBulkSenderPreset(provider);
  if (preset.usernameMode === "fixed") return preset.fixedUsername ?? "";
  if (preset.usernameMode === "secret") return secret;
  return enteredUsername.trim();
}
