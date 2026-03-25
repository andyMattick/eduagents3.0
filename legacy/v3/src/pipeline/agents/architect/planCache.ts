/**
 * planCache.ts
 *
 * In-process Architect plan cache.
 *
 * Cache levels:
 *   1. assessmentType + questionTypes + gradeLevels + questionCount
 *      + studentLevel + timeMinutes + classLevel (from teacherProfile)
 *
 * Volatile fields intentionally excluded from the key:
 *   topic, additionalDetails, sourceDocuments — these drive per-run LLM
 *   refinement inside runArchitect and must not be cache-collapsed.
 *
 * Production swap-in: replace the in-process Map with Redis / Upstash by
 * changing getArchitectPlanFromCache / setArchitectPlanInCache only.
 */

import type { Blueprint } from "pipeline/contracts/Blueprint";
import type { UnifiedAssessmentRequest } from "pipeline/contracts/UnifiedAssessmentRequest";
import type { TeacherProfile } from "@/types/teacherProfile";
import { runArchitect } from "./index";

// ── Storage ───────────────────────────────────────────────────────────────────

const _planCache = new Map<string, Blueprint>();

// ── Key construction ──────────────────────────────────────────────────────────

/**
 * Build a stable, deterministic cache key from the non-volatile fields of the
 * request context.  Arrays are sorted so that ["mc","sa"] and ["sa","mc"]
 * produce the same key.
 */
export function architectCacheKey(
  uar: UnifiedAssessmentRequest,
  teacherProfile?: TeacherProfile | null
): string {
  return JSON.stringify({
    assessmentType:  uar.assessmentType,
    gradeLevels:     [...(uar.gradeLevels ?? [])].sort(),
    questionCount:   uar.questionCount ?? null,
    questionTypes:   [...(uar.questionTypes ?? [])].sort(),
    studentLevel:    (uar as any).studentLevel ?? null,
    timeMinutes:     (uar as any).timeMinutes ?? (uar as any).time ?? null,
    // Teacher profile structural preference (affects slot count / bloom band)
    classLevel:      (teacherProfile as any)?.preferences?.classLevel ?? null,
  });
}

// ── Cache access ──────────────────────────────────────────────────────────────

/**
 * Return a deep-cloned cached Blueprint, or undefined on miss.
 * Always deep-clones so callers cannot mutate the cached template.
 */
export function getArchitectPlanFromCache(key: string): Blueprint | undefined {
  const cached = _planCache.get(key);
  if (!cached) return undefined;
  return JSON.parse(JSON.stringify(cached)) as Blueprint;
}

/** Store a deep-cloned Blueprint under the given key. */
export function setArchitectPlanInCache(key: string, blueprint: Blueprint): void {
  _planCache.set(key, JSON.parse(JSON.stringify(blueprint)));
}

/** Invalidate all cached plans (e.g. after teacher preferences change). */
export function clearArchitectPlanCache(): void {
  _planCache.clear();
}

/** Current number of cached plans — useful for telemetry / dev tools. */
export function getArchitectPlanCacheSize(): number {
  return _planCache.size;
}

// ── Cached wrapper ────────────────────────────────────────────────────────────

/**
 * runArchitectCached — drop-in replacement for runArchitect.
 *
 * Cache hit:  returns a cloned template plan with zero LLM cost.
 * Cache miss: runs the full Architect, stores the result, then returns it.
 *
 * The function signature deliberately mirrors runArchitect so it can be
 * substituted directly as the `fn` argument to runAgent().
 */
export async function runArchitectCached(params: {
  uar: UnifiedAssessmentRequest;
  agentId: string;
  compensation: any;
  teacherProfile?: TeacherProfile | null;
}): Promise<Blueprint> {
  const key = architectCacheKey(params.uar, params.teacherProfile);
  const cached = getArchitectPlanFromCache(key);

  if (cached) {
    console.info(
      `[ArchitectCache] HIT — returning cached plan. ` +
      `Cache size: ${_planCache.size}. Key (truncated): ${key.substring(0, 100)}…`
    );
    return cached;
  }

  const blueprint = await runArchitect(params);
  setArchitectPlanInCache(key, blueprint);

  console.info(
    `[ArchitectCache] MISS → plan stored. Cache size: ${_planCache.size}.`
  );
  return blueprint;
}
