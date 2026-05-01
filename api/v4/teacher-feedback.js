"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/teacher-feedback.ts
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
var INSTRUCTIONAL_UNIT_OVERRIDE_NAMESPACE = "instructional-unit";
function buildInstructionalUnitOverrideId(sessionId, unitId) {
  return `${sessionId}::${INSTRUCTIONAL_UNIT_OVERRIDE_NAMESPACE}::${unitId}`;
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
function oneHotBloom(value) {
  if (typeof value !== "string") {
    return typeof value === "object" && value ? value : {};
  }
  return {
    remember: value === "remember" ? 1 : 0,
    understand: value === "understand" ? 1 : 0,
    apply: value === "apply" ? 1 : 0,
    analyze: value === "analyze" ? 1 : 0,
    evaluate: value === "evaluate" ? 1 : 0,
    create: value === "create" ? 1 : 0
  };
}
function deriveTemplateFromFeedback(feedback) {
  const evidenceText = feedback.evidence?.text?.trim();
  if (!evidenceText) {
    return null;
  }
  if (!["bloom", "difficulty", "multiStep", "concepts", "misconceptionRisk"].includes(feedback.target)) {
    return null;
  }
  const difficultyDelta = typeof feedback.teacherValue === "number" && typeof feedback.aiValue === "number" ? feedback.teacherValue - feedback.aiValue : void 0;
  const misconceptionDelta = typeof feedback.teacherValue === "number" && typeof feedback.aiValue === "number" ? feedback.teacherValue - feedback.aiValue : void 0;
  const multiStepValue = typeof feedback.teacherValue === "number" ? Math.min(1, Math.max(0, feedback.teacherValue)) : void 0;
  return {
    name: `Teacher Pattern: ${evidenceText.slice(0, 40)}`,
    archetypeKey: "teacher-derived",
    evidenceText,
    patternConfig: {
      textPatterns: [evidenceText.toLowerCase()],
      structuralPatterns: [],
      regexPatterns: [],
      minConfidence: 0.85
    },
    bloom: feedback.target === "bloom" ? oneHotBloom(feedback.teacherValue) : feedback.target === "multiStep" ? { apply: 0.2, analyze: Number(feedback.teacherValue) > Number(feedback.aiValue) ? 0.2 : 0.05 } : void 0,
    difficultyBoost: feedback.target === "difficulty" || feedback.target === "multiStep" ? difficultyDelta : void 0,
    multiStepBoost: feedback.target === "multiStep" ? multiStepValue : void 0,
    misconceptionRiskBoost: feedback.target === "misconceptionRisk" ? misconceptionDelta : void 0,
    stepHints: feedback.target === "multiStep" && typeof multiStepValue === "number" ? {
      expectedSteps: Math.min(6, Math.max(1, Math.round(1 + multiStepValue * 5))),
      stepType: multiStepValue >= 0.55 ? "mixed" : "conceptual"
    } : void 0
  };
}
var teacherActionMemory = [];
var learningDirty = false;
var ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1e3;
function canUseSupabase() {
  return typeof window === "undefined" && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function hashText(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function toStableUuid(value) {
  if (isUuid(value)) {
    return value.toLowerCase();
  }
  const seed = [
    hashText(value),
    hashText(`${value}:a`),
    hashText(`${value}:b`),
    hashText(`${value}:c`)
  ].join("");
  const chars = seed.slice(0, 32).split("");
  chars[12] = "4";
  chars[16] = ["8", "9", "a", "b"][parseInt(chars[16] ?? "0", 16) % 4];
  const hex = chars.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
function toIsoString(value) {
  return new Date(value).toISOString();
}
function normalizeTeacherActionEvent(event) {
  return {
    teacher_id: toStableUuid(event.teacherId),
    problem_id: event.problemId,
    action_type: event.actionType,
    old_value: event.oldValue ?? null,
    new_value: event.newValue ?? null,
    context: {
      ...event.context,
      originalTeacherId: event.teacherId
    },
    created_at: toIsoString(event.timestamp)
  };
}
async function recordTeacherAction(event) {
  teacherActionMemory.push(event);
  learningDirty = true;
  if (canUseSupabase()) {
    await supabaseRest("teacher_action_events", {
      method: "POST",
      body: normalizeTeacherActionEvent(event),
      prefer: "return=minimal"
    });
  }
}
var feedbackMemory = [];
var overrideMemory = /* @__PURE__ */ new Map();
var templateMemory = /* @__PURE__ */ new Map();
var assessmentFingerprintMemory = /* @__PURE__ */ new Map();
var unitFingerprintMemory = /* @__PURE__ */ new Map();
var teacherFingerprintMemory = /* @__PURE__ */ new Map();
var ASSESSMENT_FINGERPRINTS_TABLE = "assessment_fingerprints";
var UNIT_FINGERPRINTS_TABLE = "unit_fingerprints";
var assessmentFingerprintPersistenceSupported = true;
var unitFingerprintPersistenceSupported = true;
var BLOOM_KEYS = ["remember", "understand", "apply", "analyze", "evaluate", "create"];
var REQUIRED_VECTOR_KEYS = /* @__PURE__ */ new Set([
  "subject",
  "domain",
  "concepts",
  "problemType",
  "multiStep",
  "steps",
  "representation",
  "representationCount",
  "linguisticLoad",
  "vocabularyTier",
  "sentenceComplexity",
  "wordProblem",
  "passiveVoice",
  "abstractLanguage",
  "bloom",
  "difficulty",
  "distractorDensity",
  "abstractionLevel",
  "misconceptionTriggers",
  "frustrationRisk",
  "engagementPotential",
  "cognitive"
]);
function createUuid() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function hashText2(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = hash * 31 + value.charCodeAt(index) >>> 0;
  }
  return hash.toString(16);
}
function canUseSupabase2() {
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
function createFeedback(payload) {
  return {
    feedbackId: createUuid(),
    teacherId: payload.teacherId,
    documentId: payload.documentId,
    canonicalProblemId: payload.canonicalProblemId,
    target: payload.target,
    aiValue: payload.aiValue,
    teacherValue: payload.teacherValue,
    rationale: payload.rationale,
    evidence: payload.evidence,
    createdAt: new Date().toISOString()
  };
}
function feedbackTargetToActionType(target) {
  switch (target) {
    case "multiStep":
      return "expected_steps_correction";
    case "difficulty":
      return "difficulty_correction";
    case "representationComplexity":
      return "representation_correction";
    case "segmentation":
    case "problemGrouping":
      return "multipart_restructure";
    default:
      return "template_override";
  }
}
function buildTeacherActionEvent(payload, feedback) {
  return {
    eventId: `action-${feedback.feedbackId}`,
    teacherId: feedback.teacherId,
    problemId: feedback.canonicalProblemId,
    timestamp: Date.parse(feedback.createdAt),
    actionType: feedbackTargetToActionType(payload.target),
    oldValue: payload.aiValue,
    newValue: payload.teacherValue,
    context: {
      subject: payload.context?.subject ?? "unknown",
      gradeLevel: payload.context?.gradeLevel,
      templateIds: payload.context?.templateIds ?? [],
      teacherTemplateIds: payload.context?.teacherTemplateIds ?? [],
      assessmentId: payload.context?.assessmentId,
      unitId: payload.context?.unitId,
      conceptId: payload.context?.conceptId,
      conceptDisplayName: payload.context?.conceptDisplayName,
      scenarioType: payload.context?.scenarioType,
      scope: payload.context?.scope
    }
  };
}
function oneHotBloom2(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const key = value.toLowerCase();
  const levels = ["remember", "understand", "apply", "analyze", "evaluate", "create"];
  if (!levels.includes(key)) {
    return void 0;
  }
  return {
    remember: key === "remember" ? 1 : 0,
    understand: key === "understand" ? 1 : 0,
    apply: key === "apply" ? 1 : 0,
    analyze: key === "analyze" ? 1 : 0,
    evaluate: key === "evaluate" ? 1 : 0,
    create: key === "create" ? 1 : 0
  };
}
function toOverrideFragment(feedback) {
  switch (feedback.target) {
    case "bloom":
      return { bloom: typeof feedback.teacherValue === "object" && feedback.teacherValue ? feedback.teacherValue : oneHotBloom2(feedback.teacherValue) };
    case "difficulty":
      return { difficulty: Number(feedback.teacherValue) };
    case "linguisticLoad":
      return { linguisticLoad: Number(feedback.teacherValue) };
    case "abstractionLevel":
      return { abstractionLevel: Number(feedback.teacherValue) };
    case "multiStep":
      return { multiStep: Number(feedback.teacherValue) };
    case "representationComplexity":
      return { representationComplexity: Number(feedback.teacherValue) };
    case "misconceptionRisk":
      return { misconceptionRisk: Number(feedback.teacherValue) };
    case "concepts":
      return { concepts: feedback.teacherValue ?? {} };
    case "subject":
      return { subject: String(feedback.teacherValue ?? "") };
    case "domain":
      return { domain: String(feedback.teacherValue ?? "") };
    case "stemText":
      return { stemText: String(feedback.teacherValue ?? "") };
    case "partText":
      return { partText: String(feedback.teacherValue ?? "") };
    case "segmentation":
      return { segmentation: typeof feedback.teacherValue === "object" && feedback.teacherValue ? feedback.teacherValue : { value: feedback.teacherValue } };
    case "problemGrouping":
      return { problemGrouping: typeof feedback.teacherValue === "object" && feedback.teacherValue ? feedback.teacherValue : { value: feedback.teacherValue } };
    case "tags":
      return { tags: typeof feedback.teacherValue === "object" && feedback.teacherValue ? feedback.teacherValue : { value: feedback.teacherValue } };
    default:
      return { other: feedback.teacherValue };
  }
}
function isNumberInRange(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}
function validateOverrides(overrides, currentOverrideVersion = 0) {
  if (!overrides || typeof overrides !== "object") {
    throw new Error("INVALID_OVERRIDE: overrides must be an object");
  }
  const candidate = overrides;
  if (candidate.bloom) {
    for (const [key, value] of Object.entries(candidate.bloom)) {
      if (!BLOOM_KEYS.includes(key) || !isNumberInRange(value)) {
        throw new Error("INVALID_OVERRIDE: bloom must use valid keys with values in [0,1]");
      }
    }
  }
  for (const key of ["difficulty", "multiStep", "misconceptionRisk", "representationComplexity", "linguisticLoad", "abstractionLevel"]) {
    const value = candidate[key];
    if (value !== void 0 && !isNumberInRange(value)) {
      throw new Error(`INVALID_OVERRIDE: ${key} must be in [0,1]`);
    }
  }
  if (candidate.concepts) {
    for (const [concept, weight] of Object.entries(candidate.concepts)) {
      if (!concept || !isNumberInRange(weight)) {
        throw new Error("INVALID_OVERRIDE: concepts must be a string-to-number map in [0,1]");
      }
    }
  }
  if (candidate.tags) {
    for (const [key, value] of Object.entries(candidate.tags)) {
      if (REQUIRED_VECTOR_KEYS.has(key) && (value === null || value === void 0)) {
        throw new Error(`INVALID_OVERRIDE: cannot remove required field ${key}`);
      }
    }
  }
  return {
    ...candidate,
    overrideVersion: currentOverrideVersion + 1,
    lastUpdatedAt: new Date().toISOString()
  };
}
function mergeOverrideRecords(current, fragment) {
  const merged = {
    ...current ?? {},
    ...fragment,
    concepts: fragment.concepts ?? current?.concepts,
    tags: {
      ...current?.tags ?? {},
      ...fragment.tags ?? {}
    },
    misconceptionTriggers: {
      ...current?.misconceptionTriggers ?? {},
      ...fragment.misconceptionTriggers ?? {}
    }
  };
  return validateOverrides(merged, current?.overrideVersion ?? 0);
}
function normalizeOverride(canonicalProblemId, overrides) {
  return {
    canonical_problem_id: canonicalProblemId,
    overrides,
    updated_at: overrides.lastUpdatedAt
  };
}
function normalizeFeedback(feedback) {
  return {
    feedback_id: feedback.feedbackId,
    teacher_id: feedback.teacherId,
    document_id: feedback.documentId,
    canonical_problem_id: feedback.canonicalProblemId,
    target: feedback.target,
    ai_value: feedback.aiValue,
    teacher_value: feedback.teacherValue,
    rationale: feedback.rationale ?? null,
    evidence: feedback.evidence ?? null,
    created_at: feedback.createdAt
  };
}
function normalizeTemplate(template) {
  return {
    id: template.id,
    teacher_id: template.teacherId,
    source_feedback_id: template.sourceFeedbackId,
    evidence_text: template.evidenceText,
    subject: template.subject ?? null,
    domain: template.domain ?? null,
    bloom: template.bloom ?? null,
    difficulty_boost: template.difficultyBoost ?? null,
    misconception_risk_boost: template.misconceptionRiskBoost ?? null,
    multi_step_boost: template.multiStepBoost ?? null,
    created_at: template.createdAt
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
function isBloomLevel(value) {
  return typeof value === "string" && BLOOM_KEYS.includes(value.toLowerCase());
}
function isScenarioType(value) {
  return typeof value === "string" && ["real-world", "simulation", "data-table", "graphical", "abstract-symbolic"].includes(value);
}
function inferFingerprintEdits(payload, assessment) {
  const context = payload.context;
  if (!context) {
    return null;
  }
  const conceptId = context.conceptId ? canonicalConceptId(context.conceptId) : void 0;
  const edits = {};
  if (payload.target === "bloom" && conceptId && isBloomLevel(payload.teacherValue)) {
    edits.bloomCeilings = { [conceptId]: payload.teacherValue.toLowerCase() };
    edits.bloomLevelAppends = { [conceptId]: [payload.teacherValue.toLowerCase()] };
  }
  if (payload.target === "concepts" && payload.teacherValue && typeof payload.teacherValue === "object") {
    const teacherConcepts = Object.entries(payload.teacherValue).filter(([, weight]) => typeof weight === "number" ? weight > 0 : Boolean(weight));
    const existingConceptIds = new Set(assessment.conceptProfiles.map((profile) => profile.conceptId));
    const addConcepts = teacherConcepts.map(([displayName, weight]) => ({
      conceptId: canonicalConceptId(displayName),
      displayName,
      absoluteItemHint: Math.max(1, Math.round(typeof weight === "number" ? weight : 1))
    })).filter((profile) => !existingConceptIds.has(profile.conceptId));
    if (addConcepts.length > 0) {
      edits.addConcepts = addConcepts;
    }
    if (context.scope === "instructional-unit" && teacherConcepts.length > 0) {
      edits.sectionOrder = teacherConcepts.map(([displayName]) => canonicalConceptId(displayName));
    }
  }
  if (context.scenarioType && conceptId && isScenarioType(context.scenarioType)) {
    edits.scenarioOverrides = { [conceptId]: [context.scenarioType] };
  }
  if (!edits.addConcepts && !edits.bloomCeilings && !edits.bloomLevelAppends && !edits.sectionOrder && !edits.scenarioOverrides) {
    return null;
  }
  return edits;
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
  if (canUseSupabase2() && assessmentFingerprintPersistenceSupported) {
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
  if (!canUseSupabase2() || !unitFingerprintPersistenceSupported) {
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
async function readJsonIfAvailable(response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.startsWith("<")) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}
async function saveTeacherFeedback(payload) {
  const feedback = createFeedback(payload);
  const currentOverride = await getProblemOverride(payload.canonicalProblemId);
  const mergedOverride = mergeOverrideRecords(currentOverride, toOverrideFragment(feedback));
  if (canUseSupabase2()) {
    await supabaseRest("teacher_feedback", {
      method: "POST",
      body: normalizeFeedback(feedback),
      prefer: "return=minimal"
    });
    await supabaseRest("problem_overrides", {
      method: "POST",
      body: normalizeOverride(payload.canonicalProblemId, mergedOverride),
      prefer: "resolution=merge-duplicates,return=minimal"
    });
  } else {
    feedbackMemory.push(feedback);
    overrideMemory.set(payload.canonicalProblemId, mergedOverride);
  }
  const learnedTemplate = await learnTemplateFromFeedback(feedback);
  if (payload.context?.assessmentId) {
    const assessment = await getAssessmentFingerprint(payload.context.assessmentId);
    const edits = assessment ? inferFingerprintEdits(payload, assessment) : null;
    if (assessment && edits) {
      await updateAssessmentFingerprint({
        assessmentId: assessment.assessmentId,
        edits: {
          ...edits,
          now: feedback.createdAt
        }
      });
    }
  }
  await recordTeacherAction(buildTeacherActionEvent(payload, feedback));
  return {
    feedback,
    overrides: mergedOverride,
    learnedTemplate
  };
}
async function getProblemOverride(canonicalProblemId) {
  if (typeof window !== "undefined") {
    const response = await fetch(`/api/v4/problem-overrides/${encodeURIComponent(canonicalProblemId)}`);
    if (!response.ok) {
      return null;
    }
    const payload = await readJsonIfAvailable(response);
    if (!payload) {
      return null;
    }
    return payload.overrides ?? null;
  }
  if (canUseSupabase2()) {
    const rows = await supabaseRest("problem_overrides", {
      select: "canonical_problem_id,overrides,updated_at",
      filters: { canonical_problem_id: `eq.${canonicalProblemId}` }
    });
    const row = Array.isArray(rows) ? rows[0] : null;
    return row?.overrides ?? null;
  }
  return overrideMemory.get(canonicalProblemId) ?? null;
}
function buildTemplateId(evidenceText) {
  return `teacher-derived-${hashText2(evidenceText).slice(0, 12)}`;
}
function buildTeacherTemplateRecord(feedback) {
  const derived = deriveTemplateFromFeedback(feedback);
  if (!derived) {
    return null;
  }
  return {
    id: buildTemplateId(derived.evidenceText ?? feedback.evidence?.text?.trim() ?? ""),
    teacherId: feedback.teacherId,
    sourceFeedbackId: feedback.feedbackId,
    evidenceText: derived.evidenceText ?? feedback.evidence?.text?.trim() ?? "",
    name: derived.name,
    archetypeKey: derived.archetypeKey,
    patternConfig: derived.patternConfig,
    stepHints: derived.stepHints,
    bloom: derived.bloom,
    difficultyBoost: derived.difficultyBoost,
    multiStepBoost: derived.multiStepBoost,
    misconceptionRiskBoost: derived.misconceptionRiskBoost,
    createdAt: feedback.createdAt
  };
}
async function learnTemplateFromFeedback(feedback) {
  const template = buildTeacherTemplateRecord(feedback);
  if (!template) {
    return null;
  }
  const existing = templateMemory.get(template.id);
  const merged = existing ? {
    ...existing,
    name: template.name ?? existing.name,
    archetypeKey: template.archetypeKey ?? existing.archetypeKey,
    patternConfig: template.patternConfig ?? existing.patternConfig,
    stepHints: template.stepHints ?? existing.stepHints,
    bloom: { ...existing.bloom ?? {}, ...template.bloom ?? {} },
    difficultyBoost: template.difficultyBoost ?? existing.difficultyBoost,
    multiStepBoost: template.multiStepBoost ?? existing.multiStepBoost,
    misconceptionRiskBoost: template.misconceptionRiskBoost ?? existing.misconceptionRiskBoost
  } : template;
  if (canUseSupabase2()) {
    try {
      await supabaseRest("cognitive_templates", {
        method: "POST",
        body: normalizeTemplate(merged),
        prefer: "resolution=merge-duplicates,return=minimal"
      });
    } catch (insertError) {
      const normalizedWithoutBoost = { ...normalizeTemplate(merged) };
      delete normalizedWithoutBoost.multi_step_boost;
      try {
        await supabaseRest("cognitive_templates", {
          method: "POST",
          body: normalizedWithoutBoost,
          prefer: "resolution=merge-duplicates,return=minimal"
        });
      } catch (fallbackError) {
        throw insertError;
      }
    }
  }
  templateMemory.set(merged.id, merged);
  return merged;
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
  if (canUseSupabase2() && assessmentFingerprintPersistenceSupported) {
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
  if (canUseSupabase2() && assessmentFingerprintPersistenceSupported) {
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
var runtime = "nodejs";
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const payload = req.body ?? {};
    const canonicalProblemId = typeof payload.canonicalProblemId === "string" && payload.canonicalProblemId.trim().length > 0 ? payload.canonicalProblemId : payload.scope === "instructional-unit" && typeof payload.sessionId === "string" && typeof payload.unitId === "string" ? buildInstructionalUnitOverrideId(payload.sessionId, payload.unitId) : null;
    if (!payload.teacherId || !payload.documentId || !canonicalProblemId || !payload.target) {
      return res.status(400).json({ error: "Missing required teacher feedback fields." });
    }
    const result = await saveTeacherFeedback({
      ...payload,
      canonicalProblemId
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("INVALID_OVERRIDE:")) {
      return res.status(400).json({ error: error.message.replace("INVALID_OVERRIDE: ", "") });
    }
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Teacher feedback failed"
    });
  }
}
export {
  handler as default,
  runtime
};
