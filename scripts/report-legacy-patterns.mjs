#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pipelineRoot = path.join(root, 'src', 'pipeline');

const isAllowedPath = (absPath) => {
  const rel = path.relative(root, absPath).replace(/\\/g, '/');
  if (rel.startsWith('src/pipeline/agents/writer/')) return true;
  if (rel === 'src/pipeline/utils/itemNormalizer.ts') return true;
  if (rel.startsWith('src/pipeline/contracts/')) return true;
  return false;
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
        stack.push(full);
      } else if (entry.isFile() && full.endsWith('.ts')) {
        out.push(full);
      }
    }
  }

  return out;
};

const patterns = {
  flatFieldAccess: /\bitem\.(prompt|answer|options|passage)\b(?:\s*(?:\?\?|\|\||&&)|\.[A-Za-z_][A-Za-z0-9_]*\s*\(|\.[A-Za-z_][A-Za-z0-9_]*|)/g,
  legacySchemaFields: /\b(problemText|correctAnswer|problemType|problemOptions)\b/g,
  legacyMutations: /\bitem\.(prompt|answer|options|passage)\s*=/g,
  slotMutations: /\bslot\.(questionType|difficulty|cognitiveDemand)\s*=/g,
};

const report = {
  flatFieldAccess: {},
  legacySchemaFields: {},
  legacyMutations: {},
  slotMutations: {},
};

const addHit = (bucketName, relPath, line, pattern) => {
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

console.log(JSON.stringify(report, null, 2));
process.exit(0);
