#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const prismRoot = path.join(root, 'src', 'prism-v4');
const semanticRoot = path.join(prismRoot, 'semantic');

const failures = [];

const requiredFiles = [
  'src/prism-v4/semantic/pipeline/runSemanticPipeline.ts',
  'src/prism-v4/semantic/extract/extractProblem.ts',
  'src/prism-v4/semantic/extract/extractProblemMetadata.ts',
  'src/prism-v4/semantic/extract/extractTables.ts',
  'src/prism-v4/semantic/tag/tagConcepts.ts',
  'src/prism-v4/semantic/tag/tagLinguisticLoad.ts',
  'src/prism-v4/semantic/tag/tagBloom.ts',
  'src/prism-v4/semantic/tag/tagRepresentation.ts',
  'src/prism-v4/semantic/tag/tagMisconceptionTriggers.ts',
  'src/prism-v4/semantic/tag/tagStandards.ts',
  'src/prism-v4/semantic/tag/buildProblemTagVector.ts',
  'src/prism-v4/semantic/document/buildDocumentInsights.ts',
  'src/prism-v4/semantic/document/buildConceptGraph.ts',
  'src/prism-v4/semantic/tests/semanticPipeline.test.ts',
];

const requiredRunnerMarkers = [
  'TaggingPipelineInput',
  'TaggingPipelineOutput',
  'extractProblems',
  'extractProblemMetadata',
  'extractTables',
  'tagConcepts',
  'tagLinguisticLoad',
  'tagBloom',
  'tagRepresentation',
  'tagMisconceptionTriggers',
  'tagStandards',
  'buildProblemTagVector',
  'buildDocumentInsights',
  'buildConceptGraph',
  'documentInsights',
  'problems',
  'problemVectors',
];

const forbiddenTextPatterns = [
  { pattern: /\bStudentPersona\b/g, label: 'StudentPersona' },
  { pattern: /\bClassProfile\b/g, label: 'ClassProfile' },
  { pattern: /\bPRISMResponse\b/g, label: 'PRISMResponse' },
  { pattern: /\bastronaut\b/gi, label: 'astronaut' },
  { pattern: /\bplaytest\b/gi, label: 'playtest' },
  { pattern: /\bsimulateStudents\b/g, label: 'simulateStudents' },
  { pattern: /\bmastery\b/gi, label: 'mastery' },
  { pattern: /\bpersona\b/gi, label: 'persona' },
  { pattern: /\bpredicted(?:Difficulty|Accuracy|AverageDistance)?\b/g, label: 'predicted*' },
];

const forbiddenImportPatterns = [
  { pattern: /from\s+['"][^'"]*ingestion[^'"]*['"]/g, label: 'ingestion import' },
  { pattern: /from\s+['"][^'"]*schema\/integration[^'"]*['"]/g, label: 'integration schema import' },
  { pattern: /from\s+['"][^'"]*\/integration\/[^'"]*['"]/g, label: 'integration import' },
  { pattern: /from\s+['"]pipeline\/[^'"]*['"]/g, label: 'pipeline-layer import' },
  { pattern: /from\s+['"]@\/pipeline\/[^'"]*['"]/g, label: 'pipeline-layer import' },
  { pattern: /from\s+['"]\/?src\/pipeline\/[^'"]*['"]/g, label: 'pipeline-layer import' },
  { pattern: /from\s+['"][^'"]*\/orchestrator\/[^'"]*['"]/g, label: 'orchestrator import' },
];

const addFailure = (type, location, detail) => {
  failures.push({ type, location, detail });
};

const toRel = (absPath) => path.relative(root, absPath).replace(/\\/g, '/');

const walkFiles = (dir, predicate) => {
  const out = [];
  if (!fs.existsSync(dir)) return out;

  const stack = [dir];
  while (stack.length > 0) {
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

const validateRequiredFiles = () => {
  for (const relPath of requiredFiles) {
    const absPath = path.join(root, relPath);
    if (!fs.existsSync(absPath)) {
      addFailure('structure', relPath, 'Missing required Phase 3 semantic file.');
    }
  }
};

const validateRunner = () => {
  const runnerPath = path.join(semanticRoot, 'pipeline', 'runSemanticPipeline.ts');
  if (!fs.existsSync(runnerPath)) return;

  const text = fs.readFileSync(runnerPath, 'utf8');
  for (const marker of requiredRunnerMarkers) {
    if (!text.includes(marker)) {
      addFailure('runner', toRel(runnerPath), `Missing required runner marker: ${marker}`);
    }
  }
};

const validateBoundaries = () => {
  const files = walkFiles(semanticRoot, (file) => file.endsWith('.ts') || file.endsWith('.tsx'));

  for (const file of files) {
    const relPath = toRel(file);
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);

    lines.forEach((lineText, index) => {
      const lineNumber = index + 1;

      for (const { pattern, label } of forbiddenTextPatterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(lineText);
        if (match) {
          addFailure('boundary', `${relPath}:${lineNumber}`, `Forbidden semantic term: ${label}`);
          break;
        }
      }

      for (const { pattern, label } of forbiddenImportPatterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(lineText);
        if (match) {
          addFailure('coupling', `${relPath}:${lineNumber}`, `Forbidden semantic coupling: ${label}`);
          break;
        }
      }
    });
  }
};

if (!fs.existsSync(prismRoot)) {
  addFailure('structure', 'src/prism-v4', 'Missing PRISM v4 root folder.');
} else if (!fs.existsSync(semanticRoot)) {
  addFailure('structure', 'src/prism-v4/semantic', 'Missing Phase 3 semantic root folder.');
} else {
  validateRequiredFiles();
  validateRunner();
  validateBoundaries();
}

if (failures.length > 0) {
  console.error('PRISM Phase 3 check failed.');
  console.error('');

  for (const failure of failures) {
    console.error(`[${failure.type}] ${failure.location}`);
    console.error(`  ${failure.detail}`);
  }

  console.error('');
  console.error(`Total failures: ${failures.length}`);
  process.exit(1);
}

console.log('PRISM Phase 3 check passed.');
