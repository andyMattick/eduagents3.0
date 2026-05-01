/**
 * One-shot script: adds AbortController timeout to every bundled Vercel handler
 * that still has the bare `supabaseRest` fetch (no signal).
 *
 * Safe to re-run: files that already have `signal: controller.signal` are skipped.
 *
 * Usage: node scripts/patch-supabase-rest-timeout.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const apiDir = resolve("api");
const ALREADY_PATCHED_MARKER = "signal: controller.signal";

// Multi-line destructure form (most bundled handlers compiled from TypeScript)
const MULTILINE_DESTRUCT_OLD = `  const {
    method = "GET",
    select,
    filters = {},
    body,
    prefer
  } = options;`;

const MULTILINE_DESTRUCT_NEW = `  const {
    method = "GET",
    select,
    filters = {},
    body,
    prefer,
    timeoutMs = 8e3
  } = options;`;

// Single-line destructure form (a few handlers compiled differently)
const SINGLELINE_DESTRUCT_OLD = `  const { method = "GET", select, filters = {}, body, prefer } = options;`;
const SINGLELINE_DESTRUCT_NEW = `  const { method = "GET", select, filters = {}, body, prefer, timeoutMs = 8e3 } = options;`;

// The bare fetch block that needs timeout wrapping
const FETCH_OLD = `  const res = await fetch(reqUrl.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : void 0
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(\`Supabase REST \${method} \${table} failed (\${res.status}): \${text}\`);
  }`;

const FETCH_NEW = `  const controller = new AbortController();
  const timeoutId = setTimeout(() => { controller.abort(); }, timeoutMs);
  let res;
  try {
    res = await fetch(reqUrl.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutError = new Error(\`Supabase REST \${method} \${table} timed out after \${timeoutMs}ms\`);
      timeoutError.code = "timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(\`Supabase REST \${method} \${table} failed (\${res.status}): \${text}\`);
  }`;

function collectJsFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectJsFiles(full));
    } else if (entry.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

let patched = 0;
let skipped = 0;
let noMatch = 0;

for (const file of collectJsFiles(apiDir)) {
  const original = readFileSync(file, "utf8");

  // Skip files that don't even have supabaseRest
  if (!original.includes("async function supabaseRest(")) {
    continue;
  }

  // Skip already-patched files
  if (original.includes(ALREADY_PATCHED_MARKER)) {
    console.log(`  SKIP (already patched): ${file}`);
    skipped++;
    continue;
  }

  let updated = original;

  // Apply destructure patch (try multi-line first, then single-line)
  if (updated.includes(MULTILINE_DESTRUCT_OLD)) {
    updated = updated.replace(MULTILINE_DESTRUCT_OLD, MULTILINE_DESTRUCT_NEW);
  } else if (updated.includes(SINGLELINE_DESTRUCT_OLD)) {
    updated = updated.replace(SINGLELINE_DESTRUCT_OLD, SINGLELINE_DESTRUCT_NEW);
  } else {
    console.warn(`  WARN (destructure not matched): ${file}`);
    noMatch++;
    continue;
  }

  // Apply fetch → AbortController patch
  if (!updated.includes(FETCH_OLD)) {
    console.warn(`  WARN (fetch block not matched): ${file}`);
    noMatch++;
    continue;
  }
  updated = updated.replace(FETCH_OLD, FETCH_NEW);

  writeFileSync(file, updated, "utf8");
  console.log(`  PATCHED: ${file}`);
  patched++;
}

console.log(`\n✓ Done — patched: ${patched}, already done: ${skipped}, no-match: ${noMatch}\n`);
