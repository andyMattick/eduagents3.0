import fs from "fs/promises";
import path from "path";
import { RAW_DEBUG_TTL_MS } from "./retentionPolicy";

const DEBUG_DIR = path.join(process.cwd(), "tmp", "azure-debug");

let initializationPromise: Promise<void> | null = null;

function sanitizeFileName(fileName: string) {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function initializeDebugStorage() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await fs.mkdir(DEBUG_DIR, { recursive: true, mode: 0o700 });
      await cleanupExpiredDebugFiles();
    })();
  }

  await initializationPromise;
}

export async function storeDebugRawAzure(fileName: string, raw: unknown) {
  await initializeDebugStorage();

  const timestamp = Date.now();
  const filePath = path.join(DEBUG_DIR, `${timestamp}-${sanitizeFileName(fileName)}.json`);

  await fs.writeFile(filePath, JSON.stringify(raw, null, 2), "utf-8");
}

export async function cleanupExpiredDebugFiles() {
  const now = Date.now();
  let files: string[] = [];

  try {
    files = await fs.readdir(DEBUG_DIR);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const file of files) {
    const fullPath = path.join(DEBUG_DIR, file);
    const stats = await fs.stat(fullPath);

    if (!stats.isFile()) {
      continue;
    }

    if (now - stats.mtimeMs > RAW_DEBUG_TTL_MS) {
      await fs.unlink(fullPath);
    }
  }
}
