import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const SOURCE_SECRET_PREFIX = "gp-source:v1:";

function getSourceSecretKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must be configured before source credentials can be stored.");
  }
  return createHash("sha256").update(`get-phame-source:${secret}`).digest();
}

export function encryptSourceSecrets(value: Record<string, string>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getSourceSecretKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${SOURCE_SECRET_PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSourceSecrets(encoded: string): Record<string, string> {
  if (!encoded.startsWith(SOURCE_SECRET_PREFIX)) {
    throw new Error("Unsupported source secret format.");
  }
  const parts = encoded.slice(SOURCE_SECRET_PREFIX.length).split(".");
  if (parts.length !== 3) throw new Error("Invalid source secret payload.");
  const [ivEncoded, tagEncoded, ciphertextEncoded] = parts;
  const decipher = createDecipheriv("aes-256-gcm", getSourceSecretKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  const parsed = JSON.parse(plaintext) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid source secret contents.");
  }
  return Object.fromEntries(
    Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

export function isEncryptedSourceSecret(value: string): boolean {
  return value.startsWith(SOURCE_SECRET_PREFIX);
}
