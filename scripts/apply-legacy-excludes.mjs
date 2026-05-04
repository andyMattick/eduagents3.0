#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const vscodeDir = path.join(root, '.vscode');
const settingsPath = path.join(vscodeDir, 'settings.json');
const generatedPath = path.join(vscodeDir, 'legacy-files.exclude.generated.json');

if (!fs.existsSync(generatedPath)) {
  console.error('Generated exclude file not found: .vscode/legacy-files.exclude.generated.json');
  process.exit(1);
}

const generatedRaw = fs.readFileSync(generatedPath, 'utf8');
const generated = JSON.parse(generatedRaw);
const generatedExclude = generated['files.exclude'] ?? {};

if (!fs.existsSync(vscodeDir)) {
  fs.mkdirSync(vscodeDir, { recursive: true });
}

let settings = {};
if (fs.existsSync(settingsPath)) {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
}

const existingExclude = settings['files.exclude'] ?? {};
const mergedExclude = {
  ...existingExclude,
  ...generatedExclude,
};

settings['files.exclude'] = mergedExclude;

fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');

const mergedKeys = Object.keys(generatedExclude);
console.log(`Merged ${mergedKeys.length} generated files.exclude entries into .vscode/settings.json.`);
for (const key of mergedKeys) {
  console.log(`  - ${key}`);
}
