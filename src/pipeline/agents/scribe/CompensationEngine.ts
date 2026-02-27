// pipeline/agents/scribe/CompensationEngine.ts
//
// Reads a domain-specific AgentDossierData and emits prompt-level
// compensation hints tailored to that subject's track record.
// ─────────────────────────────────────────────────────────

export class CompensationEngine {
  static generateCompensation(dossier: any, context: any) {
    const weaknesses: Record<string, number> = dossier?.weaknesses ?? {};
    const mastery = dossier?.domainMastery ?? { runs: 0, cleanRuns: 0 };
    const domain = context?.domain ?? "this subject";

    const compensation: Record<string, string> = {};

    // ── Weakness-driven hints ────────────────────────────

    if ((weaknesses["pacing_violation"] ?? 0) > 3) {
      compensation.pacing = `Keep ${domain} question length concise and consistent.`;
    }

    if ((weaknesses["difficulty_mismatch"] ?? 0) > 3) {
      compensation.difficulty = `Match ${domain} difficulty exactly to the blueprint.`;
    }

    if ((weaknesses["mcq_options_invalid"] ?? 0) > 2) {
      compensation.json = "Double-check JSON structure before returning.";
    }

    if ((weaknesses["topic_mismatch"] ?? 0) > 2) {
      compensation.topic = `Stay strictly on-topic for ${domain} — reference the lesson directly.`;
    }

    if ((weaknesses["cognitive_demand_mismatch"] ?? 0) > 2) {
      compensation.bloom = "Use Bloom-aligned verbs that match the slot's cognitive demand.";
    }

    // ── Domain mastery reinforcement ─────────────────────

    if (mastery.runs >= 3 && mastery.cleanRuns / mastery.runs >= 0.8) {
      compensation.domainReinforcement =
        `You have a strong track record in ${domain} (${mastery.cleanRuns}/${mastery.runs} clean runs). Maintain quality.`;
    } else if (mastery.runs >= 5 && mastery.cleanRuns / mastery.runs < 0.5) {
      compensation.domainWarning =
        `${domain} has been inconsistent (${mastery.cleanRuns}/${mastery.runs} clean). Pay extra attention to quality for this subject.`;
    }

    // ── Trust-based tone adjustment ──────────────────────

    const trust = dossier?.trustScore ?? 5;
    if (trust <= 3) {
      compensation.trustWarning =
        `Your ${domain} trust score is low (${trust}/10). Follow the blueprint precisely — no embellishments.`;
    }

    return compensation;
  }
}
