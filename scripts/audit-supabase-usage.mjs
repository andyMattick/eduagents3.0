#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const timestamp = new Date().toISOString();

const defaultTables = [
  'old_items',
  'legacy_documents',
  'v3_segments',
  'v4_items',
  'simulation_cache',
  'v4_sections',
  'v4_analysis',
  'user_daily_simulations_legacy',
  'cognitive_templates',
  'simulation_runs',
  'simulation_results',
  'classes',
  'synthetic_students',
];

const args = process.argv.slice(2);
const tableArg = args.find((arg) => arg.startsWith('--tables='));
const strictMode = args.includes('--strict');
const outputArg = args.find((arg) => arg.startsWith('--output='));

const tables = tableArg
  ? tableArg
      .replace('--tables=', '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  : defaultTables;

const outputPath = outputArg
  ? path.resolve(root, outputArg.replace('--output=', ''))
  : path.join(root, 'SUPABASE_USAGE_AUDIT.json');

const scanRoots = [
  'src',
  'api',
  'lib',
  'scripts',
  'tests',
  'supabase',
  'app',
  'config',
].map((dir) => path.join(root, dir)).filter((dir) => fs.existsSync(dir));

const skipDirs = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.turbo', 'coverage']);
const fileExtensions = /\.(ts|tsx|js|jsx|mjs|cjs|json|sql|md)$/i;
const selfScriptRelPath = 'scripts/audit-supabase-usage.mjs';

function toRel(absPath) {
  return path.relative(root, absPath).replace(/\\/g, '/');
}

function walkFiles(startDir) {
  const out = [];
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
      } else if (entry.isFile() && fileExtensions.test(entry.name)) {
        out.push(fullPath);
      }
    }
  }

  return out;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function classifyReference(lineText, table) {
  const text = lineText.toLowerCase();
  const tableLower = table.toLowerCase();

  if (new RegExp(`\\bsupabaserest\\s*\\(\\s*['\"\\\`]${escapeRegex(tableLower)}['\"\\\`]`).test(text)) {
    return 'api-call';
  }
  if (new RegExp(`\\bfrom\\s+${escapeRegex(tableLower)}\\b`).test(text) || new RegExp(`\\bjoin\\s+${escapeRegex(tableLower)}\\b`).test(text)) {
    return 'sql-read';
  }
  if (new RegExp(`\\b(insert\\s+into|update|delete\\s+from|truncate\\s+table|drop\\s+table)\\b.*\\b${escapeRegex(tableLower)}\\b`).test(text)) {
    return 'sql-write';
  }
  if (text.includes('policy') || text.includes('rls')) {
    return 'policy';
  }
  if (text.includes('trigger') || text.includes('function') || text.includes('rpc')) {
    return 'function-trigger';
  }

  return 'reference';
}

const files = scanRoots.flatMap((dir) => walkFiles(dir));
const findingsByTable = Object.fromEntries(tables.map((table) => [table, []]));

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const relPath = toRel(file);

  if (relPath === selfScriptRelPath) {
    continue;
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    for (const table of tables) {
      const regex = new RegExp(`(^|[^a-z0-9_])${escapeRegex(table)}([^a-z0-9_]|$)`, 'i');
      if (!regex.test(line)) {
        continue;
      }

      findingsByTable[table].push({
        path: relPath,
        line: i + 1,
        category: classifyReference(line, table),
        excerpt: line.trim().slice(0, 220),
      });
    }
  }
}

const tableReports = tables.map((table) => {
  const findings = findingsByTable[table];
  const byFile = new Map();

  for (const finding of findings) {
    if (!byFile.has(finding.path)) {
      byFile.set(finding.path, []);
    }
    byFile.get(finding.path).push({
      line: finding.line,
      category: finding.category,
      excerpt: finding.excerpt,
    });
  }

  const filesReport = Array.from(byFile.entries())
    .map(([filePath, matches]) => ({ filePath, count: matches.length, matches }))
    .sort((a, b) => a.filePath.localeCompare(b.filePath));

  const categoryCounts = findings.reduce((acc, finding) => {
    acc[finding.category] = (acc[finding.category] ?? 0) + 1;
    return acc;
  }, {});

  return {
    table,
    totalReferences: findings.length,
    filesReferenced: filesReport.length,
    categoryCounts,
    cleanupCandidate: findings.length === 0,
    files: filesReport,
  };
});

const totalReferences = tableReports.reduce((sum, table) => sum + table.totalReferences, 0);
const cleanupCandidates = tableReports.filter((table) => table.cleanupCandidate).map((table) => table.table);
const referencedTables = tableReports.filter((table) => !table.cleanupCandidate).map((table) => table.table);

const report = {
  metadata: {
    generatedAt: timestamp,
    root,
    strictMode,
    scannedRoots: scanRoots.map((dir) => toRel(dir)),
    tables,
  },
  summary: {
    totalTables: tables.length,
    totalReferences,
    cleanupCandidateCount: cleanupCandidates.length,
    referencedTableCount: referencedTables.length,
    cleanupCandidates,
    referencedTables,
  },
  tables: tableReports,
};

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Supabase usage audit written to ${toRel(outputPath)}.`);
console.log(`Scanned ${files.length} files across ${scanRoots.length} roots.`);
console.log(`Tables referenced: ${referencedTables.length}/${tables.length}.`);

if (strictMode && referencedTables.length > 0) {
  console.error('Strict mode enabled: one or more tables still have references.');
  process.exit(1);
}
