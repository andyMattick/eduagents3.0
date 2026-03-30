import { readFileSync } from "fs";

// Only bundle files that contain a default export (serverless handlers)
function isHandlerFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  return content.includes("export default");
}

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
