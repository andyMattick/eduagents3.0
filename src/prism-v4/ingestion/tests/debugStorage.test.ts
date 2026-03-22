import fs from "fs/promises";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupExpiredDebugFiles } from "../debug/debugStorage";
import { RAW_DEBUG_TTL_MS } from "../debug/retentionPolicy";

const DEBUG_DIR = path.join(process.cwd(), "tmp", "azure-debug");

async function removeIfExists(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw error;
    }
  }
}

describe("debugStorage", () => {
  afterEach(async () => {
    await removeIfExists(path.join(DEBUG_DIR, "phase2-expired.json"));
    await removeIfExists(path.join(DEBUG_DIR, "phase2-fresh.json"));
  });

  it("removes expired raw Azure debug files and keeps fresh ones", async () => {
    await fs.mkdir(DEBUG_DIR, { recursive: true });

    const expiredFile = path.join(DEBUG_DIR, "phase2-expired.json");
    const freshFile = path.join(DEBUG_DIR, "phase2-fresh.json");

    await fs.writeFile(expiredFile, JSON.stringify({ status: "expired" }), "utf-8");
    await fs.writeFile(freshFile, JSON.stringify({ status: "fresh" }), "utf-8");

    const expiredDate = new Date(Date.now() - RAW_DEBUG_TTL_MS - 1000);
    await fs.utimes(expiredFile, expiredDate, expiredDate);

    await cleanupExpiredDebugFiles();

    await expect(fs.stat(expiredFile)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.stat(freshFile)).resolves.toBeDefined();
  });
});
