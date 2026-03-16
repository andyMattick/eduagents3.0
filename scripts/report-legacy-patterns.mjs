#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pipelineRoot = path.join(root, 'src', 'pipeline');
const strictMode = process.env.LEGACY_STRICT === 'true' || process.argv.includes('--strict');

const isAllowedPath = (absPath) => {
  const rel = path.relative(root, absPath).replace(/\\/g, '/');
  if (rel.startsWith('src/pipeline/agents/writer/')) return true;
  if (rel === 'src/pipeline/utils/itemNormalizer.ts') return true;
  if (rel.startsWith('src/pipeline/contracts/')) return true;
  return false;
};

/**
 * Whitelist: paths allowed to have certain legacy patterns.
 * These are template/plugin sources that generate items; they're intentional entry points for legacy schema.
 */
const whitelist = {
  legacySchemaFields: [
    'src/pipeline/agents/pluginEngine/services/problemPlugins/templates/arithmetic_fluency_template.ts',
  ],
};

const isWhitelisted = (bucketName, relPath) => {
  return whitelist[bucketName]?.includes(relPath) ?? false;
};

const listTsFiles = (dir) => {
  const out = [];
  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'legacyV2') continue;
        stack.push(full);
      } else if (entry.isFile() && full.endsWith('.ts')) {
        out.push(full);
      }
    }
  }

  return out;
};

const listWorkspaceCodeFiles = (dir) => {
  const out = [];
  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (['.git', 'node_modules', 'dist', 'legacyV2'].includes(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(full)) {
        out.push(full);
      }
    }
  }

  return out;
};

