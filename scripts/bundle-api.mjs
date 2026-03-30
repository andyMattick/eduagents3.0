/**
 * Pre-bundles Vercel serverless functions in api/ using esbuild.
 */

import { build } from "esbuild";
import { readdirSync, renameSync, statSync, unlinkSync, readFileSync } from "fs";
import { join, resolve } from "path";

const apiDir = "api";
const srcDir = resolve("src");

// npm packages that should stay external
const externalPackages = [
  "@vercel/node",
  "@vercel/analytics",
  "@supabase/supabase-js",
  "@google/genai",
  "@google/generative-ai",
  "react",
  "react-dom",
  "docx",
  "file-saver",
  "html2canvas",
  "jspdf",
  "mammoth",
  "pdfjs-dist",
  "pdf-parse",
  "recharts",
  "lucide-react",
];

// Recursively collect all .ts files under /api
function collectApiTsFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...collectApiTsFiles(fullPath));
      continue;
    }

    if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

// Detect if a file is a real serverless handler
function isHandlerFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  return content.includes("export default");
}

const tsFiles = collectApiTsFiles(apiDir);

for (const file of tsFiles) {
  // Skip non-handler files
  if (!isHandlerFile(file)) {
    console.log(`  ${file} → skipped (not a handler)`);
    continue;
  }

  const entry = file;
  const tmpFile = file.replace(/\.ts$/, ".bundled.mjs");

  const aliasPlugin = {
    name: "resolve-at-alias",
    setup(bld) {
      bld.onResolve({ filter: /^@\// }, (args) => {
        const bare = resolve(srcDir, args.path.slice(2));
        return bld.resolve("./" + bare.slice(resolve(".").length + 1), {
          kind: args.kind,
          resolveDir: resolve("."),
        });
      });
    },
  };

  await build({
    entryPoints: [entry],
    bundle: true,
    outfile: tmpFile,
    format: "esm",
    platform: "node",
    target: "node18",
    external: externalPackages,
    plugins: [aliasPlugin],
    absWorkingDir: resolve("."),
    nodePaths: [srcDir],
    define: { "import.meta.env": "undefined" },
    banner: { js: "/* Bundled by esbuild — do not edit */" },
    logLevel: "info",
  });

  unlinkSync(entry);
  renameSync(tmpFile, entry);
  console.log(`  ${file} → bundled in-place`);
}

console.log(`\n✓ Bundled only real API handlers\n`);
