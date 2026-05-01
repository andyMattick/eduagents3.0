"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/teacher-feedback/assessment-blueprint.ts
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
var ITEM_MODE_TO_BLOOM = {
  identify: "remember",
  state: "understand",
  interpret: "apply",
  compare: "analyze",
  apply: "apply",
  analyze: "analyze",
  evaluate: "evaluate",
  explain: "understand",
  construct: "create"
};
function unique(values) {
  return [...new Set(values)];
}
function createEmptyBloomDistribution() {
  return {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0
  };
}
function createSingleBloomDistribution(level) {
  const distribution = createEmptyBloomDistribution();
  distribution[level] = 1;
  return distribution;
}
function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]+/g, " ").replace(/\s+/g, " ").trim();
}
function canonicalConceptId(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}
function compareBloomLevels(left, right) {
  return BLOOM_LEVELS.indexOf(left) - BLOOM_LEVELS.indexOf(right);
}
function createDefaultConceptProfile(input) {
  const conceptId = input.conceptId ? canonicalConceptId(input.conceptId) : canonicalConceptId(input.displayName);
  const absoluteItemHint = Math.max(1, input.absoluteItemHint ?? 1);
  const maxBloomLevel = input.maxBloomLevel ?? "understand";
  return {
    conceptId,
    displayName: input.displayName,
    frequencyWeight: 0,
    absoluteItemHint,
    lowEmphasis: true,
    bloomDistribution: createSingleBloomDistribution(maxBloomLevel),
    scenarioPatterns: unique(input.scenarioPatterns?.length ? input.scenarioPatterns : ["abstract-symbolic"]),
    scenarioDirective: input.scenarioDirective,
    itemModes: unique(input.itemModes?.length ? input.itemModes : ["explain"]),
    maxBloomLevel
  };
}
function classifyItemModes(prompt) {
  const normalized = normalizeText(prompt);
  const modes = [];
  if (/construct|design|write your own|create your own/.test(normalized)) {
    modes.push("construct");
  }
  if (/which error is more serious|do you agree|evaluate|assess whether|judge|justify your decision|justify the decision/.test(normalized)) {
    modes.push("evaluate");
  }
  if (/analyze|justify|why does|why do|explain why| and why\b|which .* more serious/.test(normalized)) {
    modes.push("analyze");
  }
  if (/use this|based on this|apply|make the decision|decide whether/.test(normalized)) {
    modes.push("apply");
  }
  if (/compare|versus|vs\b|larger|smaller|more than|less than/.test(normalized)) {
    modes.push("compare");
  }
  if (/interpret|what does this result mean|what does the p value mean|what does the graph show/.test(normalized)) {
    modes.push("interpret");
  }
  if (/state the|null hypothesis|alternative hypothesis|write hypotheses|write h0|write ha/.test(normalized)) {
    modes.push("state");
  }
  if (/identify|name|what is the parameter|what is the statistic|which of the following/.test(normalized)) {
    modes.push("identify");
  }
  if (/describe|explain|what does .* mean/.test(normalized)) {
    modes.push("explain");
  }
  return unique(modes.length > 0 ? modes : ["explain"]);
}
function classifyBloomLevel(prompt) {
  const modes = classifyItemModes(prompt);
  let highestIndex = 0;
  for (const mode of modes) {
    const bloom = ITEM_MODE_TO_BLOOM[mode];
    highestIndex = Math.max(highestIndex, BLOOM_LEVELS.indexOf(bloom));
  }
  return BLOOM_LEVELS[highestIndex] ?? "understand";
}
function bloomFromCognitiveDemand(value) {
  switch (value) {
    case "recall":
      return "remember";
    case "procedural":
      return "apply";
    case "conceptual":
      return "understand";
    case "modeling":
      return "analyze";
    case "analysis":
      return "analyze";
    default:
      return "understand";
  }
}
function classifyScenarioTypes(prompt) {
  const normalized = normalizeText(prompt);
  const scenarios = [];
  if (/simulation|resampling|repeated samples|randomization|sampling distribution|dotplot/.test(normalized)) {
    scenarios.push("simulation");
  }
  if (/table below|following data|data table|the table shows|values below/.test(normalized)) {
    scenarios.push("data-table");
  }
  if (/graph|histogram|boxplot|scatterplot|line plot|dotplot|chart/.test(normalized)) {
    scenarios.push("graphical");
  }
  if (/restaurant|construction zone|class study|survey|money|income|students|school|voter|population|city|minutes|dollars|flint water|water quality/.test(normalized)) {
    scenarios.push("real-world");
  }
  if (scenarios.length === 0 && (/\bx\b|\by\b|\bmu\b|\bsigma\b|equation|expression|symbol/.test(normalized) || /[=<>+\-/*]/.test(prompt))) {
    scenarios.push("abstract-symbolic");
  }
  return unique(scenarios.length > 0 ? scenarios : ["abstract-symbolic"]);
}
function normalizeDistribution(counts) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return createEmptyBloomDistribution();
  }
  return BLOOM_LEVELS.reduce((distribution, level) => {
    distribution[level] = Number(((counts[level] ?? 0) / total).toFixed(4));
    return distribution;
  }, createEmptyBloomDistribution());
}
function capDistributionAtBloomLevel(distribution, maxBloomLevel) {
  const capped = createEmptyBloomDistribution();
  for (const level of BLOOM_LEVELS) {
    if (compareBloomLevels(level, maxBloomLevel) <= 0) {
      capped[level] = distribution[level] ?? 0;
    }
  }
  const total = Object.values(capped).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return createSingleBloomDistribution(maxBloomLevel);
  }
  return normalizeDistribution(capped);
}
function highestBloomLevel(distribution) {
  for (const level of [...BLOOM_LEVELS].reverse()) {
    if ((distribution[level] ?? 0) > 0) {
      return level;
    }
  }
  return "remember";
}
function aggregateByFrequency(values) {
  const counts = /* @__PURE__ */ new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0]))).map(([value]) => value);
}
function isLowEmphasisProfile(profile) {
  return (profile.absoluteItemHint ?? 0) <= 1 || (profile.frequencyWeight ?? 0) <= 0.15;
}
function cloneConceptProfile(profile) {
  return {
    ...profile,
    bloomDistribution: { ...profile.bloomDistribution },
    scenarioPatterns: [...profile.scenarioPatterns],
    scenarioDirective: profile.scenarioDirective,
    itemModes: [...profile.itemModes]
  };
}
function normalizeConceptProfiles(concepts) {
  const totalItems = concepts.reduce((sum, concept) => sum + Math.max(0, concept.absoluteItemHint ?? 0), 0);
  return concepts.map((concept) => {
    const absoluteItemHint = Math.max(1, concept.absoluteItemHint ?? 1);
    const frequencyWeight = totalItems > 0 ? Number((absoluteItemHint / totalItems).toFixed(4)) : 0;
    const normalizedProfile = {
      ...concept,
      absoluteItemHint,
      frequencyWeight,
      lowEmphasis: isLowEmphasisProfile({ absoluteItemHint, frequencyWeight }),
      bloomDistribution: capDistributionAtBloomLevel(concept.bloomDistribution, concept.maxBloomLevel)
    };
    return normalizedProfile;
  }).sort((left, right) => right.frequencyWeight - left.frequencyWeight || left.displayName.localeCompare(right.displayName));
}
function buildMergedConceptProfile(profiles, merge) {
  const totalItems = profiles.reduce((sum, profile) => sum + Math.max(1, profile.absoluteItemHint ?? 1), 0);
  const bloomDistribution = createEmptyBloomDistribution();
  for (const profile of profiles) {
    const weight = Math.max(1, profile.absoluteItemHint ?? 1);
    for (const level of BLOOM_LEVELS) {
      bloomDistribution[level] += (profile.bloomDistribution[level] ?? 0) * weight;
    }
  }
  const normalizedBloom = totalItems > 0 ? BLOOM_LEVELS.reduce((distribution, level) => {
    distribution[level] = Number((bloomDistribution[level] / totalItems).toFixed(4));
    return distribution;
  }, createEmptyBloomDistribution()) : createSingleBloomDistribution("understand");
  const maxBloomLevel = profiles.reduce((current, profile) => compareBloomLevels(profile.maxBloomLevel, current) > 0 ? profile.maxBloomLevel : current, "remember");
  return {
    conceptId: canonicalConceptId(merge.mergedConceptId),
    displayName: merge.displayName ?? profiles[0]?.displayName ?? merge.mergedConceptId,
    frequencyWeight: 0,
    absoluteItemHint: totalItems,
    lowEmphasis: totalItems <= 1,
    bloomDistribution: normalizedBloom,
    scenarioPatterns: aggregateByFrequency(profiles.flatMap((profile) => profile.scenarioPatterns)),
    scenarioDirective: profiles.find((profile) => profile.scenarioDirective)?.scenarioDirective,
    itemModes: aggregateByFrequency(profiles.flatMap((profile) => profile.itemModes)),
    maxBloomLevel
  };
}
function updateSectionOrder(args) {
  const mergedBySource = /* @__PURE__ */ new Map();
  for (const merge of args.merges) {
    const mergedId = canonicalConceptId(merge.mergedConceptId);
    for (const conceptId of merge.conceptIds) {
      mergedBySource.set(canonicalConceptId(conceptId), mergedId);
    }
  }
  const nextOrder = [];
  for (const conceptId of args.sectionOrder) {
    const canonical = canonicalConceptId(conceptId);
    if (args.removed.has(canonical)) {
      continue;
    }
    const replaced = mergedBySource.get(canonical) ?? canonical;
    if (!nextOrder.includes(replaced)) {
      nextOrder.push(replaced);
    }
  }
  for (const addition of args.additions.map((conceptId) => canonicalConceptId(conceptId))) {
    if (!nextOrder.includes(addition)) {
      nextOrder.push(addition);
    }
  }
  for (const profile of args.conceptProfiles) {
    if (!nextOrder.includes(profile.conceptId)) {
      nextOrder.push(profile.conceptId);
    }
  }
  return nextOrder;
}
function buildAssessmentFingerprint(args) {
  const { teacherId, assessmentId, product, unitId, sourceType = "generated", now = new Date().toISOString() } = args;
  const totalItems = product.sections.reduce((sum, section) => sum + section.items.length, 0);
  const conceptProfiles = product.sections.map((section) => {
    const conceptId = canonicalConceptId(section.concept || section.items[0]?.concept || "general");
    const bloomCounts = createEmptyBloomDistribution();
    const itemModes = section.items.flatMap((item) => classifyItemModes(item.prompt));
    const scenarioPatterns = section.items.flatMap((item) => classifyScenarioTypes(item.prompt));
    for (const item of section.items) {
      const promptBloom = classifyBloomLevel(item.prompt);
      const demandBloom = bloomFromCognitiveDemand(item.cognitiveDemand);
      const bloom = BLOOM_LEVELS[Math.max(BLOOM_LEVELS.indexOf(promptBloom), BLOOM_LEVELS.indexOf(demandBloom))] ?? promptBloom;
      bloomCounts[bloom] += 1;
    }
    const bloomDistribution = normalizeDistribution(bloomCounts);
    return {
      conceptId,
      displayName: section.concept,
      frequencyWeight: totalItems > 0 ? Number((section.items.length / totalItems).toFixed(4)) : 0,
      absoluteItemHint: section.items.length,
      lowEmphasis: section.items.length <= 1,
      bloomDistribution,
      scenarioPatterns: aggregateByFrequency(scenarioPatterns),
      scenarioDirective: void 0,
      itemModes: aggregateByFrequency(itemModes),
      maxBloomLevel: highestBloomLevel(bloomDistribution)
    };
  });
  const ladder = unique(product.sections.flatMap((section) => section.items.map((item) => classifyBloomLevel(item.prompt))));
  return {
    teacherId,
    assessmentId,
    unitId,
    conceptProfiles,
    flowProfile: {
      sectionOrder: product.sections.map((section) => canonicalConceptId(section.concept)),
      typicalLengthRange: [product.totalItemCount, product.totalItemCount],
      cognitiveLadderShape: ladder
    },
    itemCount: product.totalItemCount,
    sourceType,
    lastUpdated: now,
    version: 1
  };
}
function ema(previous, current, alpha) {
  return Number((alpha * current + (1 - alpha) * previous).toFixed(4));
}
function mergeConceptProfiles(previous, current, alpha) {
  const merged = /* @__PURE__ */ new Map();
  for (const profile of previous) {
    merged.set(profile.conceptId, profile);
  }
  for (const profile of current) {
    const existing = merged.get(profile.conceptId);
    if (!existing) {
      merged.set(profile.conceptId, profile);
      continue;
    }
    const bloomDistribution = BLOOM_LEVELS.reduce((distribution, level) => {
      distribution[level] = ema(existing.bloomDistribution[level] ?? 0, profile.bloomDistribution[level] ?? 0, alpha);
      return distribution;
    }, createEmptyBloomDistribution());
    merged.set(profile.conceptId, {
      conceptId: profile.conceptId,
      displayName: profile.displayName || existing.displayName,
      frequencyWeight: ema(existing.frequencyWeight, profile.frequencyWeight, alpha),
      absoluteItemHint: Math.max(1, Math.round(ema(existing.absoluteItemHint ?? 0, profile.absoluteItemHint ?? 0, alpha))),
      lowEmphasis: false,
      bloomDistribution,
      scenarioPatterns: aggregateByFrequency([...existing.scenarioPatterns, ...profile.scenarioPatterns]),
      scenarioDirective: profile.scenarioDirective ?? existing.scenarioDirective,
      itemModes: aggregateByFrequency([...existing.itemModes, ...profile.itemModes]),
      maxBloomLevel: BLOOM_LEVELS[Math.max(BLOOM_LEVELS.indexOf(existing.maxBloomLevel), BLOOM_LEVELS.indexOf(profile.maxBloomLevel))] ?? profile.maxBloomLevel
    });
  }
  return normalizeConceptProfiles([...merged.values()]);
}
function aggregateBloomDistribution(concepts) {
  const counts = createEmptyBloomDistribution();
  for (const concept of concepts) {
    for (const level of BLOOM_LEVELS) {
      counts[level] += concept.bloomDistribution[level] ?? 0;
    }
  }
  return normalizeDistribution(counts);
}
function aggregateScenarioPreferences(concepts) {
  return aggregateByFrequency(concepts.flatMap((concept) => concept.scenarioPatterns));
}
function aggregateItemModes(concepts) {
  return aggregateByFrequency(concepts.flatMap((concept) => concept.itemModes));
}
function mergeAssessmentIntoUnitFingerprint(args) {
  const { previous, assessment, alpha = 0.7, now = new Date().toISOString() } = args;
  const conceptProfiles = mergeConceptProfiles(previous?.conceptProfiles ?? [], assessment.conceptProfiles, alpha);
  return {
    teacherId: assessment.teacherId,
    unitId: assessment.unitId ?? previous?.unitId ?? "unassigned-unit",
    conceptProfiles,
    flowProfile: {
      sectionOrder: assessment.flowProfile.sectionOrder.length > 0 ? assessment.flowProfile.sectionOrder : previous?.flowProfile.sectionOrder ?? [],
      typicalLengthRange: [
        Math.min(previous?.flowProfile.typicalLengthRange[0] ?? assessment.flowProfile.typicalLengthRange[0], assessment.flowProfile.typicalLengthRange[0]),
        Math.max(previous?.flowProfile.typicalLengthRange[1] ?? assessment.flowProfile.typicalLengthRange[1], assessment.flowProfile.typicalLengthRange[1])
      ],
      cognitiveLadderShape: assessment.flowProfile.cognitiveLadderShape.length > 0 ? assessment.flowProfile.cognitiveLadderShape : previous?.flowProfile.cognitiveLadderShape ?? []
    },
    derivedFromAssessmentIds: unique([...previous?.derivedFromAssessmentIds ?? [], assessment.assessmentId]),
    lastUpdated: now,
    version: (previous?.version ?? 0) + 1
  };
}
function mergeAssessmentIntoTeacherFingerprint(args) {
  const { previous, assessment, alpha = 0.7, now = new Date().toISOString() } = args;
  const globalConceptProfiles = mergeConceptProfiles(previous?.globalConceptProfiles ?? [], assessment.conceptProfiles, alpha);
  return {
    teacherId: assessment.teacherId,
    globalConceptProfiles,
    defaultBloomDistribution: aggregateBloomDistribution(globalConceptProfiles),
    defaultScenarioPreferences: aggregateScenarioPreferences(globalConceptProfiles),
    defaultItemModes: aggregateItemModes(globalConceptProfiles),
    flowProfile: {
      sectionOrder: assessment.flowProfile.sectionOrder.length > 0 ? assessment.flowProfile.sectionOrder : previous?.flowProfile.sectionOrder ?? [],
      typicalLengthRange: [
        Math.min(previous?.flowProfile.typicalLengthRange[0] ?? assessment.flowProfile.typicalLengthRange[0], assessment.flowProfile.typicalLengthRange[0]),
        Math.max(previous?.flowProfile.typicalLengthRange[1] ?? assessment.flowProfile.typicalLengthRange[1], assessment.flowProfile.typicalLengthRange[1])
      ],
      cognitiveLadderShape: assessment.flowProfile.cognitiveLadderShape.length > 0 ? assessment.flowProfile.cognitiveLadderShape : previous?.flowProfile.cognitiveLadderShape ?? []
    },
    lastUpdated: now,
    version: (previous?.version ?? 0) + 1
  };
}
function applyAssessmentFingerprintEdits(args) {
  const { assessment, edits } = args;
  const profiles = new Map(assessment.conceptProfiles.map((profile) => [profile.conceptId, cloneConceptProfile(profile)]));
  const removed = new Set((edits.removeConceptIds ?? []).map((conceptId) => canonicalConceptId(conceptId)));
  for (const conceptId of removed) {
    profiles.delete(conceptId);
  }
  for (const merge of edits.mergeConcepts ?? []) {
    const sourceProfiles = merge.conceptIds.map((conceptId) => profiles.get(canonicalConceptId(conceptId))).filter((profile) => Boolean(profile));
    if (sourceProfiles.length === 0) {
      continue;
    }
    for (const conceptId of merge.conceptIds) {
      profiles.delete(canonicalConceptId(conceptId));
      removed.add(canonicalConceptId(conceptId));
    }
    const mergedProfile = buildMergedConceptProfile(sourceProfiles, merge);
    profiles.set(mergedProfile.conceptId, mergedProfile);
  }
  for (const addition of edits.addConcepts ?? []) {
    const profile = createDefaultConceptProfile(addition);
    profiles.set(profile.conceptId, profile);
  }
  for (const [conceptId, itemCount] of Object.entries(edits.itemCountOverrides ?? {})) {
    const canonical = canonicalConceptId(conceptId);
    const existing = profiles.get(canonical) ?? createDefaultConceptProfile({ displayName: conceptId, conceptId: canonical, absoluteItemHint: itemCount });
    existing.absoluteItemHint = Math.max(1, itemCount);
    profiles.set(canonical, existing);
  }
  for (const [conceptId, override] of Object.entries(edits.bloomDistributions ?? {})) {
    const canonical = canonicalConceptId(conceptId);
    const existing = profiles.get(canonical) ?? createDefaultConceptProfile({ displayName: conceptId, conceptId: canonical });
    const counts = createEmptyBloomDistribution();
    let hasAnyLevel = false;
    for (const level of BLOOM_LEVELS) {
      const value = override[level];
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        counts[level] = value;
        hasAnyLevel = true;
      }
    }
    if (!hasAnyLevel) {
      continue;
    }
    existing.bloomDistribution = normalizeDistribution(counts);
    existing.maxBloomLevel = highestBloomLevel(existing.bloomDistribution);
    profiles.set(canonical, existing);
  }
  for (const [conceptId, maxBloomLevel] of Object.entries(edits.bloomCeilings ?? {})) {
    const canonical = canonicalConceptId(conceptId);
    const existing = profiles.get(canonical) ?? createDefaultConceptProfile({ displayName: conceptId, conceptId: canonical, maxBloomLevel });
    existing.maxBloomLevel = maxBloomLevel;
    existing.bloomDistribution = capDistributionAtBloomLevel(existing.bloomDistribution, maxBloomLevel);
    profiles.set(canonical, existing);
  }
  for (const [conceptId, appendedLevels] of Object.entries(edits.bloomLevelAppends ?? {})) {
    const canonical = canonicalConceptId(conceptId);
    const existing = profiles.get(canonical) ?? createDefaultConceptProfile({ displayName: conceptId, conceptId: canonical });
    const baseCount = Math.max(1, existing.absoluteItemHint ?? 1);
    const counts = BLOOM_LEVELS.reduce((distribution, level) => {
      distribution[level] = (existing.bloomDistribution[level] ?? 0) * baseCount;
      return distribution;
    }, createEmptyBloomDistribution());
    for (const level of appendedLevels) {
      counts[level] += 1;
    }
    existing.absoluteItemHint = baseCount + appendedLevels.length;
    existing.bloomDistribution = normalizeDistribution(counts);
    existing.maxBloomLevel = highestBloomLevel(existing.bloomDistribution);
    profiles.set(canonical, existing);
  }
  for (const [conceptId, scenarios] of Object.entries(edits.scenarioOverrides ?? {})) {
    const canonical = canonicalConceptId(conceptId);
    const existing = profiles.get(canonical) ?? createDefaultConceptProfile({ displayName: conceptId, conceptId: canonical, scenarioPatterns: scenarios });
    existing.scenarioPatterns = unique(scenarios);
    profiles.set(canonical, existing);
  }
  for (const [conceptId, scenarioDirective] of Object.entries(edits.scenarioDirectives ?? {})) {
    const canonical = canonicalConceptId(conceptId);
    const existing = profiles.get(canonical) ?? createDefaultConceptProfile({ displayName: conceptId, conceptId: canonical, scenarioDirective });
    existing.scenarioDirective = scenarioDirective;
    profiles.set(canonical, existing);
  }
  const normalizedProfiles = normalizeConceptProfiles([...profiles.values()]);
  const additions = (edits.addConcepts ?? []).map((concept) => concept.conceptId ?? concept.displayName);
  const nextSectionOrder = updateSectionOrder({
    sectionOrder: edits.sectionOrder ?? assessment.flowProfile.sectionOrder,
    removed,
    merges: edits.mergeConcepts ?? [],
    additions,
    conceptProfiles: normalizedProfiles
  });
  return {
    ...assessment,
    conceptProfiles: normalizedProfiles,
    flowProfile: {
      ...assessment.flowProfile,
      sectionOrder: nextSectionOrder
    },
    itemCount: normalizedProfiles.reduce((sum, concept) => sum + Math.max(1, concept.absoluteItemHint ?? 1), 0),
    lastUpdated: edits.now ?? new Date().toISOString(),
    version: assessment.version + 1
  };
}
function explainFingerprintAlignment(args) {
  const sourceProfiles = args.unitFingerprint?.conceptProfiles ?? args.teacherFingerprint.globalConceptProfiles;
  const conceptReasons = args.assessment.conceptProfiles.map((concept) => {
    const reference = sourceProfiles.find((profile) => profile.conceptId === concept.conceptId);
    const targetCount = reference?.absoluteItemHint ?? concept.absoluteItemHint ?? 0;
    const studentMastery = args.studentPerformanceProfile?.conceptMastery[concept.conceptId];
    const misconceptionPressure = (args.studentPerformanceProfile?.misconceptions[concept.conceptId] ?? []).length;
    const studentReason = studentMastery !== void 0 ? ` Student mastery is ${Math.round(studentMastery * 100)}%, so the builder keeps this concept in active rotation${misconceptionPressure > 0 ? ` and revisits ${misconceptionPressure} misconception cluster${misconceptionPressure === 1 ? "" : "s"}` : ""}.` : "";
    return `${concept.displayName} appears because the teacher fingerprint emphasizes it with about ${targetCount} item${targetCount === 1 ? "" : "s"}.${studentReason}`;
  });
  const sectionOrder = args.assessment.flowProfile.sectionOrder.join(" -> ");
  const weakestConcept = args.studentPerformanceProfile ? args.assessment.conceptProfiles.map((concept) => ({ concept, mastery: args.studentPerformanceProfile?.conceptMastery[concept.conceptId] ?? Number.POSITIVE_INFINITY })).sort((left, right) => left.mastery - right.mastery || left.concept.displayName.localeCompare(right.concept.displayName))[0] : null;
  const bloomReason = `Bloom levels follow the stored ceiling and distribution, topping out at ${args.assessment.conceptProfiles.map((concept) => concept.maxBloomLevel).sort((left, right) => compareBloomLevels(left, right)).at(-1) ?? "understand"}.${weakestConcept && Number.isFinite(weakestConcept.mastery) ? ` ${weakestConcept.concept.displayName} is receiving extra emphasis because the student shows lower mastery there.` : ""}`;
  const scenarioDirectiveReason = args.assessment.conceptProfiles.filter((concept) => concept.scenarioDirective).map((concept) => `${concept.displayName} keeps the original context while changing the numbers.`);
  const scenarioReason = `Scenario choices reflect preferred contexts: ${(args.teacherFingerprint.defaultScenarioPreferences.length > 0 ? args.teacherFingerprint.defaultScenarioPreferences : args.assessment.conceptProfiles.flatMap((concept) => concept.scenarioPatterns)).join(", ")}.${scenarioDirectiveReason.length > 0 ? ` ${scenarioDirectiveReason.join(" ")}` : ""}`;
  const flowReason = `Section order follows the teacher flow profile: ${sectionOrder || "no fixed sequence"}.`;
  return {
    narrative: [
      `This assessment matches the teacher fingerprint by emphasizing ${args.assessment.conceptProfiles.map((concept) => concept.displayName).join(", ")}.`,
      ...conceptReasons,
      bloomReason,
      scenarioReason,
      flowReason
    ].join(" "),
    conceptReasons,
    bloomReason,
    scenarioReason,
    flowReason
  };
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
    prefer,
    timeoutMs = 8e3
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => { controller.abort(); }, timeoutMs);
  let res;
  try {
    res = await fetch(reqUrl.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutError = new Error(`Supabase REST ${method} ${table} timed out after ${timeoutMs}ms`);
      timeoutError.code = "timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
var assessmentFingerprintMemory = /* @__PURE__ */ new Map();
var unitFingerprintMemory = /* @__PURE__ */ new Map();
var teacherFingerprintMemory = /* @__PURE__ */ new Map();
var ASSESSMENT_FINGERPRINTS_TABLE = "assessment_fingerprints";
var UNIT_FINGERPRINTS_TABLE = "unit_fingerprints";
var assessmentFingerprintPersistenceSupported = true;
var unitFingerprintPersistenceSupported = true;
function canUseSupabase() {
  return typeof window === "undefined" && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function isMissingSupabaseTableError(error, table) {
  const message = String(error instanceof Error ? error.message : error).toLowerCase();
  return message.includes("pgrst205") || message.includes("schema cache") && message.includes(table) || message.includes(`could not find the table 'public.${table}'`) || message.includes("22p02");
}
function disableFingerprintPersistence(table, error) {
  if (!isMissingSupabaseTableError(error, table)) {
    throw error;
  }
  if (table === ASSESSMENT_FINGERPRINTS_TABLE) {
    if (assessmentFingerprintPersistenceSupported) {
      console.warn(`[teacherFeedback.store] ${table} missing in Supabase schema cache; falling back to in-memory assessment fingerprints.`);
    }
    assessmentFingerprintPersistenceSupported = false;
    return;
  }
  if (unitFingerprintPersistenceSupported) {
    console.warn(`[teacherFeedback.store] ${table} missing in Supabase schema cache; falling back to in-memory unit fingerprints.`);
  }
  unitFingerprintPersistenceSupported = false;
}
function fingerprintUnitKey(teacherId, unitId) {
  return `${teacherId}::${unitId}`;
}
function sortAssessmentsForAggregation(assessments) {
  return [...assessments].sort((left, right) => left.lastUpdated.localeCompare(right.lastUpdated) || left.assessmentId.localeCompare(right.assessmentId));
}
function aggregateSectionOrder(assessments) {
  const positions = /* @__PURE__ */ new Map();
  for (const assessment of assessments) {
    assessment.flowProfile.sectionOrder.forEach((conceptId, index) => {
      const current = positions.get(conceptId) ?? { total: 0, count: 0 };
      current.total += index;
      current.count += 1;
      positions.set(conceptId, current);
    });
  }
  return [...positions.entries()].sort((left, right) => left[1].total / left[1].count - right[1].total / right[1].count || right[1].count - left[1].count || left[0].localeCompare(right[0])).map(([conceptId]) => conceptId);
}
function aggregateCognitiveLadder(assessments) {
  const positions = /* @__PURE__ */ new Map();
  for (const assessment of assessments) {
    assessment.flowProfile.cognitiveLadderShape.forEach((level, index) => {
      const current = positions.get(level) ?? { total: 0, count: 0 };
      current.total += index;
      current.count += 1;
      positions.set(level, current);
    });
  }
  return [...positions.entries()].sort((left, right) => left[1].total / left[1].count - right[1].total / right[1].count || right[1].count - left[1].count).map(([level]) => level);
}
function finalizeFlowProfiles(assessments, fingerprint) {
  if (!fingerprint) {
    return null;
  }
  return {
    ...fingerprint,
    flowProfile: {
      ...fingerprint.flowProfile,
      sectionOrder: aggregateSectionOrder(assessments),
      cognitiveLadderShape: aggregateCognitiveLadder(assessments)
    }
  };
}
function normalizeAssessmentFingerprint(fingerprint) {
  return {
    assessment_id: fingerprint.assessmentId,
    teacher_id: fingerprint.teacherId,
    unit_id: fingerprint.unitId ?? null,
    concept_profiles: fingerprint.conceptProfiles,
    flow_profile: fingerprint.flowProfile,
    item_count: fingerprint.itemCount,
    source_type: fingerprint.sourceType,
    last_updated: fingerprint.lastUpdated,
    version: fingerprint.version
  };
}
function normalizeUnitFingerprint(fingerprint) {
  return {
    teacher_id: fingerprint.teacherId,
    unit_id: fingerprint.unitId,
    concept_profiles: fingerprint.conceptProfiles,
    flow_profile: fingerprint.flowProfile,
    derived_from_assessment_ids: fingerprint.derivedFromAssessmentIds,
    last_updated: fingerprint.lastUpdated,
    version: fingerprint.version
  };
}
function hydrateAssessmentFingerprint(row) {
  return {
    assessmentId: String(row.assessment_id),
    teacherId: String(row.teacher_id),
    unitId: typeof row.unit_id === "string" ? row.unit_id : void 0,
    conceptProfiles: row.concept_profiles ?? [],
    flowProfile: row.flow_profile,
    itemCount: Number(row.item_count ?? 0),
    sourceType: row.source_type,
    lastUpdated: String(row.last_updated),
    version: Number(row.version ?? 1)
  };
}
function hydrateUnitFingerprint(row) {
  return {
    teacherId: String(row.teacher_id),
    unitId: String(row.unit_id),
    conceptProfiles: row.concept_profiles ?? [],
    flowProfile: row.flow_profile,
    derivedFromAssessmentIds: row.derived_from_assessment_ids ?? [],
    lastUpdated: String(row.last_updated),
    version: Number(row.version ?? 1)
  };
}
function recomputeStoredFingerprintsFromAssessments(teacherId, assessments) {
  for (const key of [...unitFingerprintMemory.keys()]) {
    if (key.startsWith(`${teacherId}::`)) {
      unitFingerprintMemory.delete(key);
    }
  }
  const teacherCandidates = assessments.filter((a) => a.sourceType !== "generated");
  let teacherFingerprint = null;
  for (const assessment of assessments) {
    assessmentFingerprintMemory.set(assessment.assessmentId, assessment);
    if (assessment.sourceType !== "generated") {
      teacherFingerprint = mergeAssessmentIntoTeacherFingerprint({ previous: teacherFingerprint, assessment, now: assessment.lastUpdated });
    }
    if (assessment.unitId) {
      const key = fingerprintUnitKey(teacherId, assessment.unitId);
      const previousUnit = unitFingerprintMemory.get(key) ?? null;
      unitFingerprintMemory.set(key, mergeAssessmentIntoUnitFingerprint({ previous: previousUnit, assessment, now: assessment.lastUpdated }));
    }
  }
  if (teacherFingerprint) {
    teacherFingerprintMemory.set(teacherId, finalizeFlowProfiles(teacherCandidates, teacherFingerprint));
    for (const [key, fingerprint] of [...unitFingerprintMemory.entries()]) {
      if (!key.startsWith(`${teacherId}::`)) {
        continue;
      }
      const unitId = key.slice(teacherId.length + 2);
      const unitAssessments = assessments.filter((assessment) => assessment.unitId === unitId);
      unitFingerprintMemory.set(key, finalizeFlowProfiles(unitAssessments, fingerprint));
    }
  } else {
    teacherFingerprintMemory.delete(teacherId);
  }
}
async function listTeacherAssessments(teacherId) {
  if (canUseSupabase() && assessmentFingerprintPersistenceSupported) {
    try {
      const rows = await supabaseRest(ASSESSMENT_FINGERPRINTS_TABLE, {
        select: "assessment_id,teacher_id,unit_id,concept_profiles,flow_profile,item_count,source_type,last_updated,version",
        filters: { teacher_id: `eq.${teacherId}`, order: "last_updated.asc,assessment_id.asc" }
      });
      return (rows ?? []).map((row) => hydrateAssessmentFingerprint(row));
    } catch (error) {
      disableFingerprintPersistence(ASSESSMENT_FINGERPRINTS_TABLE, error);
    }
  }
  return sortAssessmentsForAggregation([...assessmentFingerprintMemory.values()].filter((assessment) => assessment.teacherId === teacherId));
}
async function recomputeStoredFingerprints(teacherId) {
  const assessments = await listTeacherAssessments(teacherId);
  recomputeStoredFingerprintsFromAssessments(teacherId, assessments);
  if (!canUseSupabase() || !unitFingerprintPersistenceSupported) {
    return;
  }
  try {
    if (assessments.length === 0) {
      await supabaseRest(UNIT_FINGERPRINTS_TABLE, {
        method: "DELETE",
        filters: { teacher_id: `eq.${teacherId}` },
        prefer: "return=minimal"
      });
      return;
    }
    const unitFingerprints = [...unitFingerprintMemory.entries()].filter(([key]) => key.startsWith(`${teacherId}::`)).map(([, fingerprint]) => fingerprint);
    await supabaseRest(UNIT_FINGERPRINTS_TABLE, {
      method: "DELETE",
      filters: { teacher_id: `eq.${teacherId}` },
      prefer: "return=minimal"
    });
    if (unitFingerprints.length > 0) {
      await supabaseRest(UNIT_FINGERPRINTS_TABLE, {
        method: "POST",
        body: unitFingerprints.map((fingerprint) => normalizeUnitFingerprint(fingerprint)),
        prefer: "resolution=merge-duplicates,return=minimal"
      });
    }
  } catch (error) {
    disableFingerprintPersistence(UNIT_FINGERPRINTS_TABLE, error);
  }
}
async function saveAssessmentFingerprint(fingerprint) {
  assessmentFingerprintMemory.set(fingerprint.assessmentId, fingerprint);
  if (canUseSupabase() && assessmentFingerprintPersistenceSupported) {
    try {
      await supabaseRest(ASSESSMENT_FINGERPRINTS_TABLE, {
        method: "POST",
        body: normalizeAssessmentFingerprint(fingerprint),
        prefer: "resolution=merge-duplicates,return=minimal"
      });
    } catch (error) {
      disableFingerprintPersistence(ASSESSMENT_FINGERPRINTS_TABLE, error);
    }
  }
  await recomputeStoredFingerprints(fingerprint.teacherId);
  return {
    assessment: assessmentFingerprintMemory.get(fingerprint.assessmentId) ?? fingerprint,
    unit: fingerprint.unitId ? unitFingerprintMemory.get(fingerprintUnitKey(fingerprint.teacherId, fingerprint.unitId)) ?? null : null,
    teacher: teacherFingerprintMemory.get(fingerprint.teacherId) ?? null
  };
}
async function updateAssessmentFingerprint(args) {
  const current = await getAssessmentFingerprint(args.assessmentId);
  if (!current) {
    return null;
  }
  const rawUpdated = applyAssessmentFingerprintEdits({
    assessment: current,
    edits: args.edits
  });
  const updated = rawUpdated.sourceType === "generated" ? { ...rawUpdated, sourceType: "hybrid" } : rawUpdated;
  assessmentFingerprintMemory.set(updated.assessmentId, updated);
  if (canUseSupabase() && assessmentFingerprintPersistenceSupported) {
    try {
      await supabaseRest(ASSESSMENT_FINGERPRINTS_TABLE, {
        method: "POST",
        body: normalizeAssessmentFingerprint(updated),
        prefer: "resolution=merge-duplicates,return=minimal"
      });
    } catch (error) {
      disableFingerprintPersistence(ASSESSMENT_FINGERPRINTS_TABLE, error);
    }
  }
  await recomputeStoredFingerprints(updated.teacherId);
  return {
    assessment: updated,
    unit: updated.unitId ? unitFingerprintMemory.get(fingerprintUnitKey(updated.teacherId, updated.unitId)) ?? null : null,
    teacher: teacherFingerprintMemory.get(updated.teacherId) ?? null
  };
}
async function getAssessmentFingerprint(assessmentId) {
  if (canUseSupabase() && assessmentFingerprintPersistenceSupported) {
    try {
      const rows = await supabaseRest(ASSESSMENT_FINGERPRINTS_TABLE, {
        select: "assessment_id,teacher_id,unit_id,concept_profiles,flow_profile,item_count,source_type,last_updated,version",
        filters: { assessment_id: `eq.${assessmentId}` }
      });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) {
        return null;
      }
      const fingerprint = hydrateAssessmentFingerprint(row);
      assessmentFingerprintMemory.set(fingerprint.assessmentId, fingerprint);
      return fingerprint;
    } catch (error) {
      disableFingerprintPersistence(ASSESSMENT_FINGERPRINTS_TABLE, error);
    }
  }
  return assessmentFingerprintMemory.get(assessmentId) ?? null;
}
async function getUnitFingerprint(teacherId, unitId) {
  if (canUseSupabase() && unitFingerprintPersistenceSupported) {
    try {
      const rows = await supabaseRest(UNIT_FINGERPRINTS_TABLE, {
        select: "teacher_id,unit_id,concept_profiles,flow_profile,derived_from_assessment_ids,last_updated,version",
        filters: { teacher_id: `eq.${teacherId}`, unit_id: `eq.${unitId}` }
      });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) {
        return null;
      }
      const fingerprint = hydrateUnitFingerprint(row);
      unitFingerprintMemory.set(fingerprintUnitKey(teacherId, unitId), fingerprint);
      return fingerprint;
    } catch (error) {
      disableFingerprintPersistence(UNIT_FINGERPRINTS_TABLE, error);
    }
  }
  return unitFingerprintMemory.get(fingerprintUnitKey(teacherId, unitId)) ?? null;
}
async function getTeacherFingerprint(teacherId) {
  if (canUseSupabase()) {
    if (!teacherFingerprintMemory.has(teacherId)) {
      const assessments = await listTeacherAssessments(teacherId);
      recomputeStoredFingerprintsFromAssessments(teacherId, assessments);
    }
    return teacherFingerprintMemory.get(teacherId) ?? null;
  }
  return teacherFingerprintMemory.get(teacherId) ?? null;
}
async function explainAssessmentFingerprintAlignment(assessmentId) {
  const assessment = assessmentFingerprintMemory.get(assessmentId) ?? null;
  if (!assessment) {
    return null;
  }
  const teacherFingerprint = teacherFingerprintMemory.get(assessment.teacherId) ?? null;
  if (!teacherFingerprint) {
    return null;
  }
  const unitFingerprint = assessment.unitId ? unitFingerprintMemory.get(fingerprintUnitKey(assessment.teacherId, assessment.unitId)) ?? null : null;
  return explainFingerprintAlignment({
    assessment,
    teacherFingerprint,
    unitFingerprint
  });
}
var runtime = "nodejs";
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function getAssessmentId(req) {
  const queryId = Array.isArray(req.query.assessmentId) ? req.query.assessmentId[0] : req.query.assessmentId;
  if (typeof queryId === "string" && queryId.trim().length > 0) {
    return queryId.trim();
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
  return typeof body.assessmentId === "string" && body.assessmentId.trim().length > 0 ? body.assessmentId.trim() : null;
}
async function buildBlueprintResponse(assessmentId) {
  const assessment = await getAssessmentFingerprint(assessmentId);
  if (!assessment) {
    return null;
  }
  const teacher = await getTeacherFingerprint(assessment.teacherId);
  const unit = assessment.unitId ? await getUnitFingerprint(assessment.teacherId, assessment.unitId) : null;
  const explanation = teacher ? explainAssessmentFingerprintAlignment({
    assessment,
    teacherFingerprint: teacher,
    unitFingerprint: unit
  }) : null;
  return {
    assessment,
    unit,
    teacher,
    explanation
  };
}
function isTestProduct(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return candidate.kind === "test" && Array.isArray(candidate.sections) && typeof candidate.totalItemCount === "number";
}
async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }
  if (req.method === "GET") {
    const assessmentId = getAssessmentId(req);
    if (!assessmentId) {
      return res.status(400).json({ error: "assessmentId is required" });
    }
    const response = await buildBlueprintResponse(assessmentId);
    if (!response) {
      return res.status(404).json({ error: "Assessment fingerprint not found" });
    }
    return res.status(200).json(response);
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const assessmentId = typeof body.assessmentId === "string" && body.assessmentId.trim().length > 0 ? body.assessmentId.trim() : null;
    const teacherId = typeof body.teacherId === "string" && body.teacherId.trim().length > 0 ? body.teacherId.trim() : null;
    const unitId = typeof body.unitId === "string" && body.unitId.trim().length > 0 ? body.unitId.trim() : void 0;
    const product = isTestProduct(body.product) ? body.product : null;
    const edits = body.edits;
    if (!assessmentId || !edits || typeof edits !== "object") {
      return res.status(400).json({ error: "assessmentId and edits are required" });
    }
    if (product && teacherId) {
      await saveAssessmentFingerprint(buildAssessmentFingerprint({
        teacherId,
        assessmentId,
        unitId,
        product,
        sourceType: "generated"
      }));
    }
    const updated = await updateAssessmentFingerprint({
      assessmentId,
      edits
    });
    if (!updated) {
      return res.status(404).json({ error: "Assessment fingerprint not found" });
    }
    const explanation = updated.teacher ? explainAssessmentFingerprintAlignment({
      assessment: updated.assessment,
      teacherFingerprint: updated.teacher,
      unitFingerprint: updated.unit
    }) : null;
    return res.status(200).json({
      assessment: updated.assessment,
      unit: updated.unit,
      teacher: updated.teacher,
      explanation
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Assessment blueprint request failed"
    });
  }
}
export {
  handler as default,
  runtime
};
