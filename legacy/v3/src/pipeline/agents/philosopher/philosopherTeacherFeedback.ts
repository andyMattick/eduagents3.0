// PhilosopherTeacherFeedback.ts

export type TeacherFeedbackInput = {
  rewriteCount: number;
  rewriteReasons: string[];
  violations: { type: string; message?: string }[];
  constraintConflicts: { type: string; description: string }[];
  timeMismatch: boolean;
  bloomMismatch: boolean;
  distributionMismatch: boolean;
  lexicalIssues: string[];
  guardrailSummary?: string;
  qualityScore?: number;
};

export type TeacherFeedback = {
  summary: string;
  positives: string[];
  suggestions: string[];
  promptQualityScore?: number;
};

// --------------------------------------------------

function computeSeverity(input: TeacherFeedbackInput) {
  let friction = 0;

  if (input.rewriteCount > 3) friction++;
  if (input.constraintConflicts.length > 0) friction++;
  if (input.timeMismatch) friction++;
  if (input.bloomMismatch) friction++;
  if (input.distributionMismatch) friction++;
  if (input.lexicalIssues.length > 0) friction++;

  if (friction === 0 && input.rewriteCount === 0) return "excellent";
  if (friction <= 1) return "good";
  if (friction <= 3) return "moderate";
  return "heavy";
}

function buildSummary(input: TeacherFeedbackInput): string {
  const tier = computeSeverity(input);

  switch (tier) {
    case "excellent":
      return "Your prompt was exceptionally clear and aligned well with your goals. The assessment generated smoothly with no revisions needed.";
    case "good":
      return "Your prompt was clear overall. Only minor refinements were needed for alignment.";
    case "moderate":
      return "Your instructional intent was clear, though a few adjustments were needed to fully align the assessment.";
    default:
      return "Your goals were thoughtful, though the system needed several adjustments to interpret them precisely. Small refinements will improve consistency next time.";
  }
}

// --------------------------------------------------

export function generateTeacherFeedback(
  input: TeacherFeedbackInput
): TeacherFeedback {

  const positives: string[] = [];
  const suggestions: string[] = [];

  if (input.rewriteCount === 0) {
    positives.push("Your prompt structure was clear and easy to interpret.");
  }

  if (!input.timeMismatch) {
    positives.push("Your time expectations matched the assessment complexity.");
  }

  if (input.constraintConflicts.length === 0) {
    positives.push("Your constraints were consistent and coherent.");
  }

  if (!input.bloomMismatch) {
    positives.push("Your expectations around rigor were communicated clearly.");
  }

  if (positives.length === 0) {
    positives.push("Your instructional intent was thoughtful and well formed.");
  }

  if (input.rewriteCount > 3) {
    suggestions.push("Adding slightly more specificity to your instructions may reduce revisions.");
  }

  if (input.constraintConflicts.length > 0) {
    suggestions.push("Clarifying which constraints are most important can improve consistency.");
  }

  if (input.timeMismatch) {
    suggestions.push("Consider adjusting either time expectations or requested complexity.");
  }

  if (input.bloomMismatch) {
    suggestions.push("Specifying the intended cognitive depth (recall, application, analysis) can improve alignment.");
  }

  if (input.distributionMismatch) {
    suggestions.push("If you prefer a particular mix of question types or difficulty levels, specify that explicitly.");
  }

  if (input.lexicalIssues.length > 0) {
    suggestions.push("Specifying the intended reading level may help ensure language matches student readiness.");
  }

  if (suggestions.length === 0) {
    suggestions.push("You can experiment with naming specific standards or skills for even tighter alignment.");
  }

  return {
    summary: buildSummary(input),
    positives,
    suggestions,
    promptQualityScore: input.qualityScore
  };
}