const patterns = {
  flatFieldAccess: /\bitem\.(prompt|answer|options|passage)\b(?:\s*(?:\?\?|\|\||&&)|\.[A-Za-z_][A-Za-z0-9_]*\s*\(|\.[A-Za-z_][A-Za-z0-9_]*|)/g,
  legacySchemaFields: /\b(problemText|correctAnswer|problemType|problemOptions)\b/g,
  legacyMutations: /\bitem\.(prompt|answer|options|passage)\s*=(?!=)/g,
  slotMutations: /\bslot\.(questionType|difficulty|cognitiveDemand)\s*=(?!=)/g,
  legacyPassagePatterns:
    /\b(?:slot\.(?:text|sourceText|context|longContext)|raw\.(?:text|source|document|contextText|stimulus|topicText|longContext|passageBased)|passageBased\s*:\s*true|longContext\s*: )\b/g,
};

const report = {
  flatFieldAccess: {},
  legacySchemaFields: {},
  legacyMutations: {},
  slotMutations: {},
  legacyPassagePatterns: {},
};

const addHit = (bucketName, relPath, line, pattern) => {
  // Skip whitelisted entries
  if (isWhitelisted(bucketName, relPath)) {
    return;
  }
  if (!report[bucketName][relPath]) report[bucketName][relPath] = [];
  report[bucketName][relPath].push({ line, pattern });
};

const files = fs.existsSync(pipelineRoot) ? listTsFiles(pipelineRoot) : [];

for (const file of files) {
  if (isAllowedPath(file)) continue;

  const relPath = path.relative(root, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((lineText, idx) => {
    const lineNumber = idx + 1;

    for (const [bucketName, regex] of Object.entries(patterns)) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(lineText)) !== null) {
        addHit(bucketName, relPath, lineNumber, match[0]);
      }
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Reachability Analysis: Build import graph and find unused files
// ──────────────────────────────────────────────────────────────────────────────

const importPattern = /import\s+(?:{[^}]*}|[^;]+?)\s+from\s+['"]([^'"]+)['"]/g;
const sideEffectImportPattern = /import\s+['"]([^'"]+)['"]/g;
const exportFromPattern = /export\s+(?:type\s+)?(?:\*|{[^}]*})\s+from\s+['"]([^'"]+)['"]/g;
const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const importGraph = new Map();
const allPipelineFiles = new Set();

for (const file of files) {
  const relPath = path.relative(root, file).replace(/\\/g, '/');
  allPipelineFiles.add(relPath);
  
  const text = fs.readFileSync(file, 'utf8');
  const imports = new Set();
  
  importPattern.lastIndex = 0;
  let match;
  while ((match = importPattern.exec(text)) !== null) {
    const importPath = match[1];
    imports.add(importPath);
  }

  sideEffectImportPattern.lastIndex = 0;
  while ((match = sideEffectImportPattern.exec(text)) !== null) {
    const importPath = match[1];
    imports.add(importPath);
  }

  exportFromPattern.lastIndex = 0;
  while ((match = exportFromPattern.exec(text)) !== null) {
    const importPath = match[1];
    imports.add(importPath);
  }
  
  requirePattern.lastIndex = 0;
  while ((match = requirePattern.exec(text)) !== null) {
    const importPath = match[1];
    imports.add(importPath);
  }
  
  importGraph.set(relPath, imports);
}

const resolveImportPath = (fromFile, importPath) => {
  // External / node_modules imports — skip
  const isExternal = !importPath.startsWith('@/') && !importPath.startsWith('/') && !importPath.startsWith('.');
  if (isExternal) return null;
  
  // Internal imports: @/ → src/
  if (importPath.startsWith('@/')) {
    const resolved = importPath.replace('@/', 'src/');
    return tryResolveFile(resolved);
  }
  
  // Absolute imports: /
  if (importPath.startsWith('/')) {
    return tryResolveFile(importPath);
  }
  
  // Relative imports: ./ and ../
  const fromDir = path.dirname(fromFile);
  const resolved = path.join(fromDir, importPath).replace(/\\/g, '/');
  return tryResolveFile(resolved);
};

const tryResolveFile = (filePath) => {
  // If it already ends in .ts, return it
  if (filePath.endsWith('.ts')) {
    return filePath;
  }
  
  // Try .ts extension
  if (fs.existsSync(filePath + '.ts')) {
    return filePath + '.ts';
  }
  
  // Try directory/index.ts
  const indexPath = path.join(filePath, 'index.ts').replace(/\\/g, '/');
  if (fs.existsSync(indexPath)) {
    return indexPath;
  }
  
  return filePath.endsWith('.ts') ? filePath : `${filePath}.ts`;
};

const candidateEntryPoints = [
  'src/pipeline/orchestrator/create.ts',
  'src/pipeline/runPipeline.ts',
  'src/pipeline/orchestrator/runPipeline.ts',
  'src/pipeline/agents/pluginEngine/index.ts',
  'src/pipeline/architectV3/planner/cognitivePlanner.ts',
  'src/pipeline/architectV3/planner/pacingPlanner.ts',
  'src/pipeline/agents/writer/index.ts',
  'src/pipeline/agents/gatekeeper/Gatekeeper.ts',
  'src/pipeline/agents/builder/index.ts',
  'src/pipeline/agents/scribe/SCRIBE.ts',
];

const workspaceFiles = listWorkspaceCodeFiles(root);
const externalPipelineEntrypoints = new Set();

for (const file of workspaceFiles) {
  const relPath = path.relative(root, file).replace(/\\/g, '/');
  if (relPath.startsWith('src/pipeline/')) continue;

  const text = fs.readFileSync(file, 'utf8');
  const imports = new Set();

  importPattern.lastIndex = 0;
  let match;
  while ((match = importPattern.exec(text)) !== null) {
    imports.add(match[1]);
  }

  sideEffectImportPattern.lastIndex = 0;
  while ((match = sideEffectImportPattern.exec(text)) !== null) {
    imports.add(match[1]);
  }

  exportFromPattern.lastIndex = 0;
  while ((match = exportFromPattern.exec(text)) !== null) {
    imports.add(match[1]);
  }

  requirePattern.lastIndex = 0;
  while ((match = requirePattern.exec(text)) !== null) {
    imports.add(match[1]);
  }

  for (const imp of imports) {
    const resolved = resolveImportPath(relPath, imp);
    if (resolved && allPipelineFiles.has(resolved)) {
      externalPipelineEntrypoints.add(resolved);
    }
  }
}

const pipelineEntryPoints = Array.from(new Set([
  ...candidateEntryPoints.filter(ep => fs.existsSync(ep)),
  ...externalPipelineEntrypoints,
]));

const reachable = new Set();
const queue = [...pipelineEntryPoints];

while (queue.length > 0) {
  const file = queue.shift();
  if (reachable.has(file)) continue;
  
  reachable.add(file);
  
  const imports = importGraph.get(file) || new Set();
  for (const imp of imports) {
    const resolved = resolveImportPath(file, imp);
    if (resolved && allPipelineFiles.has(resolved) && !reachable.has(resolved)) {
      queue.push(resolved);
    }
  }
}

const unusedFiles = Array.from(allPipelineFiles)
  .filter(f => !reachable.has(f))
  .filter(f => !f.startsWith('src/pipeline/legacyV2/'))
  .filter(f => !f.includes('/node_modules/'))
  .filter(f => !f.includes('.test.ts'))
  .sort();

// Count total violations (excluding whitelisted)
const totalViolations = Object.values(report).reduce((sum, bucket) => sum + Object.keys(bucket).length, 0);

// Build final report with metadata
const finalReport = {
  metadata: {
    scanDate: new Date().toISOString(),
    strictMode: strictMode,
    whitelistEnabled: true,
    whitelistedFiles: whitelist,
    reachabilityAnalysis: {
      entryPoints: pipelineEntryPoints,
      totalFiles: allPipelineFiles.size,
      reachableFiles: reachable.size,
      unusedFiles: unusedFiles.length,
    },
  },
  summary: {
    totalViolations,
    unusedFiles: unusedFiles.length,
    passed: totalViolations === 0 && unusedFiles.length === 0,
  },
  findings: {
    ...report,
    unusedFiles: {
      description: 'Files in src/pipeline/** not reachable from any pipeline entry point',
      severity: 'low-to-medium',
      count: unusedFiles.length,
      locations: unusedFiles.map(f => ({
        file: f,
        note: 'Not imported by active pipeline components; may be dead code, deprecated agent, or unused template.',
      })),
    },
  },
};

console.log(JSON.stringify(finalReport, null, 2));

// Exit with error if strict mode is enabled and violations/unused files found
if (strictMode && (totalViolations > 0 || unusedFiles.length > 0)) {
  const violations = totalViolations > 0 ? `${totalViolations} violation(s)` : '';
  const unused = unusedFiles.length > 0 ? `${unusedFiles.length} unused file(s)` : '';
  const msg = `${violations}${violations && unused ? ', ' : ''}${unused}`;
  console.error(`\n❌ STRICT MODE: ${msg} found. CI will fail.`);
  process.exit(1);
} else if (strictMode && totalViolations === 0 && unusedFiles.length === 0) {
  console.error('\n✅ STRICT MODE: All checks passed. Pipeline is clean. CI will succeed.');
  process.exit(0);
} else {
  process.exit(0);
}
