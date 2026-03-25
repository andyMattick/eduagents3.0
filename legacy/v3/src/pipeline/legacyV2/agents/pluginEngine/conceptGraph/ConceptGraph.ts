/**
 * conceptGraph/ConceptGraph.ts — In-memory concept graph for tagging + analytics.
 *
 * Builds a graph of concepts, skills, and standards from generated problems.
 * Provides analytics on concept coverage, relationships, and gaps.
 *
 * Master Spec §16: Every generated problem must include concepts[], skills[], standards[].
 */

import type {
  Concept,
  Skill,
  Standard,
  ConceptRelationship,
  ProblemConceptTags,
  ConceptGraphSnapshot,
} from "./types";

export class ConceptGraph {
  private concepts = new Map<string, Concept>();
  private skills = new Map<string, Skill>();
  private standards = new Map<string, Standard>();
  private relationships: ConceptRelationship[] = [];
  private problemTags: ProblemConceptTags[] = [];

  // ─── Registration ──────────────────────────────────────────────────────

  registerConcept(concept: Concept): void {
    this.concepts.set(concept.id, concept);
  }

  registerSkill(skill: Skill): void {
    this.skills.set(skill.id, skill);
  }

  registerStandard(standard: Standard): void {
    this.standards.set(standard.id, standard);
  }

  addRelationship(rel: ConceptRelationship): void {
    this.relationships.push(rel);
  }

  // ─── Problem Tagging ──────────────────────────────────────────────────

  /**
   * tagProblem — record the concepts, skills, and standards for a generated problem.
   * Called by SCRIBE after each problem is generated and validated.
   */
  tagProblem(tags: ProblemConceptTags): void {
    this.problemTags.push(tags);

    // Auto-register any concept/skill/standard we haven't seen before
    for (const c of tags.concepts) {
      const id = this.normalizeId(c);
      if (!this.concepts.has(id)) {
        this.concepts.set(id, { id, name: c, domain: "auto-detected" });
      }
    }
    for (const s of tags.skills) {
      const id = this.normalizeId(s);
      if (!this.skills.has(id)) {
        this.skills.set(id, { id, name: s });
      }
    }
    for (const st of tags.standards) {
      const id = this.normalizeId(st);
      if (!this.standards.has(id)) {
        this.standards.set(id, { id, code: st, description: "", domain: "auto-detected" });
      }
    }
  }

  // ─── Analytics ─────────────────────────────────────────────────────────

  /**
   * getSnapshot — return the full graph state for analytics/reporting.
   */
  getSnapshot(expectedConcepts?: string[]): ConceptGraphSnapshot {
    const assessedSet = new Set<string>();
    for (const pt of this.problemTags) {
      for (const c of pt.concepts) {
        assessedSet.add(this.normalizeId(c));
      }
    }

    const allConceptIds = [...this.concepts.keys()];
    const expectedNorm = (expectedConcepts ?? allConceptIds).map((c) => this.normalizeId(c));
    const missing = expectedNorm.filter((c) => !assessedSet.has(c));

    return {
      concepts: [...this.concepts.values()],
      skills: [...this.skills.values()],
      standards: [...this.standards.values()],
      relationships: this.relationships,
      problemTags: this.problemTags,
      coverage: {
        totalConcepts: expectedNorm.length,
        assessedConcepts: assessedSet.size,
        coverageRatio:
          expectedNorm.length === 0
            ? 1.0
            : Math.round((assessedSet.size / expectedNorm.length) * 100) / 100,
        missingConcepts: missing,
      },
    };
  }

  /**
   * getConceptFrequency — how many problems assess each concept.
   */
  getConceptFrequency(): Record<string, number> {
    const freq: Record<string, number> = {};
    for (const pt of this.problemTags) {
      for (const c of pt.concepts) {
        const id = this.normalizeId(c);
        freq[id] = (freq[id] ?? 0) + 1;
      }
    }
    return freq;
  }

  /**
   * getSkillFrequency — how many problems exercise each skill.
   */
  getSkillFrequency(): Record<string, number> {
    const freq: Record<string, number> = {};
    for (const pt of this.problemTags) {
      for (const s of pt.skills) {
        const id = this.normalizeId(s);
        freq[id] = (freq[id] ?? 0) + 1;
      }
    }
    return freq;
  }

  /**
   * findPrerequisites — walk the graph to find all prerequisites of a concept.
   */
  findPrerequisites(conceptId: string): string[] {
    const visited = new Set<string>();
    const queue = [this.normalizeId(conceptId)];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const rel of this.relationships) {
        if (rel.to === current && rel.type === "prerequisite" && !visited.has(rel.from)) {
          queue.push(rel.from);
        }
      }
    }

    visited.delete(this.normalizeId(conceptId));
    return [...visited];
  }

  // ─── Utilities ─────────────────────────────────────────────────────────

  clear(): void {
    this.concepts.clear();
    this.skills.clear();
    this.standards.clear();
    this.relationships = [];
    this.problemTags = [];
  }

  private normalizeId(s: string): string {
    return s.toLowerCase().trim().replace(/\s+/g, "_");
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: ConceptGraph | null = null;

export function getConceptGraph(): ConceptGraph {
  if (!_instance) {
    _instance = new ConceptGraph();
  }
  return _instance;
}

export function resetConceptGraph(): void {
  _instance = new ConceptGraph();
}
