import type {
  ProblemPlugin,
  ProblemSlot,
  GenerationContext,
  TemplateGeneratedProblem,
    GeneratedProblem,
  ValidationResult
} from "../../../interfaces/problemPlugin";

// Local helper
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const algebraic_fluency_template: ProblemPlugin = {
  id: "algebraic_fluency_template",
  generationType: "template",
    supportedTopics: ["algebra", "expressions", "variables", "polynomials"],
  async generate(
    slot: ProblemSlot,
    _context: GenerationContext
  ): Promise<TemplateGeneratedProblem> {
    const difficulty = slot.difficulty ?? "medium";

    let problem;
    if (difficulty === "easy") problem = generateEasyExpression();
    else if (difficulty === "hard") problem = generateHardExpression();
    else problem = generateMediumExpression();

    return {
      slot_id: slot.slot_id,
      prompt: problem.prompt,
      answer: problem.answer,
      //options: null,
      metadata: {
        difficulty,
        template: "algebraic_fluency_template"
      }
    };
  },

  validate(problem: GeneratedProblem, _slot: ProblemSlot): ValidationResult
{
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!problem.prompt || typeof problem.prompt !== "string") {
      errors.push("Missing or invalid prompt.");
    }

    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
};

// ─────────────────────────────────────────────
// Expression generators
// ─────────────────────────────────────────────

function generateEasyExpression() {
  const a = randInt(2, 9);
  const b = randInt(2, 9);
  return {
    prompt: `Simplify: ${a}x + ${b}x`,
    answer: `${a + b}x`
  };
}

function generateMediumExpression() {
  const a = randInt(2, 6);
  const b = randInt(2, 6);
  const c = randInt(1, 5);
  return {
    prompt: `Simplify: ${a}(x + ${b}) + ${c}`,
    answer: `${a}x + ${a * b + c}`
  };
}

function generateHardExpression() {
  const a = randInt(1, 5);
  const b = randInt(1, 5);
  const c = randInt(1, 5);
  return {
    prompt: `Simplify: ${a}x^2 + ${b}x^2 - ${c}x^2`,
    answer: `${a + b - c}x^2`
  };
}
