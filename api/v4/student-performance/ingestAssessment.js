"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/student-performance/ingestAssessment.ts
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var BLOOM_LEVELS = ["remember", "understand", "apply", "analyze", "evaluate", "create"];
function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]+/g, " ").replace(/\s+/g, " ").trim();
}
function canonicalConceptId(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}
function compareBloomLevels(left, right) {
  return BLOOM_LEVELS.indexOf(left) - BLOOM_LEVELS.indexOf(right);
}
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set");
  }
  return { url, key };
}
async function supabaseRest(table, options = {}) {
  const { url, key } = supabaseAdmin();
  const {
    method = "GET",
    select,
    filters = {},
    body,
    prefer
  } = options;
  const reqUrl = new URL(`${url}/rest/v1/${table}`);
  if (select)
    reqUrl.searchParams.set("select", select);
  for (const [k, v] of Object.entries(filters)) {
    reqUrl.searchParams.set(k, v);
  }
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
  if (prefer)
    headers["Prefer"] = prefer;
  const res = await fetch(reqUrl.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : void 0
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase REST ${method} ${table} failed (${res.status}): ${text}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return null;
}
var import_templates = __toESM(require_templates());
function loadSeededTemplates() {
  return import_templates.default;
}
var SYSTEM_TEMPLATE_IDS = new Set(loadSeededTemplates().map((template) => template.id));
var ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1e3;
var MASTERY_ALPHA = 0.35;
var AUXILIARY_ALPHA = 0.28;
var RESPONSE_TIME_ALPHA = 0.22;
var EXPOSURE_DECAY = 0.985;
var MAX_MISCONCEPTION_EXAMPLES = 3;
function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}
function roundMetric(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(4));
}
function unique(values) {
  return [...new Set(values)];
}
function normalizeMisconceptionKey(event) {
  const explicit = typeof event.misconceptionKey === "string" && event.misconceptionKey.trim().length > 0 ? event.misconceptionKey.trim().toLowerCase() : null;
  if (explicit) {
    return explicit;
  }
  const incorrectResponse = typeof event.incorrectResponse === "string" ? event.incorrectResponse.trim().toLowerCase() : "";
  if (!incorrectResponse) {
    return null;
  }
  return incorrectResponse.replace(/[^a-z0-9\s-]+/g, " ").replace(/\s+/g, " ").trim();
}
function applyEwma(current, sample, alpha) {
  if (!Number.isFinite(sample)) {
    return current ?? 0;
  }
  if (current === void 0 || !Number.isFinite(current)) {
    return clamp01(sample);
  }
  return clamp01(current * (1 - alpha) + sample * alpha);
}
function applyNumericEwma(current, sample, alpha) {
  if (!Number.isFinite(sample)) {
    return current ?? 0;
  }
  if (current === void 0 || !Number.isFinite(current)) {
    return roundMetric(sample);
  }
  return roundMetric(current * (1 - alpha) + sample * alpha);
}
function createEmptyProfile(studentId, unitId) {
  return {
    studentId,
    unitId,
    lastUpdated: new Date(0).toISOString(),
    totalEvents: 0,
    totalAssessments: 0,
    assessmentIds: [],
    overallMastery: 0,
    overallConfidence: 0,
    averageResponseTimeSeconds: 0,
    conceptMastery: {},
    conceptExposure: {},
    bloomMastery: {},
    modeMastery: {},
    scenarioMastery: {},
    conceptBloomMastery: {},
    conceptModeMastery: {},
    conceptScenarioMastery: {},
    conceptAverageResponseTimeSeconds: {},
    conceptConfidence: {},
    misconceptions: {}
  };
}
function ensureConceptMap(record, conceptId) {
  if (!record[conceptId]) {
    record[conceptId] = {};
  }
  return record[conceptId];
}
function decayExposure(profile, currentConceptId) {
  for (const conceptId of Object.keys(profile.conceptExposure)) {
    const current = profile.conceptExposure[conceptId] ?? 0;
    profile.conceptExposure[conceptId] = roundMetric(current * EXPOSURE_DECAY + (conceptId === currentConceptId ? 1 : 0));
  }
  if (!(currentConceptId in profile.conceptExposure)) {
    profile.conceptExposure[currentConceptId] = 1;
  }
  profile.conceptExposure[currentConceptId] = roundMetric((profile.conceptExposure[currentConceptId] ?? 0) + (profile.totalEvents === 0 ? 0 : 0));
}
function updateMisconceptions(profile, event, conceptId) {
  if (event.correct) {
    return;
  }
  const misconceptionKey = normalizeMisconceptionKey(event);
  if (!misconceptionKey) {
    return;
  }
  const clusters = [...profile.misconceptions[conceptId] ?? []];
  const existingIndex = clusters.findIndex((cluster) => cluster.misconceptionKey === misconceptionKey);
  const existing = existingIndex >= 0 ? clusters[existingIndex] : null;
  const next = {
    misconceptionKey,
    occurrences: (existing?.occurrences ?? 0) + 1,
    lastSeenAt: event.occurredAt,
    examples: unique([...existing?.examples ?? [], event.incorrectResponse ?? misconceptionKey]).slice(0, MAX_MISCONCEPTION_EXAMPLES),
    relatedBloomLevels: unique([...existing?.relatedBloomLevels ?? [], event.bloomLevel]).sort(compareBloomLevels),
    relatedModes: unique([...existing?.relatedModes ?? [], ...event.itemMode ? [event.itemMode] : []]).sort()
  };
  if (existingIndex >= 0) {
    clusters[existingIndex] = next;
  } else {
    clusters.push(next);
  }
  profile.misconceptions[conceptId] = clusters.sort((left, right) => right.occurrences - left.occurrences || right.lastSeenAt.localeCompare(left.lastSeenAt));
}
function applyEvent(profile, rawEvent) {
  const conceptId = canonicalConceptId(rawEvent.conceptId || rawEvent.conceptDisplayName || "general");
  const event = {
    ...rawEvent,
    conceptId
  };
  decayExposure(profile, conceptId);
  const masterySample = event.correct ? 1 : 0;
  profile.overallMastery = applyEwma(profile.overallMastery, masterySample, MASTERY_ALPHA);
  profile.conceptMastery[conceptId] = applyEwma(profile.conceptMastery[conceptId], masterySample, MASTERY_ALPHA);
  profile.bloomMastery[event.bloomLevel] = applyEwma(profile.bloomMastery[event.bloomLevel], masterySample, MASTERY_ALPHA);
  const conceptBloom = ensureConceptMap(profile.conceptBloomMastery, conceptId);
  conceptBloom[event.bloomLevel] = applyEwma(conceptBloom[event.bloomLevel], masterySample, MASTERY_ALPHA);
  if (event.itemMode) {
    profile.modeMastery[event.itemMode] = applyEwma(profile.modeMastery[event.itemMode], masterySample, MASTERY_ALPHA);
    const conceptMode = ensureConceptMap(profile.conceptModeMastery, conceptId);
    conceptMode[event.itemMode] = applyEwma(conceptMode[event.itemMode], masterySample, MASTERY_ALPHA);
  }
  if (event.scenarioType) {
    profile.scenarioMastery[event.scenarioType] = applyEwma(profile.scenarioMastery[event.scenarioType], masterySample, MASTERY_ALPHA);
    const conceptScenario = ensureConceptMap(profile.conceptScenarioMastery, conceptId);
    conceptScenario[event.scenarioType] = applyEwma(conceptScenario[event.scenarioType], masterySample, MASTERY_ALPHA);
  }
  if (typeof event.confidence === "number") {
    profile.overallConfidence = applyEwma(profile.overallConfidence, clamp01(event.confidence), AUXILIARY_ALPHA);
    profile.conceptConfidence[conceptId] = applyEwma(profile.conceptConfidence[conceptId], clamp01(event.confidence), AUXILIARY_ALPHA);
  }
  if (typeof event.responseTimeSeconds === "number" && Number.isFinite(event.responseTimeSeconds) && event.responseTimeSeconds >= 0) {
    profile.averageResponseTimeSeconds = applyNumericEwma(profile.averageResponseTimeSeconds, event.responseTimeSeconds, RESPONSE_TIME_ALPHA);
    profile.conceptAverageResponseTimeSeconds[conceptId] = applyNumericEwma(profile.conceptAverageResponseTimeSeconds[conceptId], event.responseTimeSeconds, RESPONSE_TIME_ALPHA);
  }
  updateMisconceptions(profile, event, conceptId);
  profile.totalEvents += 1;
  if (!profile.assessmentIds.includes(event.assessmentId)) {
    profile.assessmentIds = [...profile.assessmentIds, event.assessmentId];
    profile.totalAssessments = profile.assessmentIds.length;
  }
  profile.lastUpdated = event.occurredAt;
  return profile;
}
function updateStudentPerformanceProfile(profile, events) {
  if (events.length === 0) {
    if (profile) {
      return profile;
    }
    throw new Error("Cannot create student performance profile from zero events");
  }
  const sorted = [...events].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId));
  const seed = profile ? {
    ...profile,
    assessmentIds: [...profile.assessmentIds],
    conceptMastery: { ...profile.conceptMastery },
    conceptExposure: { ...profile.conceptExposure },
    bloomMastery: { ...profile.bloomMastery },
    modeMastery: { ...profile.modeMastery },
    scenarioMastery: { ...profile.scenarioMastery },
    conceptBloomMastery: Object.fromEntries(Object.entries(profile.conceptBloomMastery).map(([conceptId, mastery]) => [conceptId, { ...mastery }])),
    conceptModeMastery: Object.fromEntries(Object.entries(profile.conceptModeMastery).map(([conceptId, mastery]) => [conceptId, { ...mastery }])),
    conceptScenarioMastery: Object.fromEntries(Object.entries(profile.conceptScenarioMastery).map(([conceptId, mastery]) => [conceptId, { ...mastery }])),
    conceptAverageResponseTimeSeconds: { ...profile.conceptAverageResponseTimeSeconds },
    conceptConfidence: { ...profile.conceptConfidence },
    misconceptions: Object.fromEntries(Object.entries(profile.misconceptions).map(([conceptId, clusters]) => [conceptId, clusters.map((cluster) => ({ ...cluster, examples: [...cluster.examples], relatedBloomLevels: [...cluster.relatedBloomLevels], relatedModes: [...cluster.relatedModes] }))]))
  } : createEmptyProfile(sorted[0].studentId, sorted[0].unitId);
  for (const event of sorted) {
    applyEvent(seed, event);
  }
  seed.totalAssessments = seed.assessmentIds.length;
  return seed;
}
var studentProfileMemory = /* @__PURE__ */ new Map();
var studentEventMemory = /* @__PURE__ */ new Map();
function canUseSupabase() {
  return typeof window === "undefined" && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function profileKey(studentId, unitId) {
  return `${studentId}::${unitId ?? "global"}`;
}
function normalizeProfile(profile) {
  return {
    student_id: profile.studentId,
    unit_id: profile.unitId ?? null,
    last_updated: profile.lastUpdated,
    total_events: profile.totalEvents,
    total_assessments: profile.totalAssessments,
    assessment_ids: profile.assessmentIds,
    overall_mastery: profile.overallMastery,
    overall_confidence: profile.overallConfidence,
    average_response_time_seconds: profile.averageResponseTimeSeconds,
    concept_mastery: profile.conceptMastery,
    concept_exposure: profile.conceptExposure,
    bloom_mastery: profile.bloomMastery,
    mode_mastery: profile.modeMastery,
    scenario_mastery: profile.scenarioMastery,
    concept_bloom_mastery: profile.conceptBloomMastery,
    concept_mode_mastery: profile.conceptModeMastery,
    concept_scenario_mastery: profile.conceptScenarioMastery,
    concept_average_response_time_seconds: profile.conceptAverageResponseTimeSeconds,
    concept_confidence: profile.conceptConfidence,
    misconceptions: profile.misconceptions
  };
}
function hydrateProfile(row) {
  return {
    studentId: String(row.student_id),
    unitId: typeof row.unit_id === "string" ? row.unit_id : void 0,
    lastUpdated: String(row.last_updated ?? new Date(0).toISOString()),
    totalEvents: Number(row.total_events ?? 0),
    totalAssessments: Number(row.total_assessments ?? 0),
    assessmentIds: row.assessment_ids ?? [],
    overallMastery: Number(row.overall_mastery ?? 0),
    overallConfidence: Number(row.overall_confidence ?? 0),
    averageResponseTimeSeconds: Number(row.average_response_time_seconds ?? 0),
    conceptMastery: row.concept_mastery ?? {},
    conceptExposure: row.concept_exposure ?? {},
    bloomMastery: row.bloom_mastery ?? {},
    modeMastery: row.mode_mastery ?? {},
    scenarioMastery: row.scenario_mastery ?? {},
    conceptBloomMastery: row.concept_bloom_mastery ?? {},
    conceptModeMastery: row.concept_mode_mastery ?? {},
    conceptScenarioMastery: row.concept_scenario_mastery ?? {},
    conceptAverageResponseTimeSeconds: row.concept_average_response_time_seconds ?? {},
    conceptConfidence: row.concept_confidence ?? {},
    misconceptions: row.misconceptions ?? {}
  };
}
function normalizeEvent(event) {
  return {
    event_id: event.eventId,
    student_id: event.studentId,
    assessment_id: event.assessmentId,
    unit_id: event.unitId ?? null,
    item_id: event.itemId ?? null,
    concept_id: event.conceptId,
    concept_display_name: event.conceptDisplayName ?? null,
    bloom_level: event.bloomLevel,
    item_mode: event.itemMode ?? null,
    scenario_type: event.scenarioType ?? null,
    difficulty: event.difficulty ?? null,
    correct: event.correct,
    response_time_seconds: event.responseTimeSeconds ?? null,
    confidence: event.confidence ?? null,
    misconception_key: event.misconceptionKey ?? null,
    incorrect_response: event.incorrectResponse ?? null,
    occurred_at: event.occurredAt,
    metadata: event.metadata ?? null
  };
}
async function saveStudentPerformanceProfile(profile) {
  studentProfileMemory.set(profileKey(profile.studentId, profile.unitId), profile);
  if (canUseSupabase()) {
    await supabaseRest("student_performance_profiles", {
      method: "POST",
      body: normalizeProfile(profile),
      prefer: "resolution=merge-duplicates,return=minimal"
    });
  }
  return profile;
}
async function getStudentPerformanceProfile(studentId, unitId) {
  if (canUseSupabase()) {
    const rows = await supabaseRest("student_performance_profiles", {
      select: "student_id,unit_id,last_updated,total_events,total_assessments,assessment_ids,overall_mastery,overall_confidence,average_response_time_seconds,concept_mastery,concept_exposure,bloom_mastery,mode_mastery,scenario_mastery,concept_bloom_mastery,concept_mode_mastery,concept_scenario_mastery,concept_average_response_time_seconds,concept_confidence,misconceptions",
      filters: {
        student_id: `eq.${studentId}`,
        ...unitId ? { unit_id: `eq.${unitId}` } : { unit_id: "is.null" }
      }
    });
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) {
      return null;
    }
    const profile = hydrateProfile(row);
    studentProfileMemory.set(profileKey(profile.studentId, profile.unitId), profile);
    return profile;
  }
  return studentProfileMemory.get(profileKey(studentId, unitId)) ?? null;
}
async function appendStudentAssessmentEvents(events) {
  if (events.length === 0) {
    return [];
  }
  for (const event of events) {
    const key = profileKey(event.studentId, event.unitId);
    studentEventMemory.set(key, [...studentEventMemory.get(key) ?? [], event]);
  }
  if (canUseSupabase()) {
    await supabaseRest("student_assessment_events", {
      method: "POST",
      body: events.map((event) => normalizeEvent(event)),
      prefer: "resolution=merge-duplicates,return=minimal"
    });
  }
  return events;
}
var runtime = "nodejs";
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function createEventId(studentId, assessmentId, item, index) {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${studentId}-${assessmentId}-${item.itemId ?? index}-${Date.now()}-${index}`;
}
function parseBody(body) {
  if (typeof body === "string") {
    return JSON.parse(body);
  }
  return body ?? {};
}
function isBloomLevel(value) {
  return typeof value === "string" && ["remember", "understand", "apply", "analyze", "evaluate", "create"].includes(value);
}
function toEvents(payload) {
  const studentId = typeof payload.studentId === "string" && payload.studentId.trim().length > 0 ? payload.studentId.trim() : null;
  const assessmentId = typeof payload.assessmentId === "string" && payload.assessmentId.trim().length > 0 ? payload.assessmentId.trim() : null;
  const unitId = typeof payload.unitId === "string" && payload.unitId.trim().length > 0 ? payload.unitId.trim() : void 0;
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!studentId || !assessmentId || items.length === 0) {
    throw new Error("studentId, assessmentId, and items are required");
  }
  const now = new Date().toISOString();
  return items.map((item, index) => {
    const conceptValue = typeof item.conceptId === "string" && item.conceptId.trim().length > 0 ? item.conceptId.trim() : typeof item.concept === "string" && item.concept.trim().length > 0 ? item.concept.trim() : null;
    if (!conceptValue || !isBloomLevel(item.bloom) || typeof item.correct !== "boolean") {
      throw new Error("Each item must include conceptId or concept, correct, and bloom");
    }
    return {
      eventId: createEventId(studentId, assessmentId, item, index),
      studentId,
      assessmentId,
      unitId,
      itemId: typeof item.itemId === "string" && item.itemId.trim().length > 0 ? item.itemId.trim() : void 0,
      conceptId: canonicalConceptId(conceptValue),
      conceptDisplayName: typeof item.conceptDisplayName === "string" && item.conceptDisplayName.trim().length > 0 ? item.conceptDisplayName.trim() : conceptValue,
      bloomLevel: item.bloom,
      itemMode: item.mode,
      scenarioType: item.scenario,
      difficulty: item.difficulty,
      correct: item.correct,
      responseTimeSeconds: typeof item.responseTimeSeconds === "number" ? item.responseTimeSeconds : void 0,
      confidence: typeof item.confidence === "number" ? item.confidence : void 0,
      misconceptionKey: typeof item.misconceptionKey === "string" ? item.misconceptionKey : void 0,
      incorrectResponse: typeof item.incorrectResponse === "string" ? item.incorrectResponse : void 0,
      occurredAt: typeof item.occurredAt === "string" && item.occurredAt.trim().length > 0 ? item.occurredAt.trim() : now,
      metadata: item.metadata
    };
  });
}
async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const payload = parseBody(req.body);
    const events = toEvents(payload);
    await appendStudentAssessmentEvents(events);
    const currentProfile = await getStudentPerformanceProfile(events[0].studentId, events[0].unitId);
    const updatedProfile = updateStudentPerformanceProfile(currentProfile, events);
    await saveStudentPerformanceProfile(updatedProfile);
    return res.status(200).json({
      profile: updatedProfile,
      appendedEvents: events.length
    });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to ingest student assessment"
    });
  }
}
export {
  handler as default,
  runtime
};
