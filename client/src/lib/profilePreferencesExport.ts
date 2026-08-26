export type ProfilePreferenceExportFormat = "json" | "csv";

export type ProfilePreferencesExportPayload = {
  format: "get-phame-profile-preferences/v1";
  exportedAt: string;
  account: {
    displayName: string | null;
    email: string | null;
  };
  businessProfile: Record<string, string | null>;
  preferences: {
    themePreference: string;
    resolvedTheme: string;
    hapticsEnabled: boolean;
  };
};

function neutralizeSpreadsheetFormula(value: string): string {
  return /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
}

function escapeCsv(value: string): string {
  const normalized = neutralizeSpreadsheetFormula(value).replace(/\r\n?/g, "\n");
  return /[",\n]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

function displayValue(value: string | boolean | null): string {
  return value === null ? "" : String(value);
}

export function buildProfilePreferencesExportFilename(format: ProfilePreferenceExportFormat, exportedAt: string): string {
  const date = /^\d{4}-\d{2}-\d{2}T/.test(exportedAt) ? exportedAt.slice(0, 10) : "export";
  return `get-phame-profile-preferences-${date}.${format}`;
}

export function serializeProfilePreferencesCsv(payload: ProfilePreferencesExportPayload): string {
  const rows: Array<[string, string | boolean | null]> = [
    ["Exported at", payload.exportedAt],
    ["Account display name", payload.account.displayName],
    ["Account email", payload.account.email],
    ["Business name", payload.businessProfile.businessName],
    ["Review link", payload.businessProfile.reviewLink],
    ["From name", payload.businessProfile.fromName],
    ["Reply-to email", payload.businessProfile.replyTo],
    ["Consent label name", payload.businessProfile.consentLabelName],
    ["Physical address", payload.businessProfile.physicalAddress],
    ["Theme preference", payload.preferences.themePreference],
    ["Resolved theme", payload.preferences.resolvedTheme],
    ["Haptics enabled", payload.preferences.hapticsEnabled],
  ];
  return `\uFEFFField,Value\r\n${rows.map(([field, value]) => `${escapeCsv(field)},${escapeCsv(displayValue(value))}`).join("\r\n")}\r\n`;
}
