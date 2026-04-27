#!/usr/bin/env bash
set -euo pipefail

# Reporting-only legacy scan. This emits a structured JSON report and always exits 0.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node scripts/report-legacy-patterns.mjs
