// pipeline/agents/scribe/CompensationEngine.ts

export class CompensationEngine {
  static generateCompensation(dossier: any, context: any) {
    const weaknesses = dossier?.weaknessCategories ?? {};
    const strengths = dossier?.strengths ?? {};

    const compensation: Record<string, string> = {};

    // Example: pacing
    if (weaknesses.pacing > 3) {
      compensation.pacing = "Keep question length concise and consistent.";
    }

    // Example: difficulty alignment
    if (weaknesses.difficultyAlignment > 3) {
      compensation.difficulty = "Match difficulty exactly to the blueprint.";
    }

    // Example: JSON validity
    if (weaknesses.jsonValidity > 2) {
      compensation.json = "Double-check JSON structure before returning.";
    }

    // Strength reinforcement
    if (strengths.categories?.includes("pacing")) {
      compensation.pacingReinforcement = "Maintain your strong pacing consistency.";
    }

    return compensation;
  }
}
