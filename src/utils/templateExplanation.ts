export const INTENT_PHRASES: Record<string, string> = {
  analyze: "analyze information or ideas",
  compute: "perform calculations or procedural steps",
  justify: "make a claim and support it with evidence",
  explain: "explain reasoning or processes",
  compare: "compare ideas, texts, or data",
  evaluate: "evaluate correctness or effectiveness",
  create: "produce original work or solutions",
  plan: "design or plan a solution or investigation",
  interpret: "interpret meaning, vocabulary, or data",
  identify: "identify key details or features",
  sequence: "sequence events or steps",
  apply: "apply learned skills or concepts",
  solve: "solve problems using appropriate strategies",
};

export const STIMULUS_PHRASES: Record<string, string> = {
  passage: "a short reading passage",
  diagram: "a diagram or labeled visual",
  table: "a data table",
  graph: "a graph or chart",
  code: "a code snippet",
  scenario: "a real-world scenario",
  none: "a brief prompt",
};

export const RESPONSE_PHRASES: Record<string, string> = {
  short_answer: "short written",
  constructed_response: "multi-sentence written",
  multiple_choice: "multiple-choice",
  code: "code-based",
  diagram_labeling: "labeling",
  sequence: "ordering",
  identify: "identification",
};

export function deriveQualifiers(config: any): string[] {
  if (!config) return [];
  const q: string[] = [];
  if (config.requiresEvidence) q.push("using evidence");
  if (config.requiresInference) q.push("by making inferences");
  if (config.questionPattern === "analysis") q.push("through analytical reasoning");
  if (config.questionPattern === "comparison") q.push("by comparing key ideas");
  return q;
}

export function generateTemplateExplanation(template: any): string {
  const intent = INTENT_PHRASES[template.cognitiveIntent] ?? "complete the intended task";
  const stimulus = STIMULUS_PHRASES[template.sharedContext] ?? "a brief prompt";
  const response = RESPONSE_PHRASES[template.itemType] ?? "written";

  const qualifiers = deriveQualifiers(template.configurableFields);
  const qualifierText = qualifiers.length ? " " + qualifiers.join(" ") : "";

  return `Use this when students need to ${intent} using ${stimulus}${qualifierText}, typically through a ${response} response.`;
}
