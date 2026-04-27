#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const strictMode = process.env.V4_HEATMAP_STRICT === 'true' || process.argv.includes('--strict');

const allowedPathPrefixes = [
  'src/pipeline/legacyV2/',
  'legacy/v3/',
];

const allowlistedMatches = new Map([
  ['src/prism-v4/schema/integration/StudentPersona.ts', new Set(['StudentPersona', 'difficultyProfile', 'mastery'])],
  ['src/prism-v4/schema/integration/ClassProfile.ts', new Set(['StudentPersona', 'ClassProfile', 'difficultyProfile', 'mastery', 'persona', 'risk'])],
  ['src/prism-v4/schema/integration/PRISMResponse.ts', new Set(['StudentPersona', 'ClassProfile', 'persona'])],
  ['src/prism-v4/schema/integration/ClassInput.ts', new Set(['StudentPersona', 'ProblemScore'])],
  ['src/prism-v4/schema/integration/README.md', new Set(['StudentPersona', 'ClassProfile'])],
  ['src/prism-v4/schema/integration/index.ts', new Set(['StudentPersona', 'ClassProfile'])],
  ['src/prism-v4/schema/integration/DifficultyInference.ts', new Set(['predictedDifficulty'])],
  ['src/prism-v4/schema/integration/MisconceptionDefinition.ts', new Set(['cluster'])],
  ['src/prism-v4/schema/domain/ProblemScore.ts', new Set(['ProblemScore'])],
  ['src/prism-v4/schema/domain/README.md', new Set(['ProblemScore'])],
  ['src/prism-v4/schema/domain/index.ts', new Set(['ProblemScore'])],
  ['src/prism-v4/schema/semantic/ProblemTagVector.ts', new Set(['risk'])],
  ['src/prism-v4/schema/view/AssignmentAggregate.ts', new Set(['difficultyProfile'])],
  ['src/prism-v4/README.md', new Set(['difficultyProfile', 'simulate', 'astronaut', 'playtest'])],
]);

const patternBuckets = {
  forbiddenModelShapes: [
    { label: 'difficultyProfile', regex: /\bdifficultyProfile\b/g },
    { label: 'studentTraps', regex: /\bstudentTraps\b/g },
    { label: 'misconceptionScore', regex: /\bmisconceptionScore\b/g },
    { label: 'predictedDifficulty', regex: /\bpredictedDifficulty\b/g },
    { label: 'fallbackDifficulty', regex: /\bfallbackDifficulty\b/g },
    { label: 'learningObjective', regex: /\blearningObjective\b/g },
    { label: 'skillId', regex: /\bskillId\b/g },
    { label: 'strand', regex: /\bstrand\b/g },
    { label: 'cluster', regex: /\bcluster\b/g },
    { label: 'taxonomyLevel', regex: /\btaxonomyLevel\b/g },
  ],
  forbiddenLogic: [
    { label: 'simulate', regex: /\bsimulate(?:Students)?\b/g },
    { label: 'astronaut', regex: /\bastronaut\b/gi },
    { label: 'playtest', regex: /\bplaytest\b/gi },
    { label: 'mastery', regex: /\bmastery\b/gi },
    { label: 'persona', regex: /\bpersona\b/gi },
    { label: 'risk', regex: /\b(?:riskLevel|riskScore|feasibilityRisk|bloomRisk|atRiskProfile)\b/g },
    { label: 'scoreModel', regex: /\bscoreModel\b/g },
    { label: 'fallbackAnalytics', regex: /\bfallbackAnalytics\b/g },
  ],
  forbiddenIngestion: [
    { label: 'azure-vision', regex: /\bazure-vision\b/gi },
    { label: 'layout-parser', regex: /\blayout-parser\b/gi },
    { label: 'ocr', regex: /\bocr\b/gi },
    { label: 'pdfjs', regex: /\bpdfjs\b/gi },
    { label: 'extractTextFromPdf', regex: /\bextractTextFromPdf\b/g },
  ],
  forbiddenDomain: [
    { label: 'ProblemScore', regex: /\bProblemScore\b/g },
    { label: 'StudentProfile', regex: /\bStudentProfile\b/g },
    { label: 'ClassProfile', regex: /\bClassProfile\b/g },
    { label: 'AssignmentAnalytics', regex: /\bAssignmentAnalytics\b/g },
  ],
};

const report = Object.fromEntries(Object.keys(patternBuckets).map((bucket) => [bucket, {}]));

const toRel = (absPath) => path.relative(root, absPath).replace(/\\/g, '/');

const shouldSkipPath = (relPath) => {
  return allowedPathPrefixes.some((prefix) => relPath.startsWith(prefix));
};

const isAllowlistedMatch = (relPath, label) => {
  return allowlistedMatches.get(relPath)?.has(label) ?? false;
};

const walkFiles = (dir) => {
  const out = [];
  if (!fs.existsSync(dir)) return out;

  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (['.git', 'node_modules', 'dist'].includes(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx|mjs|md)$/i.test(entry.name)) {
        out.push(full);
      }
    }
  }

  return out;
};

const addHit = (bucket, relPath, line, label, text) => {
  if (!report[bucket][relPath]) {
    report[bucket][relPath] = [];
  }

  report[bucket][relPath].push({
    line,
    label,
    excerpt: text.trim(),
  });
};

for (const file of walkFiles(srcRoot)) {
  const relPath = toRel(file);
  if (shouldSkipPath(relPath)) continue;

  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    const lineNumber = index + 1;

    for (const [bucket, patterns] of Object.entries(patternBuckets)) {
      for (const { label, regex } of patterns) {
        regex.lastIndex = 0;
        if (regex.test(lineText) && !isAllowlistedMatch(relPath, label)) {
          addHit(bucket, relPath, lineNumber, label, lineText);
        }
      }
    }
  });
}

const bucketCounts = Object.fromEntries(
  Object.entries(report).map(([bucket, files]) => [bucket, Object.values(files).reduce((sum, hits) => sum + hits.length, 0)]),
);

const totalHits = Object.values(bucketCounts).reduce((sum, count) => sum + count, 0);

const output = {
  metadata: {
    scanDate: new Date().toISOString(),
    strictMode,
    root: root,
    skippedPrefixes: allowedPathPrefixes,
  },
  summary: {
    totalHits,
    bucketCounts,
    passed: totalHits === 0,
  },
  findings: report,
};

console.log(JSON.stringify(output, null, 2));

if (strictMode && totalHits > 0) {
  console.error(`\n❌ STRICT MODE: ${totalHits} heatmap hit(s) found.`);
  process.exit(1);
}
