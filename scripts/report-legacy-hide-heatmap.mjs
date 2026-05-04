#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strictMode = process.env.LEGACY_HEATMAP_STRICT === 'true' || process.argv.includes('--strict');

const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const excludeOutputArg = process.argv.find((arg) => arg.startsWith('--exclude-output='));

const outputPath = outputArg
  ? path.resolve(root, outputArg.replace('--output=', ''))
  : path.join(root, 'LEGACY_HIDE_HEATMAP.json');

const excludeOutputPath = excludeOutputArg
  ? path.resolve(root, excludeOutputArg.replace('--exclude-output=', ''))
  : path.join(root, '.vscode', 'legacy-files.exclude.generated.json');

const skipDirs = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.turbo', 'coverage']);
const codeFilePattern = /\.(ts|tsx|js|jsx|mjs|cjs|json|sql|md)$/i;

function toRel(absPath) {
  return path.relative(root, absPath).replace(/\\/g, '/');
}

function walkFiles(startDir) {
  const files = [];
  const stack = [startDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) {
          continue;
        }
        stack.push(fullPath);
      } else if (entry.isFile() && codeFilePattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function tryResolveFile(importPath) {
  if (importPath.endsWith('.ts') || importPath.endsWith('.tsx') || importPath.endsWith('.js') || importPath.endsWith('.mjs')) {
    return fs.existsSync(path.join(root, importPath)) ? importPath : null;
  }

  const candidates = [
    `${importPath}.ts`,
    `${importPath}.tsx`,
    `${importPath}.js`,
    `${importPath}.mjs`,
    `${importPath}/index.ts`,
    `${importPath}/index.tsx`,
    `${importPath}/index.js`,
    `${importPath}/index.mjs`,
  ];

  for (const candidate of candidates) {
    const absCandidate = path.join(root, candidate);
    if (fs.existsSync(absCandidate)) {
      return candidate.replace(/\\/g, '/');
    }
  }

  return null;
}

function resolveImport(fromRel, spec) {
  if (spec.startsWith('@/')) {
    return tryResolveFile(spec.replace('@/', 'src/'));
  }

  if (spec.startsWith('src/')) {
    return tryResolveFile(spec);
  }

  if (spec.startsWith('./') || spec.startsWith('../')) {
    const fromDir = path.dirname(fromRel);
    const resolved = path.normalize(path.join(fromDir, spec)).replace(/\\/g, '/');
    return tryResolveFile(resolved);
  }

  return null;
}

const allFiles = walkFiles(root);
const relFiles = allFiles.map((file) => toRel(file));

const importRegexes = [
  /import\s+(?:[^;]*?)\s+from\s+['\"]([^'\"]+)['\"]/g,
  /import\s+['\"]([^'\"]+)['\"]/g,
  /export\s+(?:type\s+)?(?:\*|{[^}]*})\s+from\s+['\"]([^'\"]+)['\"]/g,
  /require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)/g,
];

const incomingRefs = new Map(relFiles.map((file) => [file, 0]));

for (const relPath of relFiles) {
  const absPath = path.join(root, relPath);
  const text = fs.readFileSync(absPath, 'utf8');

  for (const regex of importRegexes) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const target = resolveImport(relPath, match[1]);
      if (!target) {
        continue;
      }
      if (incomingRefs.has(target)) {
        incomingRefs.set(target, (incomingRefs.get(target) ?? 0) + 1);
      }
    }
  }
}

const entrypointPatterns = [
  /^src\/index\.tsx$/,
  /^src\/App\.tsx$/,
  /^api\//,
  /^vite\.config\.ts$/,
  /^scripts\//,
  /^supabase\//,
];

function isEntrypoint(relPath) {
  return entrypointPatterns.some((pattern) => pattern.test(relPath));
}

function scoreFile(relPath, text, refCount) {
  let score = 0;
  const reasons = [];

  if (relPath.startsWith('legacy/')) {
    score += 90;
    reasons.push('legacy-root-path');
  }
  if (relPath.includes('/legacyV2/')) {
    score += 80;
    reasons.push('legacyV2-path');
  }
  if (/(^|\/)v3(\/|$)/i.test(relPath)) {
    score += 50;
    reasons.push('v3-path');
  }
  if (/(deprecated|obsolete|archive|legacy)/i.test(relPath)) {
    score += 25;
    reasons.push('legacy-keyword-in-path');
  }
  if (relPath.startsWith('src/components/')) {
    score += 30;
    reasons.push('old-component-surface');
  }
  if (relPath.startsWith('tmp/')) {
    score += 35;
    reasons.push('tmp-path');
  }

  const lowerText = text.toLowerCase();
  if (lowerText.includes('do not use') || lowerText.includes('legacy only') || lowerText.includes('deprecated')) {
    score += 20;
    reasons.push('legacy-language-in-content');
  }

  if (refCount === 0 && !isEntrypoint(relPath)) {
    score += 25;
    reasons.push('no-incoming-imports');
  }

  return {
    score,
    reasons,
  };
}

const candidates = [];

for (const relPath of relFiles) {
  const absPath = path.join(root, relPath);
  const text = fs.readFileSync(absPath, 'utf8');
  const refCount = incomingRefs.get(relPath) ?? 0;
  const { score, reasons } = scoreFile(relPath, text, refCount);

  let band = 'active';
  if (score >= 80) {
    band = 'hide-high';
  } else if (score >= 50) {
    band = 'hide-medium';
  } else if (score >= 30) {
    band = 'hide-low';
  }

  candidates.push({
    path: relPath,
    score,
    band,
    incomingRefs: refCount,
    reasons,
  });
}

candidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

const high = candidates.filter((c) => c.band === 'hide-high');
const medium = candidates.filter((c) => c.band === 'hide-medium');
const low = candidates.filter((c) => c.band === 'hide-low');

const suggestedGlobs = {
  'legacy/**': true,
  'src/pipeline/legacyV2/**': true,
  'tmp/**': true,
};

if (high.some((c) => c.path.startsWith('src/components/'))) {
  suggestedGlobs['src/components/**'] = true;
}
if (high.some((c) => c.path.startsWith('legacy/v3/'))) {
  suggestedGlobs['legacy/v3/**'] = true;
}

const report = {
  metadata: {
    generatedAt: new Date().toISOString(),
    root,
    strictMode,
    totalScannedFiles: relFiles.length,
  },
  summary: {
    hideHighCount: high.length,
    hideMediumCount: medium.length,
    hideLowCount: low.length,
    activeCount: candidates.length - high.length - medium.length - low.length,
  },
  suggestedFilesExclude: suggestedGlobs,
  topHideCandidates: candidates.slice(0, 250),
};

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

fs.mkdirSync(path.dirname(excludeOutputPath), { recursive: true });
fs.writeFileSync(
  excludeOutputPath,
  `${JSON.stringify({ 'files.exclude': suggestedGlobs }, null, 2)}\n`,
  'utf8',
);

console.log(`Legacy hide heatmap written to ${toRel(outputPath)}.`);
console.log(`files.exclude recommendations written to ${toRel(excludeOutputPath)}.`);
console.log(`Hide-high candidates: ${high.length}.`);

if (strictMode && high.length > 0) {
  console.error('Strict mode enabled: hide-high legacy candidates detected.');
  process.exit(1);
}
