/**
 * Pre-bundles Vercel serverless functions in api/ using esbuild.
 *
 * Why: The src/ codebase uses directory imports (e.g. import from "./SomeDir")
 * which Node.js ESM doesn't support. Bundling resolves all imports at build
 * time so the deployed function is self-contained.
 *
 * Run: node scripts/bundle-api.mjs
 * Called automatically by Vercel via buildCommand.
 */
import { build } from "esbuild";
import { readdirSync, renameSync, statSync, unlinkSync } from "fs";
import { join, resolve } from "path";

const apiDir = "api";
const srcDir = resolve("src");

// npm packages that should stay as external imports (provided by node_modules at runtime)
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

const tsFiles = collectApiTsFiles(apiDir);

for (const file of tsFiles) {
  const entry = file;
  const tmpFile = file.replace(/\.ts$/, ".bundled.mjs");

  // Plugin to resolve @/ alias → src/ (since esbuild 0.14 doesn't have `alias`)
  // Also handles resolving to .ts/.tsx extensions and directory index files.
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
    // Resolve bare imports like "pipeline/foo" via tsconfig baseUrl:"src"
    absWorkingDir: resolve("."),
    nodePaths: [srcDir],
    // import.meta.env doesn't exist in Node; replace references with undefined
    // so the fallback to process.env kicks in.
    define: {
      "import.meta.env": "undefined",
    },
    banner: {
      js: "/* Bundled by esbuild — do not edit */",
    },
    logLevel: "info",
  });

  // Overwrite the original .ts with the bundled output.
  // Vercel pre-indexes api/*.ts files BEFORE the build command runs, so
  // they must still exist at their original paths when Vercel processes them.
  unlinkSync(entry);
  renameSync(tmpFile, entry);
  console.log(`  ${file} → bundled in-place`);
}

console.log(`\n✓ Bundled ${tsFiles.length} API functions\n`);
