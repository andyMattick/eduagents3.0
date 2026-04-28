"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/simulator/segment.ts
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));
var init_supabase = __esm({
  "lib/supabase.ts"() {
    "use strict";
  }
});
var require_templates = __commonJS({
  "src/prism-v4/semantic/cognitive/templates/templates.json"(exports, module) {
    module.exports = [
      { id: "definition-basic", subject: "generic", name: "Definition", archetypeKey: "definition", description: "Identify or define a concept, term, or idea.", patternConfig: { textPatterns: ["define", "what is", "explain the meaning", "give the definition"], structuralPatterns: [], regexPatterns: ["define\\s+", "what\\s+is\\s+"], minConfidence: 0.2 }, boosts: { bloom: { remember: 0.4, understand: 0.3, apply: 0.1, analyze: 0.05, evaluate: 0.05, create: 0 }, multiStepBoost: 0.05, difficultyBoost: -0.05, misconceptionRiskBoost: 0.02 }, stepHints: { expectedSteps: 1, stepType: "definition" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "code-reasoning-basic", subject: "generic", name: "Code Reasoning", archetypeKey: "code-interpretation", description: "Interpret simple code snippets and predict their behavior or output.", patternConfig: { textPatterns: ["code", "loop", "output", "predict the output"], structuralPatterns: ["hasCodeLikeContent"], regexPatterns: ["for\\s*\\(", "while\\s*\\(", "if\\s*\\(", "console\\.log", "\\{[^}]*\\}"], minConfidence: 0.4 }, boosts: { bloom: { remember: 0.1, understand: 0.4, apply: 0.3, analyze: 0.15, evaluate: 0.05, create: 0 }, multiStepBoost: 0.1, difficultyBoost: 0.05, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "code-interpretation" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "interpretation", subject: "generic", name: "Interpretation", archetypeKey: "interpretation", description: "Interpret meaning from text, model, or source material.", patternConfig: { textPatterns: ["interpret", "explain", "conclude", "what does this mean"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.2, apply: 0, analyze: 0.3, evaluate: 0.2, create: 0 }, multiStepBoost: 0.1, difficultyBoost: 0.08, misconceptionRiskBoost: 0.05 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "evidence-evaluation", subject: "generic", name: "Evidence Evaluation", archetypeKey: "evidence-evaluation", description: "Use evidence to support, justify, or evaluate a claim.", patternConfig: { textPatterns: ["evidence", "support", "justify", "best supports", "which claim"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0, analyze: 0.25, evaluate: 0.3, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.1, misconceptionRiskBoost: 0.12 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "data-analysis", subject: "generic", name: "Data Analysis", archetypeKey: "data-analysis", description: "Analyze data in tables, charts, or graphs.", patternConfig: { textPatterns: ["data", "graph", "table", "chart", "plot", "trend"], structuralPatterns: ["multiRepresentation"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0.2, analyze: 0.3, evaluate: 0, create: 0 }, multiStepBoost: 0.16, difficultyBoost: 0.12, misconceptionRiskBoost: 0.1 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "cause-effect-reasoning", subject: "generic", name: "Cause and Effect", archetypeKey: "cause-effect-reasoning", description: "Reason about causes, effects, impacts, and consequences.", patternConfig: { textPatterns: ["cause", "effect", "result", "consequence", "impact", "leads to"], structuralPatterns: [], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0, analyze: 0.25, evaluate: 0.15, create: 0 }, multiStepBoost: 0.1, difficultyBoost: 0.08, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "multi-representation-synthesis", subject: "generic", name: "Multi-Representation Synthesis", archetypeKey: "multi-representation-synthesis", description: "Use more than one representation together.", patternConfig: { textPatterns: ["use the graph", "use the table", "compare the diagram", "using the model", "from the graph and table"], structuralPatterns: ["multiRepresentation"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0.2, analyze: 0.25, evaluate: 0, create: 0.05 }, multiStepBoost: 0.2, difficultyBoost: 0.14, misconceptionRiskBoost: 0.12 }, stepHints: { expectedSteps: 3, stepType: "mixed" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "modeling", subject: "math", name: "Modeling", archetypeKey: "modeling", description: "Construct or use a mathematical model.", patternConfig: { textPatterns: ["model", "represent", "write an equation", "simulate", "construct"], structuralPatterns: ["hasEquation"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0.25, analyze: 0.15, evaluate: 0, create: 0.15 }, multiStepBoost: 0.18, difficultyBoost: 0.1, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "procedural" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "multi-step-algebra", subject: "math", name: "Multi-Step Algebra", archetypeKey: "multi-step-algebra", description: "Solve equations, systems, or inequalities.", patternConfig: { textPatterns: ["solve", "equation", "system of equations", "inequality"], structuralPatterns: ["hasEquation"], regexPatterns: ["[a-zA-Z]\\s*=\\s*[^=]"], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0.3, analyze: 0.2, evaluate: 0, create: 0 }, multiStepBoost: 0.2, difficultyBoost: 0.12, misconceptionRiskBoost: 0.1 }, stepHints: { expectedSteps: 3, stepType: "procedural" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "function-analysis", subject: "math", name: "Function Analysis", archetypeKey: "function-analysis", description: "Interpret functions, slope, intercept, or rate of change.", patternConfig: { textPatterns: ["function", "rate of change", "slope", "intercept"], structuralPatterns: ["hasEquation"], regexPatterns: ["f\\s*\\(\\s*x\\s*\\)"], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0.25, analyze: 0.2, evaluate: 0, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.1, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "proof", subject: "math", name: "Proof", archetypeKey: "proof", description: "Prove or justify a mathematical claim.", patternConfig: { textPatterns: ["prove", "show that", "justify why"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0, analyze: 0.2, evaluate: 0.25, create: 0.15 }, multiStepBoost: 0.18, difficultyBoost: 0.14, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 3, stepType: "mixed" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "optimization", subject: "math", name: "Optimization", archetypeKey: "optimization", description: "Maximize, minimize, or find best value.", patternConfig: { textPatterns: ["maximize", "minimize", "optimal", "best value"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0.2, analyze: 0.25, evaluate: 0.2, create: 0 }, multiStepBoost: 0.18, difficultyBoost: 0.14, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 3, stepType: "procedural" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "confidence-interval", subject: "statistics", name: "Confidence Interval", archetypeKey: "confidence-interval", description: "Interpret interval estimates and margin of error.", patternConfig: { textPatterns: ["confidence interval", "margin of error", "interval estimate"], structuralPatterns: [], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0.25, analyze: 0.2, evaluate: 0, create: 0 }, multiStepBoost: 0.16, difficultyBoost: 0.12, misconceptionRiskBoost: 0.12 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "hypothesis-testing", subject: "statistics", name: "Hypothesis Testing", archetypeKey: "hypothesis-testing", description: "Work with null hypothesis, p-value, and decisions.", patternConfig: { textPatterns: ["hypothesis test", "p-value", "null hypothesis", "alternative hypothesis"], structuralPatterns: [], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0.25, analyze: 0.25, evaluate: 0.2, create: 0 }, multiStepBoost: 0.18, difficultyBoost: 0.15, misconceptionRiskBoost: 0.15 }, stepHints: { expectedSteps: 3, stepType: "procedural" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "type-i-ii", subject: "statistics", name: "Type I/II Error", archetypeKey: "type-i-ii", description: "Reason about false positives and false negatives.", patternConfig: { textPatterns: ["type i", "type ii", "false positive", "false negative"], structuralPatterns: [], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0, analyze: 0.25, evaluate: 0.15, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.12, misconceptionRiskBoost: 0.18 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "sampling-distribution", subject: "statistics", name: "Sampling Distribution", archetypeKey: "sampling-distribution", description: "Interpret standard error and sampling distributions.", patternConfig: { textPatterns: ["sampling distribution", "standard error", "sample proportion"], structuralPatterns: [], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0.2, analyze: 0.2, evaluate: 0, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.12, misconceptionRiskBoost: 0.12 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "distribution-interpretation", subject: "statistics", name: "Distribution Interpretation", archetypeKey: "distribution-interpretation", description: "Interpret the shape or spread of a distribution.", patternConfig: { textPatterns: ["distribution", "spread", "skew", "center", "variability"], structuralPatterns: ["hasGraph"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0.1, analyze: 0.25, evaluate: 0, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.1, misconceptionRiskBoost: 0.1 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "main-idea", subject: "reading", name: "Main Idea", archetypeKey: "main-idea", description: "Find the main or central idea.", patternConfig: { textPatterns: ["main idea", "central idea", "theme"], structuralPatterns: ["hasPassage"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.25, apply: 0, analyze: 0.15, evaluate: 0, create: 0 }, multiStepBoost: 0.08, difficultyBoost: 0.06, misconceptionRiskBoost: 0.04 }, stepHints: { expectedSteps: 1, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "inference", subject: "reading", name: "Inference", archetypeKey: "inference", description: "Infer or interpret unstated meaning.", patternConfig: { textPatterns: ["infer", "inference", "imply", "suggest"], structuralPatterns: ["hasPassage"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0, analyze: 0.3, evaluate: 0.1, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.1, misconceptionRiskBoost: 0.1 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "author-purpose", subject: "reading", name: "Author Purpose", archetypeKey: "author-purpose", description: "Identify author purpose, tone, or point of view.", patternConfig: { textPatterns: ["author's purpose", "point of view", "tone", "purpose of the passage"], structuralPatterns: ["hasPassage"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.2, apply: 0, analyze: 0.25, evaluate: 0, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.08, misconceptionRiskBoost: 0.06 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "argument-analysis", subject: "reading", name: "Argument Analysis", archetypeKey: "argument-analysis", description: "Analyze claims, reasons, and counterclaims.", patternConfig: { textPatterns: ["argument", "claim", "reasoning", "counterclaim"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0, analyze: 0.3, evaluate: 0.25, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.1, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "passage-evidence", subject: "reading", name: "Passage Evidence", archetypeKey: "passage-evidence", description: "Use details from a passage to support an answer.", patternConfig: { textPatterns: ["from the passage", "which detail", "best supports", "evidence from the passage"], structuralPatterns: ["hasPassage"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0.1, analyze: 0.2, evaluate: 0.2, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.08, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "experimental-design", subject: "science", name: "Experimental Design", archetypeKey: "experimental-design", description: "Design experiments and procedures.", patternConfig: { textPatterns: ["experimental design", "design an experiment", "hypothesis", "procedure"], structuralPatterns: ["hasExperiment"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0.2, analyze: 0.2, evaluate: 0, create: 0.2 }, multiStepBoost: 0.2, difficultyBoost: 0.14, misconceptionRiskBoost: 0.12 }, stepHints: { expectedSteps: 3, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "variable-control", subject: "science", name: "Variable Control", archetypeKey: "variable-control", description: "Identify independent, dependent, and control variables.", patternConfig: { textPatterns: ["control variable", "independent variable", "dependent variable", "constant"], structuralPatterns: ["hasExperiment"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.2, apply: 0.2, analyze: 0.15, evaluate: 0, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.1, misconceptionRiskBoost: 0.1 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "science-data-interpretation", subject: "science", name: "Science Data Interpretation", archetypeKey: "science-data-interpretation", description: "Interpret scientific observations, trends, or graphs.", patternConfig: { textPatterns: ["data", "graph", "trend", "observation"], structuralPatterns: ["multiRepresentation"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0.1, apply: 0, analyze: 0.3, evaluate: 0, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.1, misconceptionRiskBoost: 0.1 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "model-evaluation", subject: "science", name: "Model Evaluation", archetypeKey: "model-evaluation", description: "Compare models or evaluate their limitations.", patternConfig: { textPatterns: ["evaluate the model", "limitations of the model", "compare models"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0, analyze: 0.25, evaluate: 0.25, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.12, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "science-explanation", subject: "science", name: "Scientific Explanation", archetypeKey: "science-explanation", description: "Explain a scientific phenomenon using evidence.", patternConfig: { textPatterns: ["explain why", "scientific explanation", "using evidence", "phenomenon"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0.1, analyze: 0.2, evaluate: 0.1, create: 0 }, multiStepBoost: 0.14, difficultyBoost: 0.1, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "sourcing", subject: "socialstudies", name: "Sourcing", archetypeKey: "sourcing", description: "Identify source origin, author, or context.", patternConfig: { textPatterns: ["source", "who wrote", "when was this written", "origin of the document"], structuralPatterns: ["hasSourceExcerpt"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.2, apply: 0, analyze: 0.2, evaluate: 0, create: 0 }, multiStepBoost: 0.1, difficultyBoost: 0.08, misconceptionRiskBoost: 0.06 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "corroboration", subject: "socialstudies", name: "Corroboration", archetypeKey: "corroboration", description: "Compare two sources for agreement or disagreement.", patternConfig: { textPatterns: ["corroborate", "compare sources", "both sources", "agree and disagree"], structuralPatterns: ["hasSourceExcerpt", "multiRepresentation"], regexPatterns: [], minConfidence: 0.4 }, boosts: { bloom: { remember: 0, understand: 0, apply: 0, analyze: 0.3, evaluate: 0.2, create: 0 }, multiStepBoost: 0.16, difficultyBoost: 0.12, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 3, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "perspective-analysis", subject: "socialstudies", name: "Perspective Analysis", archetypeKey: "perspective-analysis", description: "Analyze bias, audience, or perspective.", patternConfig: { textPatterns: ["perspective", "point of view", "bias", "audience"], structuralPatterns: ["hasSourceExcerpt"], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0, analyze: 0.25, evaluate: 0.15, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.1, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "historical-cause-effect", subject: "socialstudies", name: "Historical Cause and Effect", archetypeKey: "historical-cause-effect", description: "Reason about causes and consequences in history or civics.", patternConfig: { textPatterns: ["cause", "effect", "result", "consequence", "impact"], structuralPatterns: [], regexPatterns: [], minConfidence: 0.45 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0, analyze: 0.25, evaluate: 0.15, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.08, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "interpretive" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } },
      { id: "civic-reasoning", subject: "socialstudies", name: "Civic Reasoning", archetypeKey: "civic-reasoning", description: "Reason about government, policy, or civic claims.", patternConfig: { textPatterns: ["government", "policy", "law", "citizen", "civic"], structuralPatterns: ["constructedResponse"], regexPatterns: [], minConfidence: 0.35 }, boosts: { bloom: { remember: 0, understand: 0.15, apply: 0.1, analyze: 0.2, evaluate: 0.15, create: 0 }, multiStepBoost: 0.12, difficultyBoost: 0.08, misconceptionRiskBoost: 0.08 }, stepHints: { expectedSteps: 2, stepType: "conceptual" }, meta: { version: 1, createdBy: "system", createdAt: "2026-03-24T00:00:00.000Z" } }
    ];
  }
});
init_supabase();
init_supabase();
var import_templates = __toESM(require_templates());
function loadSeededTemplates() {
  return import_templates.default;
}
function toRuntimeTemplate(template) {
  return {
    id: template.id,
    subject: template.subject,
    name: template.name,
    archetypeKey: template.archetypeKey,
    description: template.description,
    patternConfig: template.patternConfig,
    stepHints: template.stepHints,
    bloom: template.boosts.bloom,
    difficultyBoost: template.boosts.difficultyBoost,
    multiStepBoost: template.boosts.multiStepBoost,
    misconceptionRiskBoost: template.boosts.misconceptionRiskBoost,
    minConfidence: template.patternConfig.minConfidence
  };
}
var SYSTEM_TEMPLATE_IDS = new Set(loadSeededTemplates().map((template) => template.id));
init_supabase();
var ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1e3;
var runtimeTemplates = loadSeededTemplates().map(toRuntimeTemplate);
var genericOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "generic");
var mathOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "math");
var statsOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "statistics");
var elaOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "reading");
var scienceOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "science");
var historyOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "socialstudies");
var mathTemplates = [...genericOnlyTemplates, ...mathOnlyTemplates, ...statsOnlyTemplates];
var statsTemplates = [...genericOnlyTemplates, ...statsOnlyTemplates];
var elaTemplates = [...genericOnlyTemplates, ...elaOnlyTemplates];
var scienceTemplates = [...genericOnlyTemplates, ...scienceOnlyTemplates];
var historyTemplates = [...genericOnlyTemplates, ...historyOnlyTemplates];
var ANSWER_KEY_HEADING_RE = /^\s*(?:#+\s*)?answer\s*key\b[:\-]?\s*$/i;
var ANSWER_KEY_ENTRY_RE = /^\s*\d{1,3}\.\s*([A-E])\s*(?:[\).,:;\-]?\s*)?$/i;
var PAGE_FOOTER_PATTERNS = [
  /^\s*page\s+\d+\s*$/i,
  /^\s*spring exam review\s+page\s+\d+\s*$/i
];
function hybridSegmentWithDiagnostics(azure) {
  const blocks = collectBlocks(azure);
  console.log(`[hybridSegment] source: ${azure.paragraphs?.length ? `paragraphs(${azure.paragraphs.length})` : azure.pages?.length ? `pages(${azure.pages.length})` : "content"} \u2192 ${blocks.length} block(s)`);
  if (blocks.length === 0) {
    console.warn("[hybridSegment] no text blocks found in azure extract");
    return {
      items: [],
      diagnostics: {
        answerKeyDetected: false,
        answerKeyLinesRemoved: 0,
        pageFurnitureLinesRemoved: 0,
        dedupedItems: 0,
        rawItemCount: 0,
        finalItemCount: 0
      }
    };
  }
  const boundary = applyBoundaryRules(blocks);
  const rawItems = boundary.items;
  console.log(`[hybridSegment] boundary rules \u2192 ${rawItems.length} raw item(s)`);
  const before_dedup = rawItems.length;
  const result = dedup(rawItems).filter((i) => i.text.trim().length > 20);
  if (result.length < before_dedup) {
    console.log(`[hybridSegment] dedup+filter removed ${before_dedup - result.length} fragment(s)`);
  }
  console.log(`[hybridSegment] final: ${result.length} item(s)`);
  return {
    items: result,
    diagnostics: {
      answerKeyDetected: boundary.answerKeyDetected,
      answerKeyLinesRemoved: boundary.answerKeyLinesRemoved,
      pageFurnitureLinesRemoved: boundary.pageFurnitureLinesRemoved,
      dedupedItems: Math.max(0, before_dedup - result.length),
      rawItemCount: rawItems.length,
      finalItemCount: result.length
    }
  };
}
function collectBlocks(azure) {
  if (azure.paragraphs && azure.paragraphs.length > 0) {
    console.log(`[hybridSegment:collectBlocks] using azure.paragraphs (${azure.paragraphs.length} entries)`);
    return azure.paragraphs.map((p) => normalizeWhitespace2(p.text ?? "")).filter(Boolean);
  }
  if (azure.pages && azure.pages.length > 0) {
    console.log(`[hybridSegment:collectBlocks] using azure.pages (${azure.pages.length} page(s))`);
    return azure.pages.map((p) => normalizeWhitespace2(p.text ?? "")).filter(Boolean);
  }
  if (azure.content) {
    console.log(`[hybridSegment:collectBlocks] using azure.content (${azure.content.length} chars) \u2014 splitting on double newline`);
    return azure.content.split(/\n{2,}/).map(normalizeWhitespace2).filter(Boolean);
  }
  console.warn("[hybridSegment:collectBlocks] azure extract has no paragraphs/pages/content");
  return [];
}
function normalizeWhitespace2(s) {
  return s.replace(/[ \t]+/g, " ").trim();
}
function isPageFurnitureLine(line) {
  return PAGE_FOOTER_PATTERNS.some((pattern) => pattern.test(line));
}
function isHardBoundary(line) {
  const t = line.trim();
  if (!t)
    return false;
  if (/^\d{1,3}[\.)]\s/.test(t))
    return true;
  if (/^Question\s+\d+/i.test(t))
    return true;
  return false;
}
function isSoftBoundary(line) {
  return line.trim() === "";
}
function applyBoundaryRules(blocks) {
  const items = [];
  let buffer = [];
  let itemNumber = 1;
  let inAnswerKeyRegion = false;
  let answerKeyDetected = false;
  let pendingAnswerKeyEntries = [];
  let answerKeyLinesRemoved = 0;
  let pageFurnitureLinesRemoved = 0;
  const flush = () => {
    const t = buffer.join("\n").trim();
    if (t.length > 0) {
      items.push({ itemNumber: itemNumber++, text: t });
    }
    buffer = [];
  };
  const applySegmentationRules = (line) => {
    if (isHardBoundary(line)) {
      flush();
      buffer = [line];
    } else if (isSoftBoundary(line)) {
      flush();
    } else {
      buffer.push(line);
    }
  };
  for (const block of blocks) {
    const lines = block.split("\n");
    for (const rawLine of lines) {
      const line = normalizeWhitespace2(rawLine);
      if (!line) {
        continue;
      }
      if (isPageFurnitureLine(line)) {
        pageFurnitureLinesRemoved += 1;
        continue;
      }
      if (inAnswerKeyRegion) {
        answerKeyLinesRemoved += 1;
        continue;
      }
      if (ANSWER_KEY_HEADING_RE.test(line)) {
        inAnswerKeyRegion = true;
        answerKeyDetected = true;
        answerKeyLinesRemoved += 1;
        pendingAnswerKeyEntries = [];
        continue;
      }
      if (ANSWER_KEY_ENTRY_RE.test(line)) {
        pendingAnswerKeyEntries.push(line);
        if (pendingAnswerKeyEntries.length >= 3) {
          inAnswerKeyRegion = true;
          answerKeyDetected = true;
          answerKeyLinesRemoved += pendingAnswerKeyEntries.length;
          pendingAnswerKeyEntries = [];
        }
        continue;
      }
      if (pendingAnswerKeyEntries.length > 0) {
        for (const pendingLine of pendingAnswerKeyEntries) {
          applySegmentationRules(pendingLine);
        }
        pendingAnswerKeyEntries = [];
      }
      applySegmentationRules(line);
    }
  }
  if (!inAnswerKeyRegion && pendingAnswerKeyEntries.length > 0) {
    for (const pendingLine of pendingAnswerKeyEntries) {
      applySegmentationRules(pendingLine);
    }
  }
  flush();
  return {
    items,
    answerKeyDetected,
    answerKeyLinesRemoved,
    pageFurnitureLinesRemoved
  };
}
function dedup(items) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of items) {
    const key = item.text.slice(0, 80);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    } else {
      console.log(`[hybridSegment:dedup] dropped duplicate: "${key.substring(0, 40)}\u2026"`);
    }
  }
  return out.map((item, i) => ({ ...item, itemNumber: i + 1 }));
}
async function segmentText(azure) {
  const result = await segmentTextWithDiagnostics(azure);
  return result.items;
}
async function segmentTextWithDiagnostics(azure) {
  const paras = azure.paragraphs?.length ?? 0;
  const pages = azure.pages?.length ?? 0;
  const chars = azure.content?.length ?? 0;
  console.log(`[segmentText] input: paragraphs=${paras}, pages=${pages}, content=${chars} chars`);
  const hybridResult = hybridSegmentWithDiagnostics(azure);
  const hybrid = hybridResult.items;
  console.log(`[segmentText] hybrid result: ${hybrid.length} item(s)`);
  if (hybrid.length > 1) {
    console.log("[segmentText] \u2705 hybrid path \u2014 no LLM call");
    return {
      items: hybrid,
      diagnostics: {
        ...hybridResult.diagnostics,
        fallbackUsed: false
      }
    };
  }
  const text = azure.content ?? (azure.paragraphs ?? []).map((p) => p.text ?? "").filter(Boolean).join("\n") ?? "";
  if (!text.trim()) {
    console.warn("[segmentText] no text available for LLM fallback \u2014 returning empty");
    return {
      items: hybrid,
      diagnostics: {
        ...hybridResult.diagnostics,
        fallbackUsed: false
      }
    };
  }
  console.warn(`[segmentText] hybrid \u22641 item \u2014 using local fallback (${text.length} chars)`);
  return {
    items: hybrid.length > 0 ? hybrid : _naiveSegmentFallback(text),
    diagnostics: {
      ...hybridResult.diagnostics,
      fallbackUsed: true
    }
  };
}
function _naiveSegmentFallback(text) {
  console.log("[_naiveSegmentFallback] running line-based fallback segmentation");
  const lines = text.split("\n");
  const segments = [];
  let current = [];
  let itemNumber = 0;
  for (const line of lines) {
    if (/^(?:Question\s+\d+|\d+[.)]\s)/.test(line.trim()) && current.length > 0) {
      const t = current.join("\n").trim();
      if (t)
        segments.push({ itemNumber: ++itemNumber, text: t });
      current = [line];
    } else {
      current.push(line);
    }
  }
  const last = current.join("\n").trim();
  if (last)
    segments.push({ itemNumber: ++itemNumber, text: last });
  if (segments.length <= 1) {
    console.warn("[_naiveSegmentFallback] could not split text \u2014 treating as single item");
    return [{ itemNumber: 1, text: text.trim() }];
  }
  console.log(`[_naiveSegmentFallback] produced ${segments.length} item(s)`);
  return segments;
}
var runtime = "nodejs";
var maxDuration = 30;
async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).setHeader("Access-Control-Allow-Origin", "*").setHeader("Access-Control-Allow-Methods", "POST, OPTIONS").setHeader("Access-Control-Allow-Headers", "Content-Type").end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
    }
  }
  const { text, azureExtract } = body ?? {};
  if (!text && !azureExtract) {
    return res.status(400).json({ error: "text or azureExtract is required" });
  }
  try {
    const azure = azureExtract ?? (text ? { content: text } : {});
    const items = await segmentText(azure);
    return res.status(200).json({ items });
  } catch (err) {
    console.error("[segment] ERROR:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Segmentation failed"
    });
  }
}
export {
  handler as default,
  maxDuration,
  runtime
};
