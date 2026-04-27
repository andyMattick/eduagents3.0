#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const prismRoot = path.join(root, 'src', 'prism-v4');
const schemaRoot = path.join(prismRoot, 'schema');
const srcRoot = path.join(root, 'src');

const requiredCategoryDirs = ['domain', 'semantic', 'integration', 'view'];
const requiredReadmeMarkers = [
  '## Owns',
  '## May Consume',
  '## Must Never Contain',
  '## Must Never Do',
  '## Source Of Truth',
];

const allowedSchemaFieldExceptions = new Map([
  ['src/prism-v4/schema/view/AssignmentAggregate.ts', new Set(['difficultyProfile', 'averageDifficulty', 'perceivedDifficulty'])],
  ['src/prism-v4/schema/view/ClassAggregate.ts', new Set(['difficultyByAssessmentType', 'averageDifficulty'])],
  ['src/prism-v4/schema/semantic/DocumentSemanticInsights.ts', new Set(['difficultyProfile', 'difficulty'])],
  ['src/prism-v4/schema/semantic/ProblemTagVector.ts', new Set(['difficulty'])],
  ['src/prism-v4/schema/integration/ClassProfile.ts', new Set(['difficultyProfile'])],
  ['src/prism-v4/schema/integration/DifficultyInference.ts', new Set(['actualDifficulty', 'classDifficulty', 'predictedDifficulty'])],
  ['src/prism-v4/schema/integration/PRISMResponse.ts', new Set(['difficultyInferences'])],
  ['src/prism-v4/schema/integration/StudentPersona.ts', new Set(['difficultyProfile'])],
]);

const allowedSchemaTermExceptions = new Map([
  ['src/prism-v4/schema/semantic/ProblemTagVector.ts', new Set(['simulationTask'])],
]);

const failures = [];

const addFailure = (type, location, detail) => {
  failures.push({ type, location, detail });
};

const toRel = (absPath) => path.relative(root, absPath).replace(/\\/g, '/');

const readIfExists = (absPath) => {
  if (!fs.existsSync(absPath)) return null;
  return fs.readFileSync(absPath, 'utf8');
};

const walkFiles = (dir, predicate) => {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile() && predicate(full)) {
        out.push(full);
      }
    }
  }

  return out;
};

const validateStructure = () => {
  if (!fs.existsSync(prismRoot)) {
    addFailure('structure', 'src/prism-v4', 'Missing PRISM v4 root folder.');
    return;
  }

  const topReadme = readIfExists(path.join(prismRoot, 'README.md'));
  if (!topReadme) {
    addFailure('docs', 'src/prism-v4/README.md', 'Missing top-level PRISM v4 README.');
  } else {
    for (const requiredPhrase of [
      'PRISM is the only inference engine',
      'ClassInput is not a domain object',
      'View schemas are rendering projections only and are not persisted as business truth',
      'content_complexity',
      'predicted_difficulty',
      'immutable PRISM schema placeholders',
    ]) {
      if (!topReadme.includes(requiredPhrase)) {
        addFailure('docs', 'src/prism-v4/README.md', `Missing required phrase: ${requiredPhrase}`);
      }
    }
  }

  for (const category of requiredCategoryDirs) {
    const categoryDir = path.join(schemaRoot, category);
    const categoryReadme = path.join(categoryDir, 'README.md');

    if (!fs.existsSync(categoryDir)) {
      addFailure('structure', toRel(categoryDir), 'Missing required schema category directory.');
      continue;
    }

    const readmeText = readIfExists(categoryReadme);
    if (!readmeText) {
      addFailure('docs', toRel(categoryReadme), 'Missing category README.');
      continue;
    }

    for (const marker of requiredReadmeMarkers) {
      if (!readmeText.includes(marker)) {
        addFailure('docs', toRel(categoryReadme), `Missing required section: ${marker}`);
      }
    }
  }
};

const checkSchemaNaming = () => {
  const schemaFiles = walkFiles(schemaRoot, (file) => file.endsWith('.ts'));
  const forbiddenSchemaTerms = [
    /\bsimulationTask\b/g,
    /\bastronaut\b/gi,
    /\bplaytest\b/gi,
    /\bsimulateStudents\b/g,
  ];

  const allowedPredictedDifficultyFiles = new Set([
    'src/prism-v4/schema/integration/DifficultyInference.ts',
    'src/prism-v4/schema/integration/PRISMResponse.ts',
  ]);

  for (const file of schemaFiles) {
    const relPath = toRel(file);
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    const allowedTerms = allowedSchemaTermExceptions.get(relPath) ?? new Set();
    const allowedFields = allowedSchemaFieldExceptions.get(relPath) ?? new Set();

    lines.forEach((lineText, index) => {
      const lineNumber = index + 1;

      for (const pattern of forbiddenSchemaTerms) {
        pattern.lastIndex = 0;
        const match = pattern.exec(lineText);
        if (match && !allowedTerms.has(match[0])) {
          addFailure('schema', `${relPath}:${lineNumber}`, `Forbidden Phase 1 term: ${match[0]}`);
        }
      }

      const propertyMatch = lineText.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\??\s*:/);
      if (!propertyMatch) return;

      const propertyName = propertyMatch[1];
      const lowerName = propertyName.toLowerCase();
      const isDifficultyLike = lowerName.includes('difficulty');
      const isAllowedPredictedDifficulty = propertyName === 'predictedDifficulty' && allowedPredictedDifficultyFiles.has(relPath);
      const isAllowlistedField = allowedFields.has(propertyName);

      if (isDifficultyLike && !isAllowedPredictedDifficulty && !isAllowlistedField) {
        addFailure(
          'schema',
          `${relPath}:${lineNumber}`,
          `Forbidden local difficulty-like field in PRISM v4 schema: ${propertyName}`
        );
      }
    });
  }
};

const checkRepoDriftSignals = () => {
  const codeFiles = walkFiles(srcRoot, (file) => /\.(ts|tsx)$/.test(file));
  const excludedSegments = [
    '/src/pipeline/legacyV2/',
  ];
  const driftPatterns = [
    /\bastronaut\b/gi,
    /\bplaytest\b/gi,
    /\bsimulateStudents\b/g,
    /local simulation engine/gi,
    /approximate PRISM/gi,
  ];

  for (const file of codeFiles) {
    const relPath = toRel(file);
    if (excludedSegments.some((segment) => relPath.includes(segment.slice(1)))) continue;

    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);

    lines.forEach((lineText, index) => {
      const lineNumber = index + 1;

      for (const pattern of driftPatterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(lineText);
        if (match) {
          addFailure('drift', `${relPath}:${lineNumber}`, `Simulation-era drift signal: ${match[0]}`);
          break;
        }
      }
    });
  }
};

validateStructure();
checkSchemaNaming();
checkRepoDriftSignals();

if (failures.length > 0) {
  console.error('PRISM Phase 1 check failed.');
  console.error('');

  for (const failure of failures) {
    console.error(`[${failure.type}] ${failure.location}`);
    console.error(`  ${failure.detail}`);
  }

  console.error('');
  console.error(`Total failures: ${failures.length}`);
  process.exit(1);
}

console.log('PRISM Phase 1 check passed.');