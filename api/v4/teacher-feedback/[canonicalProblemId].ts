"use strict";
/* Bundled by esbuild — do not edit */
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

// src/prism-v4/semantic/cognitive/templates/templates.json
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

// lib/supabase.ts
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

// src/prism-v4/semantic/cognitive/templates/loadTemplates.ts
var import_templates = __toESM(require_templates());
function loadSeededTemplates() {
  return import_templates.default;
}

// src/prism-v4/semantic/cognitive/templates/loadTeacherTemplates.ts
var SYSTEM_TEMPLATE_IDS = new Set(loadSeededTemplates().map((template) => template.id));

// src/prism-v4/semantic/learning/learningService.ts
var ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1e3;

// src/prism-v4/teacherFeedback/store.ts
var feedbackMemory = [];
function canUseSupabase() {
  return typeof window === "undefined" && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
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
async function getFeedbackForProblem(canonicalProblemId) {
  if (typeof window !== "undefined") {
    const response = await fetch(`/api/v4/teacher-feedback/${encodeURIComponent(canonicalProblemId)}`);
    if (!response.ok) {
      return [];
    }
    const payload = await readJsonIfAvailable(response);
    if (!payload) {
      return [];
    }
    return payload.feedback ?? [];
  }
  if (canUseSupabase()) {
    const rows = await supabaseRest("teacher_feedback", {
      select: "feedback_id,teacher_id,document_id,canonical_problem_id,target,ai_value,teacher_value,rationale,evidence,created_at",
      filters: { canonical_problem_id: `eq.${canonicalProblemId}`, order: "created_at.desc" }
    });
    return (rows ?? []).map((row) => ({
      feedbackId: String(row.feedback_id),
      teacherId: String(row.teacher_id),
      documentId: String(row.document_id),
      canonicalProblemId: String(row.canonical_problem_id),
      target: row.target,
      aiValue: row.ai_value,
      teacherValue: row.teacher_value,
      rationale: typeof row.rationale === "string" ? row.rationale : void 0,
      evidence: row.evidence,
      createdAt: String(row.created_at)
    }));
  }
  return feedbackMemory.filter((feedback) => feedback.canonicalProblemId === canonicalProblemId);
}

// api/v4/teacher-feedback/[canonicalProblemId].ts
var runtime = "nodejs";
async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { canonicalProblemId } = req.query;
    const problemId = Array.isArray(canonicalProblemId) ? canonicalProblemId[0] : canonicalProblemId;
    if (!problemId) {
      return res.status(400).json({ error: "Missing canonicalProblemId" });
    }
    const feedback = await getFeedbackForProblem(problemId);
    return res.status(200).json({ feedback });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load teacher feedback" });
  }
}
export {
  handler as default,
  runtime
};
