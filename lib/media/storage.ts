import fs from "node:fs";
import path from "node:path";

function getBaseStorageDir(): string {
  if (process.env.MEDIA_STORAGE_PATH) {
    return path.resolve(process.env.MEDIA_STORAGE_PATH);
  }
  return path.resolve(process.cwd(), "data", "media");
}

export function getReadyStorageDir(): string {
  return path.join(getBaseStorageDir(), "ready");
}

export function getStagingStorageDir(): string {
  return path.join(getBaseStorageDir(), "staging");
}

export function resolveStorageFilePath(storageKey: string): string {
  // Normalize and prevent directory traversal
  const safeKey = storageKey.replace(/\\/g, "/").replace(/\.\./g, "");
  return path.join(getReadyStorageDir(), safeKey);
}

export async function saveProcessedMedia(
  storageKey: string,
  buffer: Buffer
): Promise<string> {
  const filePath = resolveStorageFilePath(storageKey);
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

export async function readMedia(storageKey: string): Promise<Buffer | null> {
  const filePath = resolveStorageFilePath(storageKey);
  try {
    return await fs.promises.readFile(filePath);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function deleteMediaFile(storageKey: string): Promise<boolean> {
  const filePath = resolveStorageFilePath(storageKey);
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "ENOENT") {
      return false;
    }
    throw err;
  }
}
