import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { storageGet, storagePut } from "../server/storage";

const STORAGE_KEY = "connectors/get-phame-connector.zip";
const VERSIONED_KEY = "connectors/get-phame-connector-2.3.0.zip";

function sha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error(
      "Usage: pnpm tsx scripts/upload-connector-release.mts <connector.zip>"
    );
  }

  const absolutePath = resolve(inputPath);
  const fileStats = await stat(absolutePath);
  if (!fileStats.isFile() || fileStats.size < 1) {
    throw new Error(
      "Connector release path must point to a non-empty ZIP file"
    );
  }

  const releaseBytes = await readFile(absolutePath);
  const releaseHash = sha256(releaseBytes);
  const uploaded = await storagePut(
    STORAGE_KEY,
    releaseBytes,
    "application/zip"
  );
  if (uploaded.key !== STORAGE_KEY) {
    throw new Error(`Unexpected storage key: ${uploaded.key}`);
  }

  const uploadedVersioned = await storagePut(
    VERSIONED_KEY,
    releaseBytes,
    "application/zip"
  );
  if (uploadedVersioned.key !== VERSIONED_KEY) {
    throw new Error(`Unexpected storage key: ${uploadedVersioned.key}`);
  }

  const signedDownload = await storageGet(STORAGE_KEY);
  const signedVersionedDownload = await storageGet(VERSIONED_KEY);
  const versionedResponse = await fetch(signedVersionedDownload.url);
  if (!versionedResponse.ok) {
    throw new Error(
      `Connector verification download failed for versioned key with status ${versionedResponse.status}`
    );
  }

  const response = await fetch(signedDownload.url);
  if (!response.ok) {
    throw new Error(
      `Connector verification download failed with status ${response.status}`
    );
  }

  const downloadedBytes = new Uint8Array(await response.arrayBuffer());
  const downloadedHash = sha256(downloadedBytes);
  if (
    downloadedBytes.byteLength !== releaseBytes.byteLength ||
    downloadedHash !== releaseHash
  ) {
    throw new Error(
      "Connector verification failed: downloaded bytes do not match the release ZIP"
    );
  }

  console.log(
    JSON.stringify({
      key: STORAGE_KEY,
      bytes: releaseBytes.byteLength,
      sha256: releaseHash,
      verified: true,
    })
  );
}

await main();
