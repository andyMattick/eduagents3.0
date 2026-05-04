#!/usr/bin/env node
/**
 * audit-measurables.mjs
 *
 * Scans the repo for all measurable + immeasurable fields currently used
 * across ingestion, simulation, UI, DB types, and tests.
 *
 * Outputs:
 *   - CURRENT_MEASURABLES_MAP.json
 *   - CURRENT_IMMEASURABLES_MAP.json
 */

import fs from "fs";
import path from "path";

const ROOTS = [
  "src",
  "tests",
  "supabase",
  "scripts",
  "app",
];

const MEASURABLE_KEYWORDS = [
  "linguisticLoad",
  "cognitiveLoad",
  "bloom",
  "bloomLevel",
  "difficulty",
  "surfaceDifficulty",
  "conceptDensity",
  "representationLoad",
  "itemLength",
  "readingComplexity",
  "pCorrect",
  "confusion",
  "timeSeconds",
  "time",
  "traits",
];

const IMMEASURABLE_KEYWORDS = [
  "fatigue",
  "spikes",
  "cliffs",
  "momentum",
  "confidenceInterval",
  "predictedState",
  "predictedDifficultyCurve",
  "predictedTimeCurve",
  "predictedConfusionCurve",
  "traitDelta",
  "traitDeltas",
  "profileNarrative",
  "comparisonNarrative",
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      results.push(full);
    }
  });
  return results;
}

function scanFiles() {
  const files = ROOTS.flatMap((root) =>
    fs.existsSync(root) ? walk(root) : []
  );

  const measurableHits = {};
  const immeasurableHits = {};

  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      // skip binary or unreadable files
      continue;
    }

    MEASURABLE_KEYWORDS.forEach((key) => {
      if (text.includes(key)) {
        measurableHits[key] = measurableHits[key] || [];
        measurableHits[key].push(file);
      }
    });

    IMMEASURABLE_KEYWORDS.forEach((key) => {
      if (text.includes(key)) {
        immeasurableHits[key] = immeasurableHits[key] || [];
        immeasurableHits[key].push(file);
      }
    });
  }

  return { measurableHits, immeasurableHits };
}

function writeJSON(filename, data) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
}

const { measurableHits, immeasurableHits } = scanFiles();

writeJSON("CURRENT_MEASURABLES_MAP.json", {
  scannedRoots: ROOTS,
  measurables: measurableHits,
  unused: Object.fromEntries(
    MEASURABLE_KEYWORDS
      .filter((k) => !measurableHits[k])
      .map((k) => [k, []])
  ),
});

writeJSON("CURRENT_IMMEASURABLES_MAP.json", {
  scannedRoots: ROOTS,
  immeasurables: immeasurableHits,
  unused: Object.fromEntries(
    IMMEASURABLE_KEYWORDS
      .filter((k) => !immeasurableHits[k])
      .map((k) => [k, []])
  ),
});

console.log("Measurable + Immeasurable audit complete.");
console.log(`  Measurables found:   ${Object.keys(measurableHits).length} / ${MEASURABLE_KEYWORDS.length}`);
console.log(`  Immeasurables found: ${Object.keys(immeasurableHits).length} / ${IMMEASURABLE_KEYWORDS.length}`);
