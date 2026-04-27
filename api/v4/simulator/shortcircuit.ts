"use strict";
/* Bundled by esbuild — do not edit */
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
var init_supabase = __esm({
  "lib/supabase.ts"() {
    "use strict";
  }
});

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

// api/v4/simulator/shortcircuit.ts
init_supabase();

// src/prism-v4/segmentation/subItemHeuristics.ts
var LETTERED_LINE_REGEX = /^\s*\(?([a-hA-H])\)?[\.)](?:\s+|$)/;
var MC_STEM_PHRASES = [
  "which of the following",
  "what is",
  "which statement",
  "which choice",
  "which option",
  "the correct answer",
  "is closest to",
  "is approximately",
  "is most likely",
  "is least likely",
  "best describes",
  "best explains",
  "best represents",
  "would most likely",
  "would least likely",
  "the value of",
  "the result of",
  "the effect of",
  "the outcome of",
  "the purpose of",
  "the main idea",
  "the central idea",
  "the author most likely",
  "the passage suggests",
  "the graph shows",
  "the table shows",
  "the figure shows"
];
var SUBITEM_VERB_REGEX = /\b(identify|determine|interpret|explain|calculate|find|solve|justify|evaluate|compare|describe|choose|select|compute|state|write|graph|prove|show|analyze|summarize|infer|support)\b/i;
function isLetteredLine(line) {
  return LETTERED_LINE_REGEX.test(line.trim());
}
function stripLetteredPrefix(line) {
  return line.replace(LETTERED_LINE_REGEX, "").trim();
}
function getParentStem(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => !isLetteredLine(line)) ?? "";
}
function parentLooksLikeMCStem(parentStem) {
  const normalized = parentStem.toLowerCase();
  return MC_STEM_PHRASES.some((phrase) => normalized.includes(phrase));
}
function shouldTreatAsMultipartSubItem(line, parentStem) {
  const candidate = stripLetteredPrefix(line);
  if (!candidate) {
    return false;
  }
  if (parentLooksLikeMCStem(parentStem)) {
    return false;
  }
  const wordCount = candidate.split(/\s+/).filter(Boolean).length;
  if (SUBITEM_VERB_REGEX.test(candidate)) {
    return true;
  }
  if (wordCount > 8) {
    return true;
  }
  return false;
}

// src/prism-v4/segmentation/detectMultiPart.ts
function detectMultiPart(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parentStem = getParentStem(text);
  const subItemCount = lines.filter((line) => isLetteredLine(line)).filter((line) => shouldTreatAsMultipartSubItem(line, parentStem)).length;
  return subItemCount > 0;
}

// src/prism-v4/segmentation/optionParsing.ts
var OPTION_TOKEN_RE = /(^|\s)\(?([A-Ea-e])\)?[\.)]\s*/g;
function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}
function optionDedupeKey(option) {
  return `${option.label}::${normalizeText(option.text).toLowerCase()}`;
}
function extractOptionsFromLine(line) {
  const normalizedLine = normalizeText(line);
  if (!normalizedLine) {
    return [];
  }
  const matches = [];
  for (const match of normalizedLine.matchAll(OPTION_TOKEN_RE)) {
    const raw = match[0] ?? "";
    const label = match[2]?.toUpperCase();
    const index = match.index ?? -1;
    if (!label || index < 0) {
      continue;
    }
    const contentStart = index + raw.length;
    matches.push({ label, index, contentStart });
  }
  if (matches.length === 0) {
    return [];
  }
  const options = [];
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    if (!current) {
      continue;
    }
    const next = matches[i + 1];
    const end = next ? next.index : normalizedLine.length;
    const text = normalizeText(normalizedLine.slice(current.contentStart, end));
    if (!text) {
      continue;
    }
    options.push({ label: current.label, text });
  }
  return options;
}
function extractOptionsFromText(text) {
  return text.split(/\r?\n/).flatMap((line) => extractOptionsFromLine(line));
}

// src/prism-v4/segmentation/detectMultipleChoice.ts
function detectMultipleChoice(text) {
  const labels = /* @__PURE__ */ new Set();
  for (const parsed of extractOptionsFromText(text)) {
    labels.add(parsed.label);
  }
  return labels.size >= 3;
}

// src/prism-v4/segmentation/extractSubItems.ts
function extractSubItems(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parentStem = getParentStem(text);
  return lines.filter((line) => isLetteredLine(line)).filter((line) => shouldTreatAsMultipartSubItem(line, parentStem)).map((line, index) => ({
    itemNumber: index + 1,
    text: stripLetteredPrefix(line)
  }));
}

// src/prism-v4/segmentation/extractDistractors.ts
function extractDistractors(text) {
  const seen = /* @__PURE__ */ new Set();
  const options = [];
  for (const parsed of extractOptionsFromText(text)) {
    const key = optionDedupeKey(parsed);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    options.push({ label: parsed.label, text: parsed.text });
  }
  return options;
}

// src/prism-v4/segmentation/writingModeDetector.ts
function detectWritingMode(text) {
  if (/explain|describe|why/i.test(text))
    return "Explain";
  if (/calculate|compute|find/i.test(text))
    return "Calculate";
  return "Describe";
}

// src/prism-v4/segmentation/reasoningStepsEstimator.ts
function estimateReasoningSteps(text) {
  return (text.match(/because|therefore|so that|thus/gi) || []).length;
}

// src/prism-v4/segmentation/buildItemTree.ts
function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
function countSyllables(word) {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned)
    return 1;
  const withoutTrailingE = cleaned.endsWith("e") ? cleaned.slice(0, -1) : cleaned;
  const matches = withoutTrailingE.match(/[aeiouy]+/g);
  return Math.max(1, matches ? matches.length : 1);
}
var BLOOMS_KEYWORDS = {
  create: ["create", "design", "construct", "develop", "formulate", "compose", "invent", "generate", "produce", "plan", "build", "propose"],
  evaluate: ["evaluate", "justify", "critique", "argue", "assess", "defend", "support", "judge", "recommend", "prioritize", "verify", "validate", "debate"],
  analyze: ["analyze", "differentiate", "categorize", "examine", "investigate", "organize", "structure", "attribute", "diagram", "map", "inspect", "compare", "contrast"],
  apply: ["apply", "use", "solve", "compute", "calculate", "demonstrate", "perform", "execute", "implement", "operate", "model", "show", "carry out", "find"],
  understand: ["explain", "summarize", "describe", "interpret", "classify", "paraphrase", "outline", "discuss", "report", "restate", "illustrate", "state", "name"],
  remember: ["identify", "list", "define", "recall", "label", "match", "select", "recognize", "repeat", "choose", "underline", "point", "circle", "highlight"]
};
function computeBloomsLevel(text) {
  const lower = text.toLowerCase();
  const hit = (keywords) => keywords.some((keyword) => lower.includes(keyword));
  if (hit(BLOOMS_KEYWORDS.create))
    return { level: 6, label: "Create" };
  if (hit(BLOOMS_KEYWORDS.evaluate))
    return { level: 5, label: "Evaluate" };
  if (hit(BLOOMS_KEYWORDS.analyze))
    return { level: 4, label: "Analyze" };
  if (hit(BLOOMS_KEYWORDS.apply))
    return { level: 3, label: "Apply" };
  if (hit(BLOOMS_KEYWORDS.understand))
    return { level: 2, label: "Understand" };
  if (hit(BLOOMS_KEYWORDS.remember))
    return { level: 1, label: "Remember" };
  return { level: 2, label: "Understand" };
}
function computeSubItemMetrics(parent, text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const wordCount = Math.max(words.length, 1);
  const levels = words.map((word) => {
    const syllables = countSyllables(word);
    if (syllables <= 1)
      return 1;
    if (syllables === 2)
      return 2;
    return 3;
  });
  const vocabCounts = {
    level1: levels.filter((level) => level === 1).length,
    level2: levels.filter((level) => level === 2).length,
    level3: levels.filter((level) => level === 3).length
  };
  const avgVocabLevel = levels.length > 0 ? levels.reduce((sum, level) => sum + level, 0) / levels.length : 1;
  const avgWordLength = words.length > 0 ? words.reduce((sum, word) => sum + word.length, 0) / words.length : 4;
  const normalizedVocab = (avgVocabLevel - 1) / 2;
  const normalizedWordLen = Math.min(avgWordLength / 10, 1);
  const linguisticLoad = clamp01(0.6 * normalizedVocab + 0.4 * normalizedWordLen);
  const reasoningSteps = Math.max(estimateReasoningSteps(text), 0);
  const steps = Math.max(reasoningSteps, 1);
  const timeToProcessSeconds = Math.max(5, Math.round(wordCount / 3.3 + steps * 8));
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const sentenceCount = Math.max(sentences.length, 1);
  const avgSentenceLength = Math.round(wordCount / sentenceCount * 10) / 10;
  const symbolCount = (text.match(/[+\-*/=<>()[\]{}\^%÷×∑∫√≤≥≠±]/g) ?? []).length;
  const symbolDensity = Math.min(symbolCount / Math.max(text.length, 1), 1);
  const misconceptionRisk = clamp01((parent.misconceptionRisk ?? 0) * (0.6 + 0.4 * linguisticLoad));
  const distractorDensity = detectMultipleChoice(text) ? parent.distractorDensity : 0;
  const stepsNorm = Math.min(steps / 5, 1);
  const timeNorm = Math.min(timeToProcessSeconds / 30, 1);
  const confusionScore = clamp01(0.4 * linguisticLoad + 0.2 * distractorDensity + 0.15 * stepsNorm + 0.15 * misconceptionRisk + 0.1 * timeNorm);
  const writingMode = detectWritingMode(text) || parent.writingMode;
  const { level: bloomsLevel, label: bloomsLabel } = computeBloomsLevel(text);
  return {
    wordCount,
    steps,
    timeToProcessSeconds,
    avgVocabLevel,
    avgWordLength,
    vocabCounts,
    linguisticLoad,
    misconceptionRisk,
    distractorDensity,
    confusionScore,
    sentenceCount,
    avgSentenceLength,
    symbolDensity,
    bloomsLevel,
    bloomsLabel,
    writingMode,
    reasoningSteps,
    expectedResponseLength: 0
  };
}
function buildSubItem(parent, itemNumber, text) {
  const subMetrics = computeSubItemMetrics(parent, text);
  return {
    ...parent,
    ...subMetrics,
    itemNumber,
    text,
    isMultiPartItem: false,
    isMultipleChoice: false,
    subQuestionCount: 0,
    distractorCount: 0,
    branchingFactor: 0
  };
}
function buildItemTree(item) {
  const text = item.text;
  const writingMode = detectWritingMode(text);
  const reasoningSteps = estimateReasoningSteps(text);
  if (detectMultiPart(text)) {
    const subItemsRaw = extractSubItems(text);
    const subItems = subItemsRaw.map((sub) => buildSubItem(item, sub.itemNumber, sub.text));
    return {
      item: {
        ...item,
        isMultiPartItem: true,
        isMultipleChoice: false,
        subQuestionCount: subItems.length,
        distractorCount: 0,
        branchingFactor: subItems.length,
        writingMode,
        reasoningSteps
      },
      subItems
    };
  }
  if (detectMultipleChoice(text)) {
    const distractors = extractDistractors(text);
    return {
      item: {
        ...item,
        isMultiPartItem: false,
        isMultipleChoice: true,
        subQuestionCount: 0,
        distractorCount: distractors.length,
        branchingFactor: 0,
        writingMode,
        reasoningSteps
      },
      distractors
    };
  }
  return {
    item: {
      ...item,
      isMultiPartItem: false,
      isMultipleChoice: false,
      subQuestionCount: 0,
      distractorCount: 0,
      branchingFactor: 0,
      writingMode,
      reasoningSteps
    }
  };
}

// src/prism-v4/segmentation/sectioning.ts
var HEADER_PATTERNS = [
  /name[:]?/i,
  /class[:]?/i,
  /date[:]?/i,
  /teacher[:]?/i,
  /period[:]?/i,
  /honor pledge/i,
  /pledge/i,
  /test/i,
  /exam/i,
  /chapter/i,
  /unit/i,
  /section/i,
  /part [A-Z]/i,
  /multiple choice/i,
  /short answer/i,
  /free response/i,
  /true\/false/i,
  /directions[:]?/i
];
var INSTRUCTION_VERBS = /\b(show|explain|justify|round|use|complete|answer|write|label|calculate|solve|graph)\b/i;
var QUESTION_SIGNALS = /\?|\b(explain|describe|discuss|compare|calculate|solve|find|determine|evaluate|justify|show)\b/i;
function firstLine(text) {
  return text.split(/\r?\n/)[0]?.trim() ?? "";
}
function isLowSemanticHeader(text) {
  const wc = text.split(/\s+/).filter(Boolean).length;
  return wc < 10 && !QUESTION_SIGNALS.test(text) && !/\d/.test(text);
}
function detectBlockType(text, hasSeenItem) {
  const normalized = text.trim();
  const headerMatch = HEADER_PATTERNS.some((re) => re.test(normalized));
  const looksLikeItem = QUESTION_SIGNALS.test(normalized) || /^\d+[.)]/.test(normalized) || /\b[a-h]\)/i.test(normalized) || /\b[A-D][.)]\s+/.test(normalized);
  if (looksLikeItem)
    return "item";
  if (!hasSeenItem && !looksLikeItem)
    return "header";
  if (hasSeenItem && headerMatch && /\b(part\s+[A-Z]|section|directions?)\b/i.test(normalized)) {
    return "header";
  }
  if (!looksLikeItem && INSTRUCTION_VERBS.test(normalized))
    return "instruction";
  if (hasSeenItem && isLowSemanticHeader(normalized))
    return "item";
  return "item";
}
function buildSections(blocks) {
  const sections = [];
  const itemBlocks = [];
  const itemToSectionId = /* @__PURE__ */ new Map();
  let currentSection = null;
  let sectionCounter = 0;
  let hasSeenItem = false;
  const ensureSection = (header) => {
    if (!currentSection) {
      sectionCounter += 1;
      currentSection = {
        id: `section-${sectionCounter}`,
        header: header?.trim() || `Section ${sectionCounter}`,
        instructions: [],
        itemNumbers: []
      };
      sections.push(currentSection);
    }
    return currentSection;
  };
  for (const block of blocks) {
    const text = block.text?.trim() ?? "";
    if (!text)
      continue;
    const kind = detectBlockType(text, hasSeenItem);
    if (kind === "header") {
      sectionCounter += 1;
      currentSection = {
        id: `section-${sectionCounter}`,
        header: firstLine(text) || `Section ${sectionCounter}`,
        instructions: [],
        itemNumbers: []
      };
      sections.push(currentSection);
      continue;
    }
    const section = ensureSection();
    if (kind === "instruction") {
      section.instructions.push(text);
      continue;
    }
    hasSeenItem = true;
    itemBlocks.push(block);
    section.itemNumbers.push(block.itemNumber);
    itemToSectionId.set(block.itemNumber, section.id);
  }
  return { sections, itemBlocks, itemToSectionId };
}
function applySectionInstructionEffects(item, instructions) {
  if (!instructions || instructions.length === 0)
    return item;
  let next = { ...item };
  for (const instruction of instructions) {
    const text = instruction.toLowerCase();
    if (/show|explain|justify/.test(text)) {
      next.writingMode = "Explain";
      next.expectedResponseLength = (next.expectedResponseLength ?? 0) + 1;
      next.reasoningSteps = (next.reasoningSteps ?? 0) + 1;
      next.timeToProcessSeconds = Math.round(next.timeToProcessSeconds * 1.2);
    }
    if (/round|calculate|solve/.test(text)) {
      next.writingMode = "Calculate";
      next.reasoningSteps = (next.reasoningSteps ?? 0) + 1;
    }
    if (/choose|best answer|select/.test(text)) {
      next.writingMode = "Select";
      next.expectedResponseLength = 0;
      next.reasoningSteps = 0;
    }
    if (/no calculators?/.test(text)) {
      next.timeToProcessSeconds = Math.round(next.timeToProcessSeconds * 1.15);
    }
  }
  return next;
}

// api/v4/simulator/shared.ts
init_supabase();

// src/prism-v4/teacherFeedback/store.ts
init_supabase();

// src/prism-v4/semantic/cognitive/templates/loadTemplates.ts
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

// src/prism-v4/semantic/cognitive/templates/loadTeacherTemplates.ts
var SYSTEM_TEMPLATE_IDS = new Set(loadSeededTemplates().map((template) => template.id));
var BLOOM_KEYS = /* @__PURE__ */ new Set(["remember", "understand", "apply", "analyze", "evaluate", "create"]);
var STEP_TYPES = /* @__PURE__ */ new Set(["procedural", "conceptual", "interpretive", "mixed", "definition", "code-interpretation"]);
var STRUCTURAL_PATTERNS = /* @__PURE__ */ new Set([
  "hasEquation",
  "hasGraph",
  "hasTable",
  "hasDiagram",
  "hasMap",
  "hasTimeline",
  "hasExperiment",
  "hasSourceExcerpt",
  "hasPassage",
  "hasCodeLikeContent",
  "multiRepresentation",
  "constructedResponse",
  "multipart"
]);
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function clampRange(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function normalizeBloom(bloom) {
  if (!bloom) {
    return void 0;
  }
  const normalized = {};
  for (const [key, value] of Object.entries(bloom)) {
    if (!BLOOM_KEYS.has(key) || !isFiniteNumber(value) || value < 0 || value > 1) {
      return void 0;
    }
    normalized[key] = value;
  }
  return normalized;
}
function normalizePatternConfig(record) {
  const config = record.patternConfig;
  if (!config) {
    const evidenceText = record.evidenceText.trim().toLowerCase();
    if (!evidenceText) {
      return void 0;
    }
    return {
      textPatterns: [evidenceText],
      structuralPatterns: [],
      regexPatterns: [],
      minConfidence: 0.85
    };
  }
  const textPatterns = Array.isArray(config.textPatterns) ? config.textPatterns.filter((value) => typeof value === "string" && value.trim().length > 0).map((value) => value.toLowerCase()) : [];
  const structuralPatterns = Array.isArray(config.structuralPatterns) ? config.structuralPatterns.filter((value) => typeof value === "string" && STRUCTURAL_PATTERNS.has(value)) : [];
  const regexPatterns = Array.isArray(config.regexPatterns) ? config.regexPatterns.filter((value) => typeof value === "string" && value.trim().length > 0) : [];
  const minConfidence = isFiniteNumber(config.minConfidence) ? clampRange(config.minConfidence, 0, 1) : NaN;
  if (!Number.isFinite(minConfidence)) {
    return void 0;
  }
  if (Array.isArray(config.structuralPatterns) && structuralPatterns.length !== config.structuralPatterns.length) {
    return void 0;
  }
  return {
    textPatterns,
    structuralPatterns,
    regexPatterns,
    minConfidence
  };
}
function normalizeStepHints(stepHints) {
  if (!stepHints) {
    return void 0;
  }
  if (!isFiniteNumber(stepHints.expectedSteps)) {
    return void 0;
  }
  if (typeof stepHints.stepType !== "string" || !STEP_TYPES.has(stepHints.stepType)) {
    return void 0;
  }
  return {
    expectedSteps: clampRange(Math.round(stepHints.expectedSteps), 1, 6),
    stepType: stepHints.stepType
  };
}
function toRuntimeTemplate2(record) {
  if (!record.id || typeof record.id !== "string") {
    return null;
  }
  if (SYSTEM_TEMPLATE_IDS.has(record.id)) {
    return null;
  }
  const patternConfig = normalizePatternConfig(record);
  if (!patternConfig) {
    return null;
  }
  const bloom = normalizeBloom(record.bloom);
  if (record.bloom && !bloom) {
    return null;
  }
  const stepHints = normalizeStepHints(record.stepHints);
  if (record.stepHints && !stepHints) {
    return null;
  }
  if (record.patternConfig?.structuralPatterns && patternConfig.structuralPatterns.length !== record.patternConfig.structuralPatterns.length) {
    return null;
  }
  return {
    id: record.id,
    name: record.name ?? `Teacher Template ${record.id}`,
    archetypeKey: record.archetypeKey ?? "teacher-derived",
    description: record.evidenceText,
    patternConfig,
    stepHints,
    bloom: bloom ?? {},
    difficultyBoost: isFiniteNumber(record.difficultyBoost) ? clampRange(record.difficultyBoost, -1, 1) : void 0,
    multiStepBoost: isFiniteNumber(record.multiStepBoost) ? clampRange(record.multiStepBoost, 0, 1) : void 0,
    misconceptionRiskBoost: isFiniteNumber(record.misconceptionRiskBoost) ? clampRange(record.misconceptionRiskBoost, -1, 1) : void 0
  };
}
function loadTeacherTemplates(records) {
  const templates = [];
  const rejected = [];
  const seenIds = /* @__PURE__ */ new Set();
  for (const record of records) {
    if (seenIds.has(record.id)) {
      rejected.push({ id: record.id, reason: "duplicate teacher template id" });
      continue;
    }
    seenIds.add(record.id);
    const template = toRuntimeTemplate2(record);
    if (!template) {
      rejected.push({ id: record.id, reason: "invalid teacher template" });
      continue;
    }
    templates.push(template);
  }
  return { templates, rejected };
}

// src/prism-v4/semantic/learning/learningService.ts
init_supabase();
var teacherActionMemory = [];
var learningRecordMemory = /* @__PURE__ */ new Map();
var learningDirty = false;
var MIN_LEARNING_EVIDENCE = 2;
var FREEZE_EVIDENCE_THRESHOLD = 3;
var DRIFT_FREEZE_THRESHOLD = 0.4;
var ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1e3;
function canUseSupabase() {
  return typeof window === "undefined" && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function toIsoString(value) {
  return new Date(value).toISOString();
}
async function readJsonIfAvailable(response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = (await response.text()).trim();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function normalizeTemplateLearningRecord(record) {
  return {
    template_id: record.templateId,
    strong_matches: record.strongMatches,
    weak_matches: record.weakMatches,
    teacher_overrides: record.teacherOverrides,
    expected_steps_corrections: record.expectedStepsCorrections,
    drift_score: record.driftScore,
    last_updated: toIsoString(record.lastUpdated)
  };
}
function hydrateTeacherActionEvent(row) {
  const context = row.context ?? { subject: "unknown" };
  const fallbackTeacherId = typeof row.teacher_id === "string" ? row.teacher_id : "unknown-teacher";
  return {
    eventId: typeof row.id === "string" ? row.id : `event-${Date.now()}`,
    teacherId: typeof context.originalTeacherId === "string" ? context.originalTeacherId : fallbackTeacherId,
    problemId: String(row.problem_id ?? "unknown-problem"),
    timestamp: Date.parse(String(row.created_at ?? new Date().toISOString())),
    actionType: row.action_type,
    oldValue: row.old_value,
    newValue: row.new_value,
    context
  };
}
function hydrateTemplateLearningRecord(row) {
  return {
    templateId: String(row.template_id),
    strongMatches: Number(row.strong_matches ?? 0),
    weakMatches: Number(row.weak_matches ?? 0),
    teacherOverrides: Number(row.teacher_overrides ?? 0),
    expectedStepsCorrections: Number(row.expected_steps_corrections ?? 0),
    driftScore: Number(row.drift_score ?? 0),
    lastUpdated: Date.parse(String(row.last_updated ?? new Date().toISOString()))
  };
}
function clamp012(value) {
  return Math.min(1, Math.max(0, value));
}
function clampExpectedSteps(value) {
  return Math.min(6, Math.max(1, Math.round(value)));
}
function isStepType(value) {
  return typeof value === "string" && ["procedural", "conceptual", "interpretive", "mixed", "definition", "code-interpretation"].includes(value);
}
function toExpectedSteps(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampExpectedSteps(1 + clamp012(value) * 5);
  }
  if (value && typeof value === "object") {
    const candidate = value;
    if (typeof candidate.expectedSteps === "number" && Number.isFinite(candidate.expectedSteps)) {
      return clampExpectedSteps(candidate.expectedSteps);
    }
  }
  return void 0;
}
function toStepType(value) {
  if (value && typeof value === "object") {
    const candidate = value;
    if (isStepType(candidate.stepType)) {
      return candidate.stepType;
    }
  }
  return void 0;
}
function confidenceDeltaFor(record) {
  if ((record.evidenceCount ?? 0) < MIN_LEARNING_EVIDENCE) {
    return 0;
  }
  const support = record.strongMatches * 0.03 + record.weakMatches * 0.015 + record.expectedStepsCorrections * 0.02;
  const correctionPressure = record.teacherOverrides * 0.06 + record.driftScore * 0.08;
  return Math.min(0.08, Math.max(-0.25, support - correctionPressure));
}
function emptyRecord(templateId) {
  return {
    templateId,
    strongMatches: 0,
    weakMatches: 0,
    teacherOverrides: 0,
    expectedStepsCorrections: 0,
    driftScore: 0,
    lastUpdated: Date.now()
  };
}
function affectedTemplateIds(context) {
  return [...new Set([...context.templateIds ?? [], ...context.teacherTemplateIds ?? []].filter(Boolean))];
}
async function loadTeacherActionEvents(since) {
  const sinceTimestamp = since instanceof Date ? since.getTime() : typeof since === "string" ? Date.parse(since) : typeof since === "number" ? since : void 0;
  if (canUseSupabase()) {
    const rows = await supabaseRest("teacher_action_events", {
      select: "id,teacher_id,problem_id,action_type,old_value,new_value,context,created_at",
      filters: {
        ...typeof sinceTimestamp === "number" && Number.isFinite(sinceTimestamp) ? { created_at: `gte.${toIsoString(sinceTimestamp)}` } : {},
        order: "created_at.asc"
      }
    });
    return (rows ?? []).map(hydrateTeacherActionEvent);
  }
  return teacherActionMemory.filter((event) => typeof sinceTimestamp === "number" ? event.timestamp >= sinceTimestamp : true);
}
async function saveTemplateLearningRecord(record) {
  learningRecordMemory.set(record.templateId, record);
  if (canUseSupabase()) {
    await supabaseRest("template_learning_records", {
      method: "POST",
      body: normalizeTemplateLearningRecord(record),
      prefer: "resolution=merge-duplicates,return=minimal"
    });
  }
}
async function loadTemplateLearningRecords() {
  if (typeof window !== "undefined") {
    const response = await fetch("/api/v4/teacher-feedback/learning");
    if (!response.ok) {
      return [];
    }
    const payload = await readJsonIfAvailable(response);
    return payload?.records ?? [];
  }
  if (canUseSupabase()) {
    const rows = await supabaseRest("template_learning_records", {
      select: "template_id,strong_matches,weak_matches,teacher_overrides,expected_steps_corrections,drift_score,last_updated",
      filters: { order: "last_updated.desc" }
    });
    return (rows ?? []).map(hydrateTemplateLearningRecord);
  }
  return [...learningRecordMemory.values()];
}
async function aggregateTemplateLearning(since = Date.now() - ONE_WEEK_MS) {
  const stepSignals = /* @__PURE__ */ new Map();
  const stepTypes = /* @__PURE__ */ new Map();
  const nextRecords = /* @__PURE__ */ new Map();
  const teacherActions = await loadTeacherActionEvents(since);
  for (const event of teacherActions) {
    const strongIds = new Set(event.context.teacherTemplateIds ?? []);
    const weakIds = new Set(event.context.templateIds ?? []);
    for (const templateId of affectedTemplateIds(event.context)) {
      const current = nextRecords.get(templateId) ?? emptyRecord(templateId);
      if (strongIds.has(templateId)) {
        current.strongMatches += 1;
      }
      if (weakIds.has(templateId)) {
        current.weakMatches += 1;
      }
      switch (event.actionType) {
        case "expected_steps_correction":
          current.expectedStepsCorrections += 1;
          break;
        case "template_override":
        case "difficulty_correction":
        case "representation_correction":
        case "multipart_restructure":
          current.teacherOverrides += 1;
          break;
      }
      const learnedSteps = toExpectedSteps(event.newValue);
      if (event.actionType === "expected_steps_correction" && typeof learnedSteps === "number") {
        const values = stepSignals.get(templateId) ?? [];
        values.push(learnedSteps);
        stepSignals.set(templateId, values);
      }
      const learnedStepType = toStepType(event.newValue);
      if (event.actionType === "expected_steps_correction" && learnedStepType) {
        const values = stepTypes.get(templateId) ?? [];
        values.push(learnedStepType);
        stepTypes.set(templateId, values);
      }
      current.lastUpdated = Math.max(current.lastUpdated, event.timestamp);
      nextRecords.set(templateId, current);
    }
  }
  for (const record of nextRecords.values()) {
    record.evidenceCount = record.strongMatches + record.weakMatches + record.teacherOverrides + record.expectedStepsCorrections;
    record.driftScore = clamp012((record.teacherOverrides + record.expectedStepsCorrections * 0.35) / Math.max(1, record.strongMatches + record.weakMatches));
    record.confidenceDelta = confidenceDeltaFor(record);
    if ((record.evidenceCount ?? 0) >= FREEZE_EVIDENCE_THRESHOLD && record.driftScore >= DRIFT_FREEZE_THRESHOLD) {
      record.frozen = true;
    }
    const learnedSteps = stepSignals.get(record.templateId);
    if (learnedSteps && learnedSteps.length >= MIN_LEARNING_EVIDENCE) {
      record.learnedExpectedSteps = clampExpectedSteps(learnedSteps.reduce((sum, value) => sum + value, 0) / learnedSteps.length);
    }
    const learnedTypes = stepTypes.get(record.templateId);
    if (learnedTypes && learnedTypes.length >= MIN_LEARNING_EVIDENCE) {
      record.learnedStepType = learnedTypes[learnedTypes.length - 1];
    }
  }
  learningRecordMemory.clear();
  for (const record of nextRecords.values()) {
    await saveTemplateLearningRecord(record);
  }
  learningDirty = false;
  return [...learningRecordMemory.values()];
}
async function loadTemplateLearning() {
  if (typeof window !== "undefined") {
    return loadTemplateLearningRecords();
  }
  if (learningDirty) {
    return aggregateTemplateLearning();
  }
  const records = await loadTemplateLearningRecords();
  if (records.length > 0 || canUseSupabase()) {
    return records;
  }
  return [...learningRecordMemory.values()];
}
function applyLearningAdjustments(templates, learningRecords) {
  if (learningRecords.length === 0) {
    return templates;
  }
  const learningMap = new Map(learningRecords.map((record) => [record.templateId, record]));
  return templates.flatMap((template) => {
    const learning = learningMap.get(template.id);
    if (!learning) {
      return [template];
    }
    const hasLearnedSteps = typeof learning.learnedExpectedSteps === "number";
    const isFrozen = Boolean(learning.frozen);
    const adjusted = {
      ...template,
      learningAdjustment: {
        confidenceDelta: isFrozen ? void 0 : learning.confidenceDelta,
        frozen: isFrozen,
        learnedExpectedSteps: learning.learnedExpectedSteps,
        learnedStepType: isStepType(learning.learnedStepType) ? learning.learnedStepType : void 0,
        originalExpectedSteps: template.stepHints?.expectedSteps,
        driftScore: learning.driftScore,
        evidenceCount: learning.evidenceCount,
        status: isFrozen ? "frozen" : (learning.evidenceCount ?? 0) > 0 || hasLearnedSteps || typeof learning.confidenceDelta === "number" ? "learning" : "stable"
      }
    };
    if (!isFrozen && typeof learning.learnedExpectedSteps === "number") {
      adjusted.stepHints = {
        expectedSteps: learning.learnedExpectedSteps,
        stepType: isStepType(learning.learnedStepType) ? learning.learnedStepType : template.stepHints?.stepType ?? "mixed"
      };
    }
    return [adjusted];
  });
}

// src/prism-v4/teacherFeedback/store.ts
var overrideMemory = /* @__PURE__ */ new Map();
var templateMemory = /* @__PURE__ */ new Map();
function canUseSupabase2() {
  return typeof window === "undefined" && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}
async function readJsonIfAvailable2(response) {
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
async function getProblemOverride(canonicalProblemId) {
  if (typeof window !== "undefined") {
    const response = await fetch(`/api/v4/problem-overrides/${encodeURIComponent(canonicalProblemId)}`);
    if (!response.ok) {
      return null;
    }
    const payload = await readJsonIfAvailable2(response);
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
async function getTeacherDerivedTemplateRecords(subject, domain) {
  const mergeAndFilter = (fromDb) => {
    const mergedById = /* @__PURE__ */ new Map();
    for (const record of fromDb) {
      mergedById.set(record.id, record);
    }
    for (const record of templateMemory.values()) {
      const existing = mergedById.get(record.id);
      if (!existing) {
        mergedById.set(record.id, record);
        continue;
      }
      mergedById.set(record.id, {
        ...existing,
        ...record,
        bloom: { ...existing.bloom ?? {}, ...record.bloom ?? {} },
        difficultyBoost: record.difficultyBoost ?? existing.difficultyBoost,
        multiStepBoost: record.multiStepBoost ?? existing.multiStepBoost,
        misconceptionRiskBoost: record.misconceptionRiskBoost ?? existing.misconceptionRiskBoost
      });
    }
    return [...mergedById.values()].filter((record) => (!subject || !record.subject || record.subject === subject) && (!domain || !record.domain || record.domain === domain));
  };
  if (canUseSupabase2()) {
    try {
      const rows = await supabaseRest("cognitive_templates", {
        select: "id,teacher_id,source_feedback_id,evidence_text,subject,domain,bloom,difficulty_boost,misconception_risk_boost,multi_step_boost,created_at"
      });
      const records = (rows ?? []).map((row) => ({
        id: String(row.id),
        teacherId: String(row.teacher_id),
        sourceFeedbackId: String(row.source_feedback_id),
        evidenceText: String(row.evidence_text),
        subject: typeof row.subject === "string" ? row.subject : void 0,
        domain: typeof row.domain === "string" ? row.domain : void 0,
        bloom: row.bloom,
        difficultyBoost: typeof row.difficulty_boost === "number" ? row.difficulty_boost : void 0,
        misconceptionRiskBoost: typeof row.misconception_risk_boost === "number" ? row.misconception_risk_boost : void 0,
        multiStepBoost: typeof row.multi_step_boost === "number" ? row.multi_step_boost : void 0,
        createdAt: String(row.created_at)
      }));
      return mergeAndFilter(records);
    } catch (error) {
      const rows = await supabaseRest("cognitive_templates", {
        select: "id,teacher_id,source_feedback_id,evidence_text,subject,domain,bloom,difficulty_boost,misconception_risk_boost,created_at"
      });
      const records = (rows ?? []).map((row) => ({
        id: String(row.id),
        teacherId: String(row.teacher_id),
        sourceFeedbackId: String(row.source_feedback_id),
        evidenceText: String(row.evidence_text),
        subject: typeof row.subject === "string" ? row.subject : void 0,
        domain: typeof row.domain === "string" ? row.domain : void 0,
        bloom: row.bloom,
        difficultyBoost: typeof row.difficulty_boost === "number" ? row.difficulty_boost : void 0,
        misconceptionRiskBoost: typeof row.misconception_risk_boost === "number" ? row.misconception_risk_boost : void 0,
        createdAt: String(row.created_at)
      }));
      return mergeAndFilter(records);
    }
  }
  return mergeAndFilter([]);
}
async function listTeacherDerivedTemplates(subject, domain) {
  if (typeof window !== "undefined") {
    const query = new URLSearchParams();
    if (subject) {
      query.set("subject", subject);
    }
    if (domain) {
      query.set("domain", domain);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(`/api/v4/teacher-feedback/templates${suffix}`);
    if (!response.ok) {
      return [];
    }
    const payload = await readJsonIfAvailable2(response);
    if (!payload) {
      return [];
    }
    return loadTeacherTemplates(payload.templates ?? []).templates;
  }
  const records = await getTeacherDerivedTemplateRecords(subject, domain);
  return loadTeacherTemplates(records).templates;
}

// src/prism-v4/semantic/document/buildConceptGraph.ts
function buildConceptGraph(problemVectors, problems = []) {
  const conceptCounts = {};
  const conceptScores = {};
  const multipartCounts = {};
  const cooccurrence = {};
  const problemGroupSizes = /* @__PURE__ */ new Map();
  for (const problem of problems) {
    const groupId = problem.problemGroupId ?? problem.problemId;
    problemGroupSizes.set(groupId, (problemGroupSizes.get(groupId) ?? 0) + 1);
  }
  for (const [index, v] of problemVectors.entries()) {
    const problem = problems[index];
    const isMultipart = Boolean(problem && (problemGroupSizes.get(problem.problemGroupId ?? problem.problemId) ?? 0) > 1);
    const concepts = Object.keys(v.concepts ?? {});
    for (const c of concepts) {
      conceptCounts[c] = (conceptCounts[c] ?? 0) + 1;
      conceptScores[c] = (conceptScores[c] ?? 0) + (v.concepts[c] ?? 0);
      if (isMultipart) {
        multipartCounts[c] = (multipartCounts[c] ?? 0) + 1;
      }
    }
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const a = concepts[i];
        const b = concepts[j];
        cooccurrence[a] = cooccurrence[a] || {};
        cooccurrence[b] = cooccurrence[b] || {};
        cooccurrence[a][b] = (cooccurrence[a][b] ?? 0) + 1;
        cooccurrence[b][a] = (cooccurrence[b][a] ?? 0) + 1;
      }
    }
  }
  const nodes = Object.entries(conceptCounts).map(([id, weight]) => ({
    id,
    label: id,
    weight: Number((weight + (conceptScores[id] ?? 0) * 0.75 + (multipartCounts[id] ?? 0) / Math.max(weight, 1) * 0.5).toFixed(4))
  }));
  const edges = [];
  for (const [from, targets] of Object.entries(cooccurrence)) {
    for (const [to, weight] of Object.entries(targets)) {
      if (from < to) {
        const fromScore = conceptScores[from] ?? 0;
        const toScore = conceptScores[to] ?? 0;
        const fromMultipart = (multipartCounts[from] ?? 0) / Math.max(conceptCounts[from] ?? 1, 1);
        const toMultipart = (multipartCounts[to] ?? 0) / Math.max(conceptCounts[to] ?? 1, 1);
        edges.push({
          from,
          to,
          weight: Number((weight + (fromScore + toScore) / 2 * 0.35 + (fromMultipart + toMultipart) / 2 * 0.3).toFixed(4))
        });
      }
    }
  }
  return { nodes, edges };
}

// src/prism-v4/semantic/utils/textUtils.ts
var STOP_WORDS = /* @__PURE__ */ new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "what",
  "which",
  "with"
]);
function normalizeWhitespace(text) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function splitSentences(text) {
  return normalizeWhitespace(text).split(/(?<=[.!?])\s+|\n+/).map((sentence) => sentence.trim()).filter(Boolean);
}
function extractKeywords(text) {
  const counts = /* @__PURE__ */ new Map();
  for (const token of normalizeWhitespace(text).toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length < 3 || STOP_WORDS.has(token)) {
      continue;
    }
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 20).map(([token]) => token);
}
function countSyllables2(word) {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) {
    return 1;
  }
  const withoutTrailingE = cleaned.endsWith("e") ? cleaned.slice(0, -1) : cleaned;
  const matches = withoutTrailingE.match(/[aeiouy]+/g);
  return Math.max(1, matches ? matches.length : 1);
}
function estimateReadingLevel(text) {
  const sentences = splitSentences(text);
  const words = normalizeWhitespace(text).split(/\s+/).filter(Boolean);
  if (sentences.length === 0 || words.length === 0) {
    return null;
  }
  const syllableCount = words.reduce((total, word) => total + countSyllables2(word), 0);
  const fleschKincaid = 0.39 * (words.length / sentences.length) + 11.8 * (syllableCount / words.length) - 15.59;
  return Number(Math.max(0, Math.min(18, fleschKincaid)).toFixed(2));
}
function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

// src/prism-v4/semantic/extract/classifyParagraphBlocks.ts
var DATE_OR_TIME_PATTERN = /\b(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}[:.]\d{2}\s*(?:am|pm)?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/gi;
var PAGE_PATTERN = /^\s*(?:page\s+)?\d+(?:\s+of\s+\d+)?\s*$/i;
var METADATA_PATTERN = /^(?:name|date|teacher|class|period|student)\b/i;
var STOPWORDS = /* @__PURE__ */ new Set(["the", "and", "for", "with", "that", "from", "this", "your", "into", "page"]);
function buildSignature(text) {
  return normalizeWhitespace(text.toLowerCase().replace(DATE_OR_TIME_PATTERN, " ").replace(/\d+/g, " ").replace(/[^a-z\s]+/g, " "));
}
function computeSemanticDensity(text) {
  const tokens = (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return 0;
  }
  const meaningfulTokens = tokens.filter((token) => token.length > 2 && !STOPWORDS.has(token));
  return meaningfulTokens.length / tokens.length;
}
function looksLikeHeading(text, role) {
  if (role === "title" || role === "sectionHeading") {
    return true;
  }
  if (/[.!?]$/.test(text) || text.length > 90) {
    return false;
  }
  const words = text.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 10;
}
function classifyBlock(args) {
  const { text, role, semanticDensity, isRepeated, signature } = args;
  if (!text) {
    return { structuralRole: "noise", isSuppressed: true };
  }
  if (PAGE_PATTERN.test(text) || DATE_OR_TIME_PATTERN.test(text) || signature.length === 0) {
    return { structuralRole: "footer", isSuppressed: true };
  }
  if (METADATA_PATTERN.test(text)) {
    return { structuralRole: "noise", isSuppressed: true };
  }
  if (isRepeated && looksLikeHeading(text, role)) {
    return { structuralRole: "header", isSuppressed: true };
  }
  if (isRepeated && semanticDensity < 0.5) {
    return { structuralRole: "footer", isSuppressed: true };
  }
  if (semanticDensity < 0.26) {
    return { structuralRole: "noise", isSuppressed: true };
  }
  return { structuralRole: "content", isSuppressed: false };
}
function classifyParagraphBlocks(azureExtract) {
  const baseBlocks = (azureExtract.paragraphs ?? []).map((paragraph) => ({
    text: normalizeWhitespace(paragraph.text),
    pageNumber: paragraph.pageNumber,
    role: paragraph.role
  })).filter((paragraph) => paragraph.text.length > 0);
  const signaturePages = /* @__PURE__ */ new Map();
  for (const block of baseBlocks) {
    const signature = buildSignature(block.text);
    if (!signaturePages.has(signature)) {
      signaturePages.set(signature, /* @__PURE__ */ new Set());
    }
    signaturePages.get(signature).add(block.pageNumber);
  }
  return baseBlocks.map((block) => {
    const signature = buildSignature(block.text);
    const semanticDensity = computeSemanticDensity(block.text);
    const isRepeated = signature.length > 0 && (signaturePages.get(signature)?.size ?? 0) > 1;
    const classification = classifyBlock({
      text: block.text,
      role: block.role,
      semanticDensity,
      isRepeated,
      signature
    });
    return {
      ...block,
      signature,
      semanticDensity: Number(semanticDensity.toFixed(2)),
      structuralRole: classification.structuralRole,
      isSuppressed: classification.isSuppressed
    };
  });
}

// src/prism-v4/semantic/utils/heuristics.ts
function clamp013(value) {
  return Math.max(0, Math.min(1, value));
}
function average(values) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}
function pickDominantKey(scores, fallback) {
  let winner = fallback;
  let bestScore = -1;
  for (const [key, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      winner = key;
    }
  }
  return winner;
}
function scoreToDifficultyBand(score) {
  if (score < 0.2) {
    return "very_easy";
  }
  if (score < 0.4) {
    return "easy";
  }
  if (score < 0.65) {
    return "medium";
  }
  if (score < 0.85) {
    return "hard";
  }
  return "very_hard";
}

// src/prism-v4/semantic/utils/conceptUtils.ts
var DATE_OR_TIME_PATTERN2 = /\b(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}[:.]\d{2}\s*(?:am|pm)?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/gi;
var LEADING_TRAILING_PUNCTUATION = /^[^a-z0-9]+|[^a-z0-9]+$/gi;
var SCORE_WEIGHTS = {
  freqProblems: 0.55,
  freqPages: 0.35,
  semanticDensity: 0.6,
  multipartPresence: 0.45,
  crossDocumentRecurrence: 0.3
};
var NOISE_SCORE_THRESHOLD = 1.15;
function normalizeConceptLabel(value) {
  const trimmed = normalizeWhitespace(value).toLowerCase();
  if (!trimmed) {
    return "";
  }
  const preserveTaxonomyId = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/i.test(trimmed);
  if (preserveTaxonomyId) {
    return trimmed;
  }
  return normalizeWhitespace(trimmed.replace(DATE_OR_TIME_PATTERN2, " ").replace(/[“”"'`]+/g, " ").replace(/[^a-z0-9\s-]+/g, " ").replace(LEADING_TRAILING_PUNCTUATION, " ").replace(/\s+/g, " "));
}
function isLikelyNoiseConcept(value) {
  const normalized = normalizeConceptLabel(value);
  if (!normalized) {
    return true;
  }
  if (normalized.length < 3) {
    return true;
  }
  if (/^(?:name|date|teacher|class|period|page|review|unit|chapter)\b/.test(normalized)) {
    return true;
  }
  const alphaTokens = normalized.match(/[a-z]+/g) ?? [];
  return alphaTokens.length === 0;
}
function tokenizeConcept(value) {
  return normalizeConceptLabel(value).split(/\s+/).filter(Boolean);
}
function isTaxonomyConcept(value) {
  return /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/i.test(value.trim());
}
function levenshteinDistance(left, right) {
  if (left === right) {
    return 0;
  }
  if (!left.length) {
    return right.length;
  }
  if (!right.length) {
    return left.length;
  }
  const matrix = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));
  for (let row = 0; row <= left.length; row += 1) {
    matrix[row][0] = row;
  }
  for (let column = 0; column <= right.length; column += 1) {
    matrix[0][column] = column;
  }
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(matrix[row - 1][column] + 1, matrix[row][column - 1] + 1, matrix[row - 1][column - 1] + cost);
    }
  }
  return matrix[left.length][right.length];
}
function tokenOverlapRatio(left, right) {
  const leftTokens = new Set(tokenizeConcept(left));
  const rightTokens = new Set(tokenizeConcept(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap / Math.max(leftTokens.size, rightTokens.size);
}
function semanticDensityPenalty(value) {
  if (!isLikelyNoiseConcept(value)) {
    return 0;
  }
  if (/^(?:chapter|unit|page|review)\b/.test(normalizeConceptLabel(value))) {
    return 0.45;
  }
  return 0.25;
}
function shouldMergeConceptLabels(left, right) {
  const normalizedLeft = normalizeConceptLabel(left);
  const normalizedRight = normalizeConceptLabel(right);
  if (!normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight) {
    return normalizedLeft.length > 0 && normalizedLeft === normalizedRight;
  }
  if (isTaxonomyConcept(normalizedLeft) || isTaxonomyConcept(normalizedRight)) {
    return false;
  }
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    return tokenOverlapRatio(normalizedLeft, normalizedRight) >= 0.5;
  }
  const distance = levenshteinDistance(normalizedLeft, normalizedRight);
  const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);
  const normalizedDistance = maxLength > 0 ? distance / maxLength : 1;
  return tokenOverlapRatio(normalizedLeft, normalizedRight) >= 0.75 || normalizedDistance <= 0.18;
}
function chooseCanonicalConceptLabel(left, right) {
  const normalizedLeft = normalizeConceptLabel(left);
  const normalizedRight = normalizeConceptLabel(right);
  if (!normalizedLeft) {
    return normalizedRight;
  }
  if (!normalizedRight) {
    return normalizedLeft;
  }
  if (isTaxonomyConcept(normalizedLeft) || isTaxonomyConcept(normalizedRight)) {
    return normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight;
  }
  const leftTokens = tokenizeConcept(normalizedLeft).length;
  const rightTokens = tokenizeConcept(normalizedRight).length;
  if (leftTokens !== rightTokens) {
    return leftTokens < rightTokens ? normalizedLeft : normalizedRight;
  }
  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length < normalizedRight.length ? normalizedLeft : normalizedRight;
  }
  return normalizedLeft.localeCompare(normalizedRight) <= 0 ? normalizedLeft : normalizedRight;
}
function scoreConceptMetadata(input) {
  const freqDocuments = Math.max(1, input.freqDocuments ?? 1);
  const crossDocumentRecurrence = Math.max(0, input.crossDocumentRecurrence ?? freqDocuments);
  const score = SCORE_WEIGHTS.freqProblems * Math.log1p(Math.max(0, input.freqProblems)) + SCORE_WEIGHTS.freqPages * Math.log1p(Math.max(0, input.freqPages)) + SCORE_WEIGHTS.semanticDensity * Math.max(0, input.semanticDensity) + SCORE_WEIGHTS.multipartPresence * Math.max(0, input.multipartPresence) + SCORE_WEIGHTS.crossDocumentRecurrence * Math.log1p(Math.max(0, crossDocumentRecurrence)) - semanticDensityPenalty(input.label ?? "");
  const isNoise = Math.max(0, input.freqProblems) <= 1 && score < NOISE_SCORE_THRESHOLD;
  return {
    score: Number(score.toFixed(4)),
    isNoise,
    freqDocuments,
    crossDocumentRecurrence
  };
}

// src/prism-v4/semantic/document/buildDocumentInsights.ts
function buildDocumentInsights(args) {
  const { documentId, azureExtract, problems, problemVectors, conceptGraph } = args;
  const conceptTotals = {};
  const conceptStats = /* @__PURE__ */ new Map();
  const standardTotals = {};
  const misconceptionTotals = {};
  const problemGroupSizes = /* @__PURE__ */ new Map();
  let totalConceptWeight = 0;
  for (const problem of problems) {
    if (problem.problemGroupId) {
      problemGroupSizes.set(problem.problemGroupId, (problemGroupSizes.get(problem.problemGroupId) ?? 0) + 1);
    }
  }
  function mergeStats(target, source) {
    target.weightedTotal += source.weightedTotal;
    for (const alias of source.aliases) {
      target.aliases.add(alias);
    }
    for (const problemId of source.problemIds) {
      target.problemIds.add(problemId);
    }
    for (const pageNumber of source.pageNumbers) {
      target.pageNumbers.add(pageNumber);
    }
    for (const docId of source.documentIds) {
      target.documentIds.add(docId);
    }
    for (const multipartProblemId of source.multipartProblemIds) {
      target.multipartProblemIds.add(multipartProblemId);
    }
  }
  function getOrCreateConceptStats(concept) {
    const existing = conceptStats.get(concept);
    if (existing) {
      return existing;
    }
    const created = {
      concept,
      aliases: /* @__PURE__ */ new Set(),
      weightedTotal: 0,
      problemIds: /* @__PURE__ */ new Set(),
      pageNumbers: /* @__PURE__ */ new Set(),
      documentIds: /* @__PURE__ */ new Set(),
      multipartProblemIds: /* @__PURE__ */ new Set()
    };
    conceptStats.set(concept, created);
    return created;
  }
  function resolveConceptKey(rawConcept) {
    const normalized = rawConcept.toLowerCase();
    if (!normalized) {
      return null;
    }
    for (const existingKey of conceptStats.keys()) {
      if (!shouldMergeConceptLabels(existingKey, normalized)) {
        continue;
      }
      const canonical = chooseCanonicalConceptLabel(existingKey, normalized);
      if (canonical === existingKey) {
        return existingKey;
      }
      const existingStats = conceptStats.get(existingKey);
      const canonicalStats = getOrCreateConceptStats(canonical);
      if (existingStats && existingStats !== canonicalStats) {
        mergeStats(canonicalStats, existingStats);
        conceptStats.delete(existingKey);
      }
      return canonical;
    }
    return normalized;
  }
  function recordConcept(rawConcept, options) {
    const concept = resolveConceptKey(rawConcept);
    if (!concept) {
      return;
    }
    const stats = getOrCreateConceptStats(concept);
    stats.aliases.add(rawConcept);
    stats.weightedTotal += options.weight;
    stats.problemIds.add(options.problemId);
    stats.documentIds.add(documentId);
    if (options.isMultipart) {
      stats.multipartProblemIds.add(options.problemId);
    }
    for (const pageNumber of options.pageNumbers) {
      stats.pageNumbers.add(pageNumber);
    }
    totalConceptWeight += options.weight;
  }
  for (const [index, vector] of problemVectors.entries()) {
    const problem = problems[index];
    const pageNumbers = problem?.sourceSpan ? Array.from({ length: Math.max(1, problem.sourceSpan.lastPage - problem.sourceSpan.firstPage + 1) }, (_, offset) => problem.sourceSpan.firstPage + offset) : problem?.sourcePageNumber ? [problem.sourcePageNumber] : [];
    const isMultipart = Boolean(problem?.problemGroupId && (problemGroupSizes.get(problem.problemGroupId) ?? 0) > 1);
    for (const [concept, score] of Object.entries(vector.concepts)) {
      const key = resolveConceptKey(concept);
      if (!key) {
        continue;
      }
      conceptTotals[key] = (conceptTotals[key] ?? 0) + score;
      if (problem) {
        recordConcept(concept, {
          weight: score,
          problemId: problem.problemId,
          pageNumbers,
          isMultipart
        });
      }
    }
    for (const [standard, score] of Object.entries(vector.standards ?? {})) {
      standardTotals[standard] = (standardTotals[standard] ?? 0) + score;
    }
    for (const [trigger, score] of Object.entries(vector.misconceptionTriggers)) {
      misconceptionTotals[trigger] = (misconceptionTotals[trigger] ?? 0) + score;
    }
  }
  const sortedConcepts = [...Object.entries(conceptTotals)].sort((left, right) => right[1] - left[1]);
  const conceptDetails = [...conceptStats.values()].map((stats) => {
    const freqProblems = stats.problemIds.size;
    const freqPages = stats.pageNumbers.size;
    const freqDocuments = stats.documentIds.size;
    const semanticDensity = totalConceptWeight === 0 ? 0 : Number((stats.weightedTotal / totalConceptWeight).toFixed(4));
    const multipartPresence = freqProblems === 0 ? 0 : Number((stats.multipartProblemIds.size / freqProblems).toFixed(4));
    const scored = scoreConceptMetadata({
      freqProblems,
      freqPages,
      freqDocuments,
      semanticDensity,
      multipartPresence,
      crossDocumentRecurrence: freqDocuments,
      label: stats.concept
    });
    return {
      concept: stats.concept,
      aliases: [...stats.aliases].filter((alias) => alias !== stats.concept),
      freqProblems,
      freqPages,
      freqDocuments: scored.freqDocuments,
      semanticDensity,
      multipartPresence,
      crossDocumentRecurrence: scored.crossDocumentRecurrence,
      score: scored.score,
      isNoise: scored.isNoise || isLikelyNoiseConcept(stats.concept)
    };
  }).sort((left, right) => right.score - left.score || right.freqProblems - left.freqProblems || left.concept.localeCompare(right.concept));
  const dominantConcept = pickDominantKey(conceptTotals, "general.comprehension");
  const subject = dominantConcept.includes(".") ? dominantConcept.split(".")[0] : dominantConcept;
  const difficultyScore = average(problemVectors.map((vector) => vector.difficulty));
  const linguisticLoad = average(problemVectors.map((vector) => vector.linguisticLoad));
  const contentBlocks = classifyParagraphBlocks(azureExtract).filter((block) => !block.isSuppressed);
  const contentText = contentBlocks.map((block) => block.text).join("\n");
  const readingLevel = estimateReadingLevel(contentText || azureExtract.content);
  const sections = problems.map((problem, index) => {
    const vector = problemVectors[index];
    return {
      sectionId: problem.problemId,
      title: getProblemTitle(problem),
      text: problem.cleanedText ?? problem.rawText,
      concepts: Object.keys(vector.concepts).length > 0 ? vector.concepts : void 0,
      standards: Object.keys(vector.standards ?? {}).length > 0 ? vector.standards : void 0,
      difficulty: vector.difficulty,
      linguisticLoad: vector.linguisticLoad
    };
  });
  return {
    documentId,
    title: getDocumentTitle(azureExtract),
    subject,
    rawText: normalizeWhitespace(contentText || azureExtract.content),
    sections,
    problems,
    documentConceptDetails: conceptDetails.length > 0 ? conceptDetails : void 0,
    documentConcepts: Object.keys(conceptTotals).length > 0 ? conceptTotals : void 0,
    documentStandards: Object.keys(standardTotals).length > 0 ? standardTotals : void 0,
    overallDifficulty: Number(difficultyScore.toFixed(2)),
    overallLinguisticLoad: Number(linguisticLoad.toFixed(2)),
    conceptGraph,
    semantics: {
      topic: subject,
      concepts: conceptDetails.filter((concept) => !concept.isNoise).slice(0, 8).map((concept) => concept.concept),
      relationships: conceptGraph.edges.slice(0, 8).map((edge) => `${edge.from}->${edge.to}`),
      misconceptions: Object.keys(misconceptionTotals)
    },
    confidence: {
      extractionQuality: Number(clampConfidence(problems.length, azureExtract.content.length > 0).toFixed(2)),
      taggingQuality: Number(clampConfidence(problemVectors.length, sortedConcepts.length > 0).toFixed(2))
    },
    flags: {
      unreadable: azureExtract.content.trim().length === 0,
      lowQualityScan: readingLevel !== null ? readingLevel > 12 : false,
      missingPages: azureExtract.pages.length === 0
    }
  };
}
function clampConfidence(count, signalPresent) {
  const base = signalPresent ? 0.72 : 0.5;
  return Math.max(0, Math.min(1, base + Math.min(count, 5) * 0.05));
}
function getDocumentTitle(azureExtract) {
  const firstParagraph = classifyParagraphBlocks(azureExtract).find((block) => !block.isSuppressed)?.text;
  const firstLine2 = firstParagraph ?? azureExtract.content.split(/\n+/)[0] ?? azureExtract.fileName;
  const title = normalizeWhitespace(firstLine2);
  return title.length > 0 ? truncateText(title, 80) : azureExtract.fileName;
}
function getProblemTitle(problem) {
  const sourceText = problem.partText ?? problem.cleanedText ?? problem.rawText;
  const firstLine2 = sourceText.split(/\n+/)[0] ?? sourceText;
  const prefix = problem.partLabel ? `Problem ${problem.problemNumber ?? "?"} ${problem.teacherLabel ?? ""}`.trim() : problem.teacherLabel ? `Problem ${problem.problemNumber ?? "?"}` : void 0;
  const summary = truncateText(normalizeWhitespace(firstLine2), 80);
  return prefix ? `${prefix}: ${summary}` : summary;
}

// src/prism-v4/semantic/cognitive/fusionConfig.ts
var fusionConfig = {
  bloom: {
    azure: 0.3,
    structural: 0.25,
    template: 0.45
  },
  difficulty: {
    azure: 0.5,
    structural: 0.2,
    template: 0.3
  },
  multistep: {
    extracted: 0.4,
    structural: 0.3,
    template: 0.3
  }
};

// src/prism-v4/semantic/cognitive/fuseCognition.ts
function clampStepCount(value) {
  return Math.min(6, Math.max(1, value));
}
function normalizeExpectedSteps(value) {
  if (typeof value !== "number") {
    return void 0;
  }
  return clamp013((clampStepCount(value) - 1) / 5);
}
function weighted(azureValue, structuralValue, templateValue, weights) {
  const entries = [
    { value: azureValue, weight: weights.azure },
    { value: structuralValue, weight: weights.structural },
    { value: templateValue, weight: weights.template }
  ].filter((entry) => typeof entry.value === "number");
  if (entries.length === 0) {
    return 0;
  }
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }
  return clamp013(entries.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight);
}
function weightedBloom(azureValue, structuralValue, templateValue, weights) {
  const azureScore = azureValue ?? 0;
  const structuralScore = structuralValue ?? 0;
  const templateScore = templateValue ?? 0;
  const totalWeight = weights.azure + weights.structural + weights.template;
  if (totalWeight <= 0) {
    return 0;
  }
  return clamp013((azureScore * weights.azure + structuralScore * weights.structural + templateScore * weights.template) / totalWeight);
}
function fuseBloom(azureBloom, structuralBloom, templateBloom, weights) {
  return {
    remember: weightedBloom(azureBloom.remember, structuralBloom?.remember, templateBloom?.remember, weights),
    understand: weightedBloom(azureBloom.understand, structuralBloom?.understand, templateBloom?.understand, weights),
    apply: weightedBloom(azureBloom.apply, structuralBloom?.apply, templateBloom?.apply, weights),
    analyze: weightedBloom(azureBloom.analyze, structuralBloom?.analyze, templateBloom?.analyze, weights),
    evaluate: weightedBloom(azureBloom.evaluate, structuralBloom?.evaluate, templateBloom?.evaluate, weights),
    create: weightedBloom(azureBloom.create, structuralBloom?.create, templateBloom?.create, weights)
  };
}
function fuseExpectedSteps(structural, template) {
  const structuralStepEstimate = clampStepCount(structural.reasoning?.structuralStepEstimate ?? 1);
  const templateExpectedSteps = template.reasoning?.templateExpectedSteps;
  const templateConfidence = clamp013(template.reasoning?.templateConfidence ?? 0);
  const templateIsBestGuess = template.reasoning?.templateIsBestGuess ?? false;
  if (typeof templateExpectedSteps !== "number" || templateConfidence <= 0) {
    return {
      expectedSteps: Math.round(structuralStepEstimate),
      stepSource: "fallback",
      stepType: template.reasoning?.stepType,
      structuralStepEstimate
    };
  }
  const influence = templateIsBestGuess ? templateConfidence * 0.4 : templateConfidence;
  const blended = clampStepCount(templateExpectedSteps * influence + structuralStepEstimate * (1 - influence));
  const expectedSteps = Math.round(blended);
  const stepSource = templateConfidence >= 0.85 && !templateIsBestGuess ? "template" : "blended";
  return {
    expectedSteps,
    stepSource,
    stepType: template.reasoning?.stepType,
    structuralStepEstimate,
    templateExpectedSteps,
    templateConfidence,
    templateIsBestGuess,
    templateId: template.reasoning?.templateId,
    templateSource: template.reasoning?.templateSource
  };
}
function buildInternalProblemReasoning(structural, template) {
  const fused = fuseExpectedSteps(structural, template);
  return {
    ...structural.reasoning,
    ...template.reasoning,
    expectedSteps: fused.expectedSteps,
    stepSource: fused.stepSource,
    structuralStepEstimate: fused.structuralStepEstimate,
    templateExpectedSteps: fused.templateExpectedSteps,
    templateConfidence: fused.templateConfidence,
    templateId: fused.templateId,
    templateSource: fused.templateSource,
    templateIsBestGuess: fused.templateIsBestGuess,
    stepType: fused.stepType
  };
}
function fuseCognition(azure, structural, template, weights = fusionConfig) {
  const bloom = fuseBloom(azure.bloom, structural.bloom, template.bloom, weights.bloom);
  const fusedSteps = fuseExpectedSteps(structural, template);
  const structuralStepSignal = normalizeExpectedSteps(structural.reasoning?.structuralStepEstimate);
  const templateStepSignal = normalizeExpectedSteps(template.reasoning?.templateExpectedSteps);
  const fusedStepSignal = normalizeExpectedSteps(fusedSteps.expectedSteps) ?? 0;
  const structuralMultiStep = Math.max(structural.multiStep ?? 0, (structuralStepSignal ?? 0) * 0.6);
  const templateStepBoost = typeof templateStepSignal === "number" ? templateStepSignal * (template.reasoning?.templateIsBestGuess ? 0.25 : 0.5) : void 0;
  const templateMultiStep = typeof template.multiStep === "number" || typeof templateStepBoost === "number" ? Math.max(template.multiStep ?? 0, templateStepBoost ?? 0) : void 0;
  const weightedMultiStep = weighted(azure.multiStep, structuralMultiStep, templateMultiStep, {
    azure: weights.multistep.extracted,
    structural: weights.multistep.structural,
    template: weights.multistep.template
  });
  return {
    bloom,
    difficulty: weighted(azure.difficulty, structural.difficulty, template.difficulty, weights.difficulty),
    linguisticLoad: clamp013(azure.linguisticLoad),
    abstractionLevel: clamp013(azure.abstractionLevel),
    multiStep: clamp013(Math.max(weightedMultiStep, fusedStepSignal * 0.4)),
    representationComplexity: clamp013(structural.representationComplexity ?? 0),
    misconceptionRisk: clamp013(template.misconceptionRisk ?? 0)
  };
}

// src/prism-v4/semantic/cognitive/fuseOverrides.ts
var IMMUTABLE_KEYS = /* @__PURE__ */ new Set(["canonicalProblemId", "rootProblemId", "parentProblemId", "displayOrder", "createdAt"]);
function fuseOverrides(problem, overrides) {
  if (!overrides) {
    if (problem.tags?.reasoning) {
      problem.tags.reasoning.overridesApplied = false;
    }
    return problem;
  }
  const next = {
    ...problem,
    tags: {
      ...problem.tags ?? {}
    }
  };
  if (overrides.bloom) {
    next.tags.bloom = overrides.bloom;
    next.tags.cognitive = {
      ...next.tags.cognitive,
      bloom: overrides.bloom
    };
  }
  if (typeof overrides.difficulty === "number") {
    next.tags.difficulty = overrides.difficulty;
    next.tags.cognitive = { ...next.tags.cognitive, difficulty: overrides.difficulty };
  }
  if (typeof overrides.linguisticLoad === "number") {
    next.tags.linguisticLoad = overrides.linguisticLoad;
    next.tags.cognitive = { ...next.tags.cognitive, linguisticLoad: overrides.linguisticLoad };
  }
  if (typeof overrides.abstractionLevel === "number") {
    next.tags.abstractionLevel = overrides.abstractionLevel;
    next.tags.cognitive = { ...next.tags.cognitive, abstractionLevel: overrides.abstractionLevel };
  }
  if (typeof overrides.multiStep === "number") {
    next.tags.multiStep = overrides.multiStep;
    next.tags.cognitive = { ...next.tags.cognitive, multiStep: overrides.multiStep };
  }
  if (typeof overrides.representationComplexity === "number") {
    next.tags.cognitive = { ...next.tags.cognitive, representationComplexity: overrides.representationComplexity };
  }
  if (typeof overrides.misconceptionRisk === "number") {
    next.tags.cognitive = { ...next.tags.cognitive, misconceptionRisk: overrides.misconceptionRisk };
  }
  if (overrides.concepts) {
    next.tags.concepts = overrides.concepts;
  }
  if (overrides.subject) {
    next.tags.subject = overrides.subject;
  }
  if (overrides.domain) {
    next.tags.domain = overrides.domain;
  }
  if (typeof overrides.stemText === "string" && !IMMUTABLE_KEYS.has("stemText")) {
    next.stemText = overrides.stemText;
  }
  if (typeof overrides.partText === "string" && !IMMUTABLE_KEYS.has("partText")) {
    next.partText = overrides.partText;
  }
  if (overrides.tags) {
    next.tags = {
      ...next.tags,
      ...overrides.tags
    };
  }
  if (overrides.misconceptionTriggers) {
    next.tags.misconceptionTriggers = {
      ...next.tags.misconceptionTriggers ?? {},
      ...overrides.misconceptionTriggers
    };
  }
  if (overrides.segmentation) {
    next.tags.teacherSegmentation = overrides.segmentation;
  }
  if (overrides.problemGrouping) {
    next.tags.teacherProblemGrouping = overrides.problemGrouping;
  }
  next.tags.teacherAdjustments = {
    overrideVersion: overrides.overrideVersion,
    lastUpdatedAt: overrides.lastUpdatedAt
  };
  if (next.tags.reasoning) {
    next.tags.reasoning = {
      ...next.tags.reasoning,
      overridesApplied: true
    };
  }
  return next;
}

// src/prism-v4/semantic/cognitive/inferStructuralCognition.ts
var DIRECTIVE_PATTERNS = [
  /\bsolve\b/gi,
  /\bexplain\b/gi,
  /\bjustify\b/gi,
  /\bcompare\b/gi,
  /\banalyze\b/gi,
  /\bshow\b/gi,
  /\bdescribe\b/gi,
  /\binterpret\b/gi,
  /\bevaluate\b/gi,
  /\bprove\b/gi,
  /\bcalculate\b/gi,
  /\bdetermine\b/gi
];
function countDirectiveMatches(text) {
  return DIRECTIVE_PATTERNS.reduce((count, pattern) => count + (text.match(pattern)?.length ?? 0), 0);
}
function clampStepCount2(value) {
  return Math.min(6, Math.max(1, value));
}
function inferStructuralCognition(problem, context = {}) {
  const isMultipartChild = problem.partIndex !== null && problem.partIndex !== void 0 && problem.partIndex > 0;
  const isMultipartParent = context.isMultipartParent === true;
  const problemText2 = `${problem.stemText ?? ""}
${problem.partText ?? ""}
${problem.cleanedText ?? problem.rawText ?? ""}`;
  const directiveCount = countDirectiveMatches(problemText2);
  const extractedSteps = Math.max(1, problem.tags?.steps ?? 1);
  const representationType = problem.tags?.representation ?? "paragraph";
  const representationCount = problem.tags?.representationCount ?? 1;
  const structuralStepEstimate = clampStepCount2(1 + Math.max(0, extractedSteps - 1) * 0.6 + representationCount * 0.2 + (isMultipartParent ? 1 : 0));
  const representationComplexity = clamp013(0.2 + Math.max(0, representationCount - 1) * 0.2);
  const constructedResponse = Boolean(problem.tags?.problemType.constructedResponse || problem.tags?.problemType.shortAnswer);
  const responseBoost = constructedResponse ? 0.06 : 0.02;
  const stepBoost = Math.min(0.28, Math.max(0, extractedSteps - 1) * 0.14);
  const directiveBoost = Math.min(0.2, Math.max(0, directiveCount - 1) * 0.1);
  const multipartBoost = isMultipartChild ? 0.08 : isMultipartParent ? 0.12 : 0;
  const representationTypeBoost = representationType === "paragraph" ? 0 : representationType === "equation" ? 0.02 : 0.04;
  const representationBoost = Math.min(0.12, Math.max(0, representationCount - 1) * 0.05 + representationTypeBoost);
  const multiStep = clamp013(0.08 + stepBoost + directiveBoost + multipartBoost + representationBoost + responseBoost);
  const bloom = {
    remember: 0.1,
    understand: 0.2,
    apply: clamp013(0.08 + multiStep * 0.35),
    analyze: clamp013(0.04 + multiStep * 0.28),
    evaluate: 0.05,
    create: 0
  };
  return {
    bloom,
    multiStep,
    representationComplexity,
    reasoning: {
      structuralStepEstimate,
      extractedSteps,
      representationCount,
      directiveCount,
      isMultipartParent,
      isMultipartChild
    }
  };
}

// src/prism-v4/semantic/utils/representationCues.ts
function hasAnyMatch(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}
function detectRepresentationSignals(args) {
  const normalizedText = args.text.toLowerCase();
  const codeLike = hasAnyMatch(args.text, [
    /\bfor\s*\(/,
    /\bwhile\s*\(/,
    /\bif\s*\(/,
    /\bfunction\b/i,
    /\bdef\b/i,
    /\bclass\b/i,
    /console\.log/,
    /[{}]/
  ]);
  const cues = {
    equation: !codeLike && hasAnyMatch(args.text, [
      /\bsolve for\b/i,
      /\bequation\b/i,
      /\b[fF]\s*\(\s*x\s*\)/,
      /[a-zA-Z]\s*=\s*[^=]/
    ]),
    graph: hasAnyMatch(normalizedText, [
      /\bgraph\b/,
      /\bchart\b/,
      /\bplot\b/,
      /\baxis\b/,
      /\bhistogram\b/,
      /\bscatterplot\b/
    ]),
    table: args.hasExtractedTable === true || hasAnyMatch(normalizedText, [
      /\btable\b/,
      /\brow\b/,
      /\bcolumn\b/
    ]),
    diagram: hasAnyMatch(normalizedText, [
      /\bdiagram\b/,
      /\billustration\b/,
      /\blabeled figure\b/,
      /\bschematic\b/
    ]),
    map: hasAnyMatch(normalizedText, [
      /\bmap\b/,
      /\bregion\b/,
      /\blocation\b/
    ]),
    timeline: hasAnyMatch(normalizedText, [
      /\btimeline\b/,
      /\bsequence of events\b/
    ]),
    experiment: hasAnyMatch(normalizedText, [
      /\bexperiment\b/,
      /\blab\b/,
      /\bvariable\b/,
      /\bhypothesis\b/,
      /\bprocedure\b/
    ]),
    primarySource: hasAnyMatch(normalizedText, [
      /\bpassage\b/,
      /\bexcerpt\b/,
      /\bsource\b/,
      /\bdocument\b/,
      /\bauthor\b/,
      /\bread the passage\b/
    ]),
    codeLike
  };
  const precedence = [
    { name: "table", active: cues.table },
    { name: "graph", active: cues.graph },
    { name: "map", active: cues.map },
    { name: "timeline", active: cues.timeline },
    { name: "experiment", active: cues.experiment },
    { name: "primarySource", active: cues.primarySource },
    { name: "diagram", active: cues.diagram },
    { name: "paragraph", active: cues.codeLike },
    { name: "equation", active: cues.equation }
  ];
  const representation = precedence.find((entry) => entry.active)?.name ?? "paragraph";
  const publicCueCount = Object.entries(cues).filter(([name, active]) => name !== "codeLike" && active).length;
  const representationCount = Math.max(1, publicCueCount + (cues.codeLike ? 1 : 0));
  return {
    representation,
    representationCount,
    cues
  };
}

// src/prism-v4/semantic/cognitive/templates/index.ts
var runtimeTemplates = loadSeededTemplates().map(toRuntimeTemplate);
var genericOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "generic");
var mathOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "math");
var statsOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "statistics");
var elaOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "reading");
var scienceOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "science");
var historyOnlyTemplates = runtimeTemplates.filter((template) => template.subject === "socialstudies");
var genericTemplates = genericOnlyTemplates;
var mathTemplates = [...genericOnlyTemplates, ...mathOnlyTemplates, ...statsOnlyTemplates];
var statsTemplates = [...genericOnlyTemplates, ...statsOnlyTemplates];
var elaTemplates = [...genericOnlyTemplates, ...elaOnlyTemplates];
var scienceTemplates = [...genericOnlyTemplates, ...scienceOnlyTemplates];
var historyTemplates = [...genericOnlyTemplates, ...historyOnlyTemplates];
var cognitiveTemplates = runtimeTemplates;
function problemText(problem) {
  return `${problem.stemText ?? ""}
${problem.partText ?? ""}
${problem.cleanedText ?? problem.rawText}`;
}
function lowerProblemText(problem) {
  return problemText(problem).toLowerCase();
}
function weightedAverage(entries) {
  if (entries.length === 0) {
    return 0;
  }
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }
  return entries.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight;
}
function scoreTextPatterns(text, patterns) {
  if (patterns.length === 0) {
    return void 0;
  }
  const hits = patterns.filter((pattern) => text.includes(pattern.toLowerCase())).length;
  return hits / patterns.length;
}
function scoreRegexPatterns(text, patterns) {
  if (patterns.length === 0) {
    return void 0;
  }
  const hits = patterns.filter((pattern) => {
    try {
      return new RegExp(pattern, "i").test(text);
    } catch {
      return false;
    }
  }).length;
  return hits / patterns.length;
}
function getStructuralFlags(problem) {
  const text = problemText(problem);
  const signals = detectRepresentationSignals({
    text,
    hasExtractedTable: problem.tags?.representation === "table"
  });
  const problemType = problem.tags?.problemType ?? {};
  const representation = problem.tags?.representation ?? signals.representation;
  const representationCount = problem.tags?.representationCount ?? signals.representationCount;
  return {
    hasEquation: representation === "equation" || signals.cues.equation,
    hasGraph: representation === "graph" || signals.cues.graph,
    hasTable: representation === "table" || signals.cues.table,
    hasDiagram: representation === "diagram" || signals.cues.diagram,
    hasMap: representation === "map" || signals.cues.map,
    hasTimeline: representation === "timeline" || signals.cues.timeline,
    hasExperiment: representation === "experiment" || signals.cues.experiment,
    hasSourceExcerpt: representation === "primarySource" || signals.cues.primarySource,
    hasPassage: signals.cues.primarySource,
    hasCodeLikeContent: signals.cues.codeLike,
    multiRepresentation: representationCount > 1,
    constructedResponse: Boolean(problemType.constructedResponse || problemType.shortAnswer),
    multipart: (problem.partIndex ?? 0) > 0
  };
}
function countActiveRepresentationFlags(structuralFlags) {
  return [
    structuralFlags.hasEquation,
    structuralFlags.hasGraph,
    structuralFlags.hasTable,
    structuralFlags.hasDiagram,
    structuralFlags.hasMap,
    structuralFlags.hasTimeline,
    structuralFlags.hasExperiment,
    structuralFlags.hasSourceExcerpt
  ].filter(Boolean).length;
}
function getArchetypeBonus(template, structuralFlags) {
  if (template.archetypeKey !== "multi-representation-synthesis") {
    return 0;
  }
  const representationKinds = countActiveRepresentationFlags(structuralFlags);
  if (!structuralFlags.multiRepresentation || representationKinds < 2) {
    return 0;
  }
  return structuralFlags.constructedResponse ? 0.6 : 0.48;
}
function scoreTemplate(problem, template) {
  if (template.match) {
    if (!template.match(problem)) {
      return null;
    }
    const baseConfidence2 = 1;
    return {
      template,
      baseConfidence: baseConfidence2,
      confidence: clamp013(baseConfidence2 + (template.learningAdjustment?.confidenceDelta ?? 0)),
      passesThreshold: true,
      isBestGuess: false
    };
  }
  if (!template.patternConfig) {
    return null;
  }
  const text = lowerProblemText(problem);
  const structuralFlags = getStructuralFlags(problem);
  const textScore = scoreTextPatterns(text, template.patternConfig.textPatterns);
  const structuralScore = template.patternConfig.structuralPatterns.length > 0 ? template.patternConfig.structuralPatterns.filter((flag) => structuralFlags[flag]).length / template.patternConfig.structuralPatterns.length : void 0;
  const regexScore = scoreRegexPatterns(problemText(problem), template.patternConfig.regexPatterns ?? []);
  const baseConfidence = clamp013(weightedAverage([
    ...typeof textScore === "number" ? [{ value: textScore, weight: 0.55 }] : [],
    ...typeof structuralScore === "number" ? [{ value: structuralScore, weight: 0.3 }] : [],
    ...typeof regexScore === "number" ? [{ value: regexScore, weight: 0.15 }] : []
  ]) + getArchetypeBonus(template, structuralFlags));
  const confidence = clamp013(baseConfidence + (template.learningAdjustment?.confidenceDelta ?? 0));
  if (confidence <= 0) {
    return null;
  }
  return {
    template,
    baseConfidence,
    confidence,
    passesThreshold: confidence >= (template.minConfidence ?? template.patternConfig.minConfidence),
    isBestGuess: false
  };
}
function pickTemplatesForSubject(subject) {
  switch (subject) {
    case "math":
      return mathTemplates;
    case "reading":
      return elaTemplates;
    case "science":
      return scienceTemplates;
    case "socialstudies":
      return historyTemplates;
    default:
      return genericTemplates;
  }
}
function getTemplateMatches(problem, templates = cognitiveTemplates) {
  const scored = templates.map((template) => scoreTemplate(problem, template)).filter((result) => result !== null).sort((left, right) => right.confidence - left.confidence);
  const strongHits = scored.filter((result) => result.passesThreshold);
  if (strongHits.length > 0) {
    return strongHits;
  }
  const bestGuess = scored[0];
  if (!bestGuess) {
    return [];
  }
  return [{
    ...bestGuess,
    isBestGuess: true
  }];
}
function getPrioritizedTemplateMatches(problem, systemTemplates, teacherTemplates) {
  const systemMatches = getTemplateMatches(problem, systemTemplates).map((result) => ({ ...result, source: "system" }));
  const teacherMatches = getTemplateMatches(problem, teacherTemplates).map((result) => ({ ...result, source: "teacher" }));
  const strongTeacher = teacherMatches.filter((result) => result.passesThreshold && !result.isBestGuess);
  if (strongTeacher.length > 0) {
    return strongTeacher;
  }
  const strongSystem = systemMatches.filter((result) => result.passesThreshold && !result.isBestGuess);
  if (strongSystem.length > 0) {
    return strongSystem;
  }
  const teacherBestGuess = teacherMatches.find((result) => result.isBestGuess);
  if (teacherBestGuess) {
    return [teacherBestGuess];
  }
  const systemBestGuess = systemMatches.find((result) => result.isBestGuess);
  return systemBestGuess ? [systemBestGuess] : [];
}
function applyTemplates(problem, templates = cognitiveTemplates) {
  const matched = getTemplateMatches(problem, templates);
  const bloom = {};
  for (const match of matched) {
    const scale = match.confidence * (match.isBestGuess ? 0.6 : 1);
    for (const [level, score] of Object.entries(match.template.bloom)) {
      const key = level;
      bloom[key] = clamp013((bloom[key] ?? 0) + (score ?? 0) * scale);
    }
  }
  return {
    bloom,
    difficulty: clamp013(matched.reduce((total, match) => total + (match.template.difficultyBoost ?? 0) * match.confidence * (match.isBestGuess ? 0.6 : 1), 0)),
    multiStep: clamp013(matched.reduce((total, match) => total + (match.template.multiStepBoost ?? 0) * match.confidence * (match.isBestGuess ? 0.6 : 1), 0)),
    misconceptionRisk: clamp013(matched.reduce((total, match) => total + (match.template.misconceptionRiskBoost ?? 0) * match.confidence * (match.isBestGuess ? 0.6 : 1), 0))
  };
}

// src/prism-v4/semantic/extract/extractProblem.ts
var INLINE_SUBPART_BOUNDARY = /\s+(?=(?:\d+[a-z][.)]|\([a-z]\)|[a-z][.)]|\d+[a-z])\s+)/i;
function looksLikeProblemBoundary(text) {
  return /^(?:\d+[.)\]]|q\s*\d+[.)\]]|question\s*\d+[:.]|[A-Z][.)])\s+/i.test(text);
}
function matchTopLevelProblem(text) {
  const match = text.match(/^(?:problem\s+)?(\d+)(?:\s*[:.)-])?(?:\s+(.*))?$/i);
  if (!match) {
    return null;
  }
  return {
    problemNumber: Number(match[1]),
    body: normalizeWhitespace(match[2] ?? "")
  };
}
function matchSubpart(text) {
  const match = text.match(/^(?:(\d+)([a-z])[.)]|\(([a-z])\)|([a-z])[.)]|(\d+)([a-z]))\s+(.*)$/);
  if (!match) {
    return null;
  }
  const numberedProblem = match[1] ?? match[5];
  const partLabel = (match[2] ?? match[3] ?? match[4] ?? match[6] ?? "").toLowerCase();
  if (!partLabel) {
    return null;
  }
  return {
    problemNumber: numberedProblem ? Number(numberedProblem) : void 0,
    partLabel,
    body: normalizeWhitespace(match[7] ?? "")
  };
}
function alphabetIndex(partLabel) {
  const normalized = partLabel.trim().toLowerCase();
  if (!/^[a-z]$/.test(normalized)) {
    return 0;
  }
  return normalized.charCodeAt(0) - 96;
}
function toProblemPartDraft(subpart, pageNumber) {
  return {
    partLabel: subpart.partLabel,
    partIndex: alphabetIndex(subpart.partLabel),
    teacherLabel: `${subpart.partLabel})`,
    pageNumber,
    textLines: subpart.body ? [subpart.body] : []
  };
}
function splitInlineSubparts(text, pageNumber) {
  const segments = text.split(INLINE_SUBPART_BOUNDARY).map((segment) => normalizeWhitespace(segment)).filter((segment) => segment.length > 0);
  if (segments.length <= 1) {
    return null;
  }
  const result = { parts: [] };
  for (const segment of segments) {
    const subpart = matchSubpart(segment);
    if (subpart) {
      result.parts.push(toProblemPartDraft(subpart, pageNumber));
      continue;
    }
    if (result.parts.length === 0) {
      result.leadingText = result.leadingText ? `${result.leadingText}
${segment}` : segment;
      continue;
    }
    result.parts[result.parts.length - 1].textLines.push(segment);
  }
  return result.parts.length > 0 ? result : null;
}
function looksLikeHeader(text, role) {
  if (role === "title") {
    return true;
  }
  const normalized = normalizeWhitespace(text);
  if (!normalized || normalized.length > 90 || /[.!?]$/.test(normalized)) {
    return false;
  }
  if (/^(?:name|date|teacher|class|period|directions)\b/i.test(normalized)) {
    return true;
  }
  const words = normalized.split(/\s+/);
  return words.length > 1 && words.length <= 12 && !/^\d/.test(normalized);
}
function createProblem(params) {
  const createdAt = new Date().toISOString();
  const localProblemId = params.problemId;
  const problemGroupId = params.rootProblemId;
  return {
    problemId: params.problemId,
    localProblemId,
    problemGroupId,
    canonicalProblemId: void 0,
    rootProblemId: params.rootProblemId,
    parentProblemId: params.parentProblemId,
    problemNumber: params.problemNumber,
    partIndex: params.partIndex,
    partLabel: params.partLabel,
    teacherLabel: params.teacherLabel,
    stemText: params.stemText,
    partText: params.partText,
    displayOrder: params.displayOrder,
    createdAt,
    rawText: params.rawText,
    cleanedText: params.cleanedText,
    mediaUrls: extractMediaUrls(params.rawText),
    sourceType: "document",
    sourceDocumentId: params.fileName,
    sourcePageNumber: params.sourcePageNumber,
    sourceSpan: params.sourceSpan
  };
}
function extractMediaUrls(text) {
  const urls = text.match(/https?:\/\/\S+/g) ?? [];
  const figureRefs = [...text.matchAll(/\b(?:figure|image|diagram|graph|table)\s+\d+/gi)].map((match) => match[0]);
  return [.../* @__PURE__ */ new Set([...urls, ...figureRefs])];
}
function buildProblemGroupProblems(group, fileName) {
  const stemText = normalizeWhitespace(group.stemLines.join("\n"));
  const rootDisplayOrder = group.problemNumber * 1e3;
  const rootProblem = createProblem({
    problemId: group.rootProblemId,
    rootProblemId: group.rootProblemId,
    parentProblemId: null,
    problemNumber: group.problemNumber,
    partIndex: 0,
    teacherLabel: group.teacherLabel,
    stemText,
    rawText: `${group.teacherLabel} ${stemText}`.trim(),
    cleanedText: stemText,
    fileName,
    sourcePageNumber: group.pageNumber,
    sourceSpan: { firstPage: group.pageNumber, lastPage: group.lastPageNumber },
    displayOrder: rootDisplayOrder
  });
  if (group.parts.length === 0) {
    return [rootProblem];
  }
  return [
    rootProblem,
    ...group.parts.map((part) => {
      const partText = normalizeWhitespace(part.textLines.join("\n"));
      const rawText = [
        `${group.teacherLabel} ${stemText}`.trim(),
        `${part.teacherLabel} ${partText}`.trim()
      ].filter(Boolean).join("\n");
      const cleanedText = [stemText, partText].filter(Boolean).join("\n");
      return createProblem({
        problemId: `${group.rootProblemId}${part.partLabel}`,
        rootProblemId: group.rootProblemId,
        parentProblemId: group.rootProblemId,
        problemNumber: group.problemNumber,
        partIndex: part.partIndex,
        partLabel: part.partLabel,
        teacherLabel: part.teacherLabel,
        stemText,
        partText,
        rawText,
        cleanedText,
        fileName,
        sourcePageNumber: part.pageNumber,
        sourceSpan: { firstPage: group.pageNumber, lastPage: group.lastPageNumber },
        displayOrder: group.problemNumber * 1e3 + part.partIndex * 100
      });
    })
  ];
}
function buildLegacyProblem(rawText, cleanedText, fileName, sourcePageNumber) {
  const problemId = `p${sourcePageNumber}-${Math.abs(cleanedText.length)}`;
  const createdAt = new Date().toISOString();
  return {
    problemId,
    localProblemId: problemId,
    problemGroupId: problemId,
    canonicalProblemId: void 0,
    rootProblemId: void 0,
    parentProblemId: null,
    problemNumber: void 0,
    partIndex: 0,
    partLabel: void 0,
    teacherLabel: void 0,
    stemText: void 0,
    partText: void 0,
    displayOrder: void 0,
    createdAt,
    rawText,
    cleanedText,
    mediaUrls: extractMediaUrls(rawText),
    sourceType: "document",
    sourceDocumentId: fileName,
    sourcePageNumber,
    sourceSpan: { firstPage: sourcePageNumber, lastPage: sourcePageNumber }
  };
}
function extractHierarchicalProblems(blocks, fileName) {
  const groups = [];
  let currentGroup = null;
  let currentPart = null;
  let foundTopLevelProblem = false;
  for (const block of blocks) {
    const topLevel = matchTopLevelProblem(block.text);
    if (topLevel) {
      foundTopLevelProblem = true;
      currentPart = null;
      const inlineSubparts2 = splitInlineSubparts(topLevel.body, block.pageNumber);
      currentGroup = {
        problemNumber: topLevel.problemNumber,
        rootProblemId: `p${topLevel.problemNumber}`,
        teacherLabel: `${topLevel.problemNumber}.`,
        pageNumber: block.pageNumber,
        lastPageNumber: block.pageNumber,
        stemLines: inlineSubparts2?.leadingText ? [inlineSubparts2.leadingText] : topLevel.body ? [topLevel.body] : [],
        parts: inlineSubparts2?.parts ?? []
      };
      groups.push(currentGroup);
      currentPart = currentGroup.parts[currentGroup.parts.length - 1] ?? null;
      continue;
    }
    if (!currentGroup) {
      if (looksLikeHeader(block.text, block.role)) {
        continue;
      }
      continue;
    }
    currentGroup.lastPageNumber = Math.max(currentGroup.lastPageNumber, block.pageNumber);
    const inlineSubparts = splitInlineSubparts(block.text, block.pageNumber);
    if (inlineSubparts) {
      if (inlineSubparts.leadingText) {
        if (currentPart) {
          currentPart.textLines.push(inlineSubparts.leadingText);
        } else {
          currentGroup.stemLines.push(inlineSubparts.leadingText);
        }
      }
      currentGroup.parts.push(...inlineSubparts.parts);
      currentPart = currentGroup.parts[currentGroup.parts.length - 1] ?? currentPart;
      continue;
    }
    const subpart = matchSubpart(block.text);
    if (subpart) {
      if (subpart.problemNumber && subpart.problemNumber !== currentGroup.problemNumber) {
        currentPart = null;
        currentGroup = {
          problemNumber: subpart.problemNumber,
          rootProblemId: `p${subpart.problemNumber}`,
          teacherLabel: `${subpart.problemNumber}.`,
          pageNumber: block.pageNumber,
          lastPageNumber: block.pageNumber,
          stemLines: [],
          parts: []
        };
        groups.push(currentGroup);
      }
      currentPart = toProblemPartDraft(subpart, block.pageNumber);
      currentGroup.parts.push(currentPart);
      continue;
    }
    if (currentPart) {
      currentPart.textLines.push(block.text);
    } else {
      currentGroup.stemLines.push(block.text);
    }
  }
  if (!foundTopLevelProblem) {
    return [];
  }
  return groups.flatMap((group) => buildProblemGroupProblems(group, fileName));
}
function extractLegacyProblems(blocks, azureExtract) {
  const problems = [];
  let currentLines = [];
  let currentPageNumber = blocks[0]?.pageNumber ?? 1;
  for (const block of blocks) {
    const isBoundary = block.role === "title" ? false : looksLikeProblemBoundary(block.text);
    if (isBoundary && currentLines.length > 0) {
      const rawText = currentLines.join("\n");
      problems.push(buildLegacyProblem(rawText, normalizeWhitespace(rawText), azureExtract.fileName, currentPageNumber));
      currentLines = [];
    }
    if (currentLines.length === 0) {
      currentPageNumber = block.pageNumber;
    }
    currentLines.push(block.text);
  }
  if (currentLines.length > 0) {
    const rawText = currentLines.join("\n");
    problems.push(buildLegacyProblem(rawText, normalizeWhitespace(rawText), azureExtract.fileName, currentPageNumber));
  }
  return problems;
}
function extractProblems(azureExtract) {
  const blocks = classifyParagraphBlocks(azureExtract).filter((paragraph) => !paragraph.isSuppressed).map((paragraph) => ({
    text: paragraph.text,
    pageNumber: paragraph.pageNumber,
    role: paragraph.role
  }));
  const fallbackText = normalizeWhitespace(blocks.map((block) => block.text).join("\n") || azureExtract.content);
  if (blocks.length === 0) {
    return fallbackText.length > 0 ? [buildLegacyProblem(azureExtract.content, fallbackText, azureExtract.fileName, 1)] : [];
  }
  const hierarchicalProblems = extractHierarchicalProblems(blocks, azureExtract.fileName);
  const problems = hierarchicalProblems.length > 0 ? hierarchicalProblems : extractLegacyProblems(blocks, azureExtract);
  if (problems.length === 0 && fallbackText.length > 0) {
    return [buildLegacyProblem(azureExtract.content, fallbackText, azureExtract.fileName, 1)];
  }
  return problems;
}

// src/prism-v4/semantic/extract/extractProblemMetadata.ts
var DIRECTIVE_PATTERNS2 = [
  /\bsolve\b/gi,
  /\bexplain\b/gi,
  /\bjustify\b/gi,
  /\bcompare\b/gi,
  /\banalyze\b/gi,
  /\bshow\b/gi,
  /\bdescribe\b/gi,
  /\binterpret\b/gi,
  /\bevaluate\b/gi,
  /\bprove\b/gi,
  /\bcalculate\b/gi,
  /\bdetermine\b/gi
];
function countDirectiveMatches2(text) {
  return DIRECTIVE_PATTERNS2.reduce((count, pattern) => count + (text.match(pattern)?.length ?? 0), 0);
}
function normalizeExtractedMultiStep(steps) {
  return clamp013(0.1 + Math.max(0, steps - 1) * 0.3);
}
function extractProblemMetadata(problems, tablesByProblemId) {
  return problems.map((p) => {
    const text = normalizeWhitespace(p.cleanedText || p.rawText || "");
    const lower = text.toLowerCase();
    const answerChoices = [...text.matchAll(/(?:^|\n)\s*(?:[A-D]|[1-4])[.)]\s+(.+)/gim)].map((match) => normalizeWhitespace(match[1]));
    let problemType = "constructedResponse";
    if (/\btrue\s+or\s+false\b/i.test(text)) {
      problemType = "trueFalse";
    } else if (/\bselect all\b/i.test(text)) {
      problemType = "multipleSelect";
    } else if (answerChoices.length >= 2 || /multiple choice/i.test(text)) {
      problemType = "multipleChoice";
    } else if (/\bfill in the blank\b/i.test(text)) {
      problemType = "fillInBlank";
    } else if (/\bshort answer\b/i.test(text) || text.length < 120) {
      problemType = "shortAnswer";
    }
    const representationSignals = detectRepresentationSignals({
      text,
      hasExtractedTable: (tablesByProblemId[p.problemId] ?? []).length > 0
    });
    const representation = representationSignals.representation;
    const directiveCount = countDirectiveMatches2(text);
    const sequentialMarkers = text.match(/\b(?:then|next|after that|finally|using your work|show your work)\b/gi) ?? [];
    const partReferenceBoost = /\bpart\s+[a-z0-9]+\b/gi.test(lower) ? 1 : 0;
    const steps = Math.max(1, Math.min(4, directiveCount + (sequentialMarkers.length > 0 ? 1 : 0) + partReferenceBoost));
    const multiStep = normalizeExtractedMultiStep(steps);
    const abstractionLevel = clamp013((["justify", "analyze", "infer", "evaluate", "generalize"].filter((keyword) => lower.includes(keyword)).length + (representation === "equation" || representation === "graph" ? 1 : 0)) / 6);
    return {
      ...p,
      problemType,
      representation,
      multiStep,
      steps,
      abstractionLevel,
      answerChoices
    };
  });
}

// src/prism-v4/semantic/extract/extractTables.ts
function extractTables(azure, problems) {
  const tables = azure.tables ?? [];
  if (!tables.length)
    return {};
  const byProblem = {};
  for (const p of problems) {
    byProblem[p.problemId] = [];
  }
  for (const table of tables) {
    const pageNumber = table.pageNumber ?? 1;
    let closest = null;
    let bestDistance = Infinity;
    for (const p of problems) {
      const dist = Math.abs((p.sourcePageNumber ?? 1) - pageNumber);
      if (dist < bestDistance) {
        bestDistance = dist;
        closest = p;
      }
    }
    if (closest) {
      byProblem[closest.problemId].push(table);
    }
  }
  return byProblem;
}

// src/prism-v4/semantic/generators/antiCheating.ts
function estimatedStepCount(tags) {
  return Math.max(1, Math.round(tags.reasoning?.adjustedExpectedSteps ?? tags.reasoning?.expectedSteps ?? tags.steps ?? 1));
}
function hasKeywordMatchingSignal(tags) {
  return Object.entries(tags.misconceptionTriggers).some(([key, score]) => /keyword[-_ ]?matching/i.test(key) && score >= 0.5);
}
function analyzeCheatingVulnerabilities(tags) {
  const issues = [];
  const analysisSignal = tags.bloom.analyze + tags.bloom.evaluate;
  if (tags.representation === "graph" && (estimatedStepCount(tags) <= 2 || analysisSignal < 0.35)) {
    issues.push("Students may guess based on graph shape without reasoning.");
  }
  if (hasKeywordMatchingSignal(tags)) {
    issues.push("Prompt may allow keyword guessing instead of understanding.");
  }
  return {
    vulnerabilitySummary: issues.join(" "),
    suggestedChanges: issues.map((issue) => `Fix: ${issue}`)
  };
}

// src/prism-v4/semantic/generators/enrichments.ts
function topConcepts(tags) {
  return Object.entries(tags.concepts).sort((left, right) => right[1] - left[1]).slice(0, 3).map(([key]) => key);
}
function generateEnrichments(tags) {
  const enrichments = [];
  const concepts = topConcepts(tags);
  if (concepts.length > 0) {
    enrichments.push(`Extend the problem by connecting to: ${concepts.join(", ")}`);
  }
  if (tags.representation === "equation") {
    enrichments.push("Ask students to represent the solution using a graph or table.");
  }
  return enrichments;
}

// src/prism-v4/semantic/generators/narrative.ts
function topKeys(record, limit) {
  return Object.entries(record ?? {}).sort((left, right) => right[1] - left[1]).slice(0, limit).map(([key]) => key);
}
function humanizeKey(value) {
  return value.split(/[._-]/g).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
function formatList(values) {
  if (values.length === 0) {
    return "";
  }
  if (values.length === 1) {
    return values[0];
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}
function dominantBloom(tags) {
  return humanizeKey(pickDominantKey(tags.bloom, "understand")).toLowerCase();
}
function dominantConcepts(tags, limit = 3) {
  return topKeys(tags.concepts, limit).map(humanizeKey);
}
function dominantStandards(tags, limit = 3) {
  return topKeys(tags.standards, limit).map(humanizeKey);
}
function misconceptionLabels(tags, limit = 3) {
  return topKeys(tags.misconceptionTriggers, limit).map(humanizeKey);
}
function describeRepresentation(tags) {
  if (tags.representationCount > 1) {
    return "multiple representations";
  }
  return tags.representation;
}
function describeDifficulty(tags) {
  const band = scoreToDifficultyBand(tags.difficulty);
  const difficultyText = humanizeKey(band).toLowerCase().replace(/_/g, " ");
  const loadText = tags.linguisticLoad >= 0.6 ? "high" : tags.linguisticLoad >= 0.35 ? "moderate" : "low";
  return `${difficultyText} difficulty with ${loadText} linguistic demand`;
}
function estimatedStepCount2(tags) {
  return Math.max(1, Math.round(tags.reasoning?.adjustedExpectedSteps ?? tags.reasoning?.expectedSteps ?? tags.steps ?? 1));
}
function buildReasoningSteps(tags) {
  const steps = [];
  const count = estimatedStepCount2(tags);
  if (tags.representation === "graph") {
    steps.push("interpret graph");
  } else if (tags.representation === "table") {
    steps.push("read table");
  } else if (tags.representation === "equation") {
    steps.push("analyze equation");
  } else {
    steps.push("read prompt carefully");
  }
  if (count >= 2) {
    steps.push(`apply ${humanizeKey(tags.domain).toLowerCase()} reasoning`);
  }
  if (count >= 3) {
    steps.push(`use ${dominantBloom(tags)} thinking to justify the answer`);
  }
  while (steps.length < count) {
    steps.push("check the solution against the prompt");
  }
  return steps.slice(0, count);
}
function summarizeScaffolding(tags) {
  const parts = [];
  if (tags.linguisticLoad >= 0.6) {
    parts.push("simplify the wording");
  }
  if (estimatedStepCount2(tags) > 3) {
    parts.push("chunk the work into smaller steps");
  }
  if (tags.representation === "graph") {
    parts.push("annotate the graph before solving");
  }
  return parts.length > 0 ? formatList(parts) : "provide a brief think-aloud before independent work";
}
function summarizeEnrichment(tags) {
  const concepts = dominantConcepts(tags, 2);
  const parts = [];
  if (concepts.length > 0) {
    parts.push(`connect the task to ${formatList(concepts.map((concept) => concept.toLowerCase()))}`);
  }
  if (tags.representation === "equation") {
    parts.push("translate the solution into a graph or table");
  }
  return parts.length > 0 ? formatList(parts) : "extend the reasoning into a new context";
}
function generateNarrativeBundle(tags) {
  const concepts = dominantConcepts(tags, 3);
  const standards = dominantStandards(tags, 3);
  const misconceptions = misconceptionLabels(tags, 3);
  const reasoningSteps = buildReasoningSteps(tags);
  return {
    whatProblemAsks: concepts.length > 0 ? `Students are asked to work with ${formatList(concepts.map((concept) => concept.toLowerCase()))} through ${describeRepresentation(tags)}.` : `Students are asked to solve a ${humanizeKey(tags.domain).toLowerCase()} problem through ${describeRepresentation(tags)}.`,
    reasoningPath: reasoningSteps.join(" -> "),
    studentStruggles: misconceptions.length > 0 ? misconceptions.map((item) => item.toLowerCase()).join(", ") : tags.representationCount > 1 ? "coordinating multiple representations" : "sustaining the reasoning across the full prompt",
    complexity: describeDifficulty(tags),
    skillsTouched: concepts.length > 0 ? concepts.join(", ") : humanizeKey(tags.domain),
    connections: concepts.length > 0 ? concepts.join(", ") : humanizeKey(tags.subject),
    scaffolding: summarizeScaffolding(tags),
    enrichment: summarizeEnrichment(tags),
    standards: standards.join(", "),
    whyThisInterpretation: `This interpretation is based on ${describeRepresentation(tags)}, ${estimatedStepCount2(tags)} expected step${estimatedStepCount2(tags) === 1 ? "" : "s"}, and a dominant ${dominantBloom(tags)} signal.`
  };
}

// src/prism-v4/semantic/generators/scaffolds.ts
function estimatedStepCount3(tags) {
  return Math.max(1, Math.round(tags.reasoning?.adjustedExpectedSteps ?? tags.reasoning?.expectedSteps ?? tags.steps ?? 1));
}
function generateScaffolds(tags) {
  const scaffolds = [];
  if (tags.linguisticLoad >= 0.6) {
    scaffolds.push("Rewrite the prompt in simpler language.");
  }
  if (tags.representation === "graph") {
    scaffolds.push("Highlight key points on the graph before solving.");
  }
  if (estimatedStepCount3(tags) > 3) {
    scaffolds.push("Break the problem into smaller sub-steps.");
  }
  return scaffolds;
}

// src/prism-v4/semantic/postProcessing.ts
function applyPostSemanticProcessing(problem) {
  if (!problem.tags) {
    return problem;
  }
  return {
    ...problem,
    narrative: generateNarrativeBundle(problem.tags),
    scaffolds: generateScaffolds(problem.tags),
    enrichments: generateEnrichments(problem.tags),
    antiCheating: analyzeCheatingVulnerabilities(problem.tags)
  };
}

// src/prism-v4/semantic/structure/detectMultipart.ts
var HTML_SPACE = /&nbsp;|\u00a0/gi;
var PARENT_LABEL = /^(\d+)\s*\.?\s*$/;
var CHILD_LABEL = /^(\d+)\s*([a-z])\s*[\.)]?\s*$/;
function letterIndex(letter) {
  return letter.toLowerCase().charCodeAt(0) - 96;
}
function preserveExistingStructure(problem) {
  if (typeof problem.partIndex === "number" && problem.partIndex > 0) {
    return true;
  }
  return Boolean(problem.parentProblemId || problem.rootProblemId || problem.problemGroupId);
}
function detectMultipart(problems) {
  const parentsByNumber = {};
  for (const problem of problems) {
    if (typeof problem.problemNumber === "number" && (problem.partIndex ?? 0) === 0) {
      parentsByNumber[String(problem.problemNumber)] = problem;
    }
  }
  for (const problem of problems) {
    const label = (problem.teacherLabel ?? "").replace(HTML_SPACE, " ").replace(/\s+/g, " ").trim();
    const parentMatch = label.match(PARENT_LABEL);
    if (parentMatch) {
      const num = parentMatch[1];
      parentsByNumber[num] = problem;
      problem.partIndex = 0;
      problem.parentProblemId = null;
      problem.problemGroupId = problem.problemId;
      problem.rootProblemId = problem.problemId;
      continue;
    }
    const childMatch = label.match(CHILD_LABEL);
    if (childMatch) {
      const num = childMatch[1];
      const letter = childMatch[2];
      const parent = parentsByNumber[num];
      if (parent) {
        problem.partIndex = letterIndex(letter);
        problem.parentProblemId = parent.problemId;
        problem.problemGroupId = parent.problemGroupId ?? parent.problemId;
        problem.rootProblemId = parent.rootProblemId ?? parent.problemId;
        continue;
      }
    }
    if (preserveExistingStructure(problem)) {
      continue;
    }
    problem.partIndex = 0;
    problem.parentProblemId = null;
    problem.problemGroupId = problem.problemId;
    problem.rootProblemId = problem.problemId;
  }
  return problems;
}

// src/prism-v4/semantic/tag/buildProblemTagVector.ts
var FRUSTRATION_FIELD = "frustrationRisk";
function buildProblemTagVector(args) {
  const {
    problems,
    concepts,
    linguistic,
    bloom,
    representation,
    misconceptions,
    standards
  } = args;
  return problems.map((p) => {
    const id = p.problemId;
    const conceptMap = concepts[id] ?? {};
    const linguisticLoad = linguistic.linguisticLoad[id] ?? 0.5;
    const vocabTier = linguistic.vocabularyTier[id] ?? 2;
    const sentenceComplexity = linguistic.sentenceComplexity[id] ?? 0.5;
    const wordProblem = linguistic.wordProblem[id] ?? 0;
    const passiveVoice = linguistic.passiveVoice[id] ?? 0.2;
    const abstractLanguage = linguistic.abstractLanguage[id] ?? 0.2;
    const bloomMap = {
      remember: bloom[id]?.remember ?? 0,
      understand: bloom[id]?.understand ?? 0,
      apply: bloom[id]?.apply ?? 0,
      analyze: bloom[id]?.analyze ?? 0,
      evaluate: bloom[id]?.evaluate ?? 0,
      create: bloom[id]?.create ?? 0
    };
    if (Object.values(bloomMap).every((value) => value === 0)) {
      bloomMap.understand = 1;
    }
    const representationSignals = detectRepresentationSignals({
      text: `${p.stemText ?? ""}
${p.partText ?? ""}
${p.cleanedText ?? p.rawText ?? ""}`,
      hasExtractedTable: p.representation === "table" || representation[id] === "table"
    });
    const repr = representation[id] ?? p.representation ?? representationSignals.representation;
    const representationCount = representationSignals.representationCount;
    const dominantConcept = pickDominantKey(conceptMap, "general.comprehension");
    const subject = dominantConcept.startsWith("math") ? "math" : dominantConcept.startsWith("reading") ? "reading" : dominantConcept.startsWith("science") ? "science" : dominantConcept.startsWith("socialstudies") ? "socialstudies" : "general";
    const domain = dominantConcept.includes(".") ? dominantConcept.split(".").slice(1).join(".") : dominantConcept;
    const contentComplexity = clamp013((linguisticLoad + sentenceComplexity + (p.abstractionLevel ?? 0) + (p.multiStep ?? 0)) / 4);
    const distractorDensity = clamp013((p.answerChoices.length - 1) / 4);
    const baseVector = {
      subject,
      domain,
      concepts: conceptMap,
      problemType: {
        trueFalse: p.problemType === "trueFalse" ? 1 : 0,
        multipleChoice: p.problemType === "multipleChoice" ? 1 : 0,
        multipleSelect: p.problemType === "multipleSelect" ? 1 : 0,
        shortAnswer: p.problemType === "shortAnswer" ? 1 : 0,
        constructedResponse: p.problemType === "constructedResponse" ? 1 : 0,
        fillInBlank: p.problemType === "fillInBlank" ? 1 : 0,
        matching: p.problemType === "matching" ? 1 : 0,
        dragAndDrop: p.problemType === "dragAndDrop" ? 1 : 0,
        graphing: p.problemType === "graphing" ? 1 : 0,
        equationEntry: p.problemType === "equationEntry" ? 1 : 0,
        sorting: p.problemType === "sorting" ? 1 : 0,
        hotSpot: p.problemType === "hotSpot" ? 1 : 0,
        simulationTask: 0,
        primarySourceAnalysis: p.problemType === "primarySourceAnalysis" ? 1 : 0,
        labDesign: p.problemType === "labDesign" ? 1 : 0
      },
      multiStep: p.multiStep,
      steps: p.steps,
      representation: repr,
      representationCount,
      linguisticLoad,
      vocabularyTier: vocabTier,
      sentenceComplexity,
      wordProblem,
      passiveVoice,
      abstractLanguage,
      bloom: bloomMap,
      difficulty: contentComplexity,
      distractorDensity,
      abstractionLevel: p.abstractionLevel,
      computationComplexity: subject === "math" ? clamp013((contentComplexity + (repr === "equation" ? 1 : 0)) / 2) : void 0,
      misconceptionTriggers: misconceptions[id] ?? {},
      engagementPotential: clamp013(0.35 + Object.keys(conceptMap).length * 0.12 + (repr !== "paragraph" ? 0.1 : 0)),
      standards: standards[id] ?? {},
      cognitive: {
        bloom: bloomMap,
        difficulty: contentComplexity,
        linguisticLoad,
        abstractionLevel: p.abstractionLevel,
        multiStep: p.multiStep,
        representationComplexity: clamp013((representationCount - 1) / 3),
        misconceptionRisk: clamp013(Math.max(...Object.values(misconceptions[id] ?? {}), 0))
      }
    };
    const vector = baseVector;
    Object.assign(vector, { [FRUSTRATION_FIELD]: 0.2 });
    return vector;
  });
}

// src/prism-v4/semantic/tag/tagBloom.ts
function tagBloom(problems) {
  const result = {};
  for (const p of problems) {
    const text = (p.cleanedText || p.rawText || "").toLowerCase();
    const scores = {
      remember: 0,
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
      create: 0
    };
    if (/\bdefine\b|\blist\b|\bidentify\b/.test(text))
      scores.remember = 1;
    if (/\bexplain\b|\bsummarize\b|\bdescribe\b/.test(text))
      scores.understand = 1;
    if (/\bsolve\b|\buse\b|\bapply\b/.test(text))
      scores.apply = 1;
    if (/\banalyze\b|\bcompare\b|\bcontrast\b/.test(text))
      scores.analyze = 1;
    if (/\bevaluate\b|\bargue\b|\bjustify\b/.test(text))
      scores.evaluate = 1;
    if (/\bdesign\b|\bcreate\b|\bcompose\b/.test(text))
      scores.create = 1;
    if (Object.values(scores).every((v) => v === 0)) {
      scores.remember = 0.5;
      scores.understand = 0.5;
    }
    result[p.problemId] = scores;
  }
  return result;
}

// src/prism-v4/semantic/tag/tagConcepts.ts
var CONCEPT_RULES = [
  { terms: ["hypothesis", "null", "alternative", "significance"], tag: "math.statistics.hypothesis-testing" },
  { terms: ["p-value", "alpha", "parameter", "statistic"], tag: "math.statistics.decision-rules" },
  { terms: ["simulation", "dotplot", "sampling"], tag: "math.statistics.simulation" },
  { terms: ["proportion", "proportions"], tag: "math.statistics.proportion-test" },
  { terms: ["mean", "means"], tag: "math.statistics.mean-test" },
  { terms: ["type", "false"], tag: "math.statistics.type-errors" },
  { terms: ["fraction", "fractions", "numerator", "denominator"], tag: "math.fractions" },
  { terms: ["equivalent", "equivalent fractions"], tag: "math.equivalent-fractions" },
  { terms: ["decimal", "decimals"], tag: "math.decimals" },
  { terms: ["ratio", "ratios", "proportional"], tag: "math.ratios" },
  { terms: ["equation", "equations", "algebra", "variable", "slope"], tag: "math.algebra" },
  { terms: ["infer", "inference", "evidence", "theme"], tag: "reading.inference" },
  { terms: ["area", "perimeter", "rectangle", "triangle"], tag: "math.geometry" },
  { terms: ["ecosystem", "ecosystems", "producer", "consumer", "decomposer"], tag: "science.ecosystems" },
  { terms: ["cell", "cells", "chloroplast", "photosynthesis"], tag: "science.cells" },
  { terms: ["force", "forces", "motion"], tag: "science.forces" },
  { terms: ["experiment", "hypothesis", "variable"], tag: "science.inquiry" },
  { terms: ["government", "culture", "timeline", "geography", "historical"], tag: "socialstudies.history" },
  { terms: ["source", "author", "document", "speech"], tag: "socialstudies.source-analysis" }
];
function tagConcepts(problems) {
  const result = {};
  for (const p of problems) {
    const text = p.cleanedText || p.rawText || "";
    const lowerText = text.toLowerCase();
    const keywords = extractKeywords(text);
    const conceptScores = {};
    const hasStatisticsSignal = /p-?value|null hypothesis|alternative hypothesis|alpha|α|sample proportion|sample mean|sampling distribution|dotplot|type i|type ii|simulation/.test(lowerText);
    for (const kw of keywords) {
      for (const rule of CONCEPT_RULES) {
        if (hasStatisticsSignal && ["math.decimals", "reading.inference"].includes(rule.tag)) {
          continue;
        }
        if (rule.terms.includes(kw)) {
          conceptScores[rule.tag] = (conceptScores[rule.tag] ?? 0) + 1;
        }
      }
    }
    if (hasStatisticsSignal && /kissing couples|sample proportion|proportion test/.test(lowerText)) {
      conceptScores["math.statistics.proportion-test"] = (conceptScores["math.statistics.proportion-test"] ?? 0) + 2;
    }
    if (hasStatisticsSignal && /restaurant income|construction zone|sample mean|mean test/.test(lowerText)) {
      conceptScores["math.statistics.mean-test"] = (conceptScores["math.statistics.mean-test"] ?? 0) + 2;
    }
    if (Object.keys(conceptScores).length === 0) {
      conceptScores["general.comprehension"] = 1;
    }
    result[p.problemId] = conceptScores;
  }
  return result;
}

// src/prism-v4/semantic/tag/tagLinguisticLoad.ts
function tagLinguisticLoad(problems) {
  const linguisticLoad = {};
  const vocabularyTier = {};
  const sentenceComplexity = {};
  const wordProblem = {};
  const passiveVoice = {};
  const abstractLanguage = {};
  for (const p of problems) {
    const text = p.cleanedText || p.rawText || "";
    const sentences = splitSentences(text);
    const words = text.split(/\s+/).filter(Boolean);
    const avgSentenceLength = sentences.length ? words.length / sentences.length : words.length;
    const avgSyllables = words.length > 0 ? words.reduce((sum, w) => sum + countSyllables2(w), 0) / words.length : 1;
    const load = clamp013((avgSentenceLength / 20 + avgSyllables / 3) / 2);
    linguisticLoad[p.problemId] = load;
    vocabularyTier[p.problemId] = avgSyllables < 1.5 ? 1 : avgSyllables < 2.5 ? 2 : 3;
    sentenceComplexity[p.problemId] = clamp013(avgSentenceLength / 25);
    wordProblem[p.problemId] = /\bstory\b|\bword problem\b|\bscenario\b|\bhow many\b|\bhow much\b/i.test(text) ? 1 : 0;
    passiveVoice[p.problemId] = /\bwas\b\s+\w+ed\b|\bwere\b\s+\w+ed\b/i.test(text) ? 0.7 : 0.1;
    abstractLanguage[p.problemId] = /\bjustice\b|\bfreedom\b|\bidea\b|\bconcept\b/i.test(text) ? 0.8 : 0.2;
  }
  return {
    linguisticLoad,
    vocabularyTier,
    sentenceComplexity,
    wordProblem,
    passiveVoice,
    abstractLanguage
  };
}

// src/prism-v4/semantic/tag/tagMisconceptionTriggers.ts
function tagMisconceptionTriggers(problems) {
  const result = {};
  for (const p of problems) {
    const text = (p.cleanedText || p.rawText || "").toLowerCase();
    const triggers = {};
    if (/\bfraction\b|\bfractions\b/.test(text) && /\bgreater\b|\bless\b/.test(text)) {
      triggers["fractionMagnitude"] = 0.8;
    }
    if (/\barea\b/.test(text) && /\bperimeter\b/.test(text)) {
      triggers["areaVsPerimeter"] = 0.9;
    }
    if (/\bnegative\b|\bminus\b/.test(text) && /\bsubtract\b/.test(text)) {
      triggers["integerSubtraction"] = 0.7;
    }
    if (/\binfer\b|\binference\b/.test(text) && /\bevidence\b/.test(text)) {
      triggers["evidenceVsOpinion"] = 0.65;
    }
    result[p.problemId] = triggers;
  }
  return result;
}

// src/prism-v4/semantic/tag/tagRepresentation.ts
function tagRepresentation(problems) {
  const result = {};
  for (const p of problems) {
    if (p.representation) {
      result[p.problemId] = p.representation;
      continue;
    }
    const text = (p.cleanedText || p.rawText || "").toLowerCase();
    if (/\bgraph\b|\bchart\b|\bplot\b/.test(text)) {
      result[p.problemId] = "graph";
    } else if (/\btable\b|\brow\b|\bcolumn\b/.test(text)) {
      result[p.problemId] = "table";
    } else if (/\bdiagram\b|\billustration\b/.test(text)) {
      result[p.problemId] = "diagram";
    } else if (/\bmap\b/.test(text)) {
      result[p.problemId] = "map";
    } else if (/\btimeline\b/.test(text)) {
      result[p.problemId] = "timeline";
    } else if (/\bexperiment\b|\blab\b/.test(text)) {
      result[p.problemId] = "experiment";
    } else if (/\bprimary source\b|\bexcerpt\b/.test(text)) {
      result[p.problemId] = "primarySource";
    } else if (/\bequation\b|\bsolve for\b|\b=\b/.test(text)) {
      result[p.problemId] = "equation";
    } else {
      result[p.problemId] = "paragraph";
    }
  }
  return result;
}

// src/prism-v4/semantic/tag/tagStandards.ts
function tagStandards(problems) {
  const result = {};
  for (const p of problems) {
    const text = (p.cleanedText || p.rawText || "").toLowerCase();
    const standards = {};
    if (/\bfraction\b|\bfractions\b/.test(text)) {
      standards["CCSS.MATH.CONTENT.4.NF.B.3"] = 0.8;
    }
    if (/\binference\b|\binfer\b/.test(text)) {
      standards["CCSS.ELA-LITERACY.RL.4.1"] = 0.7;
    }
    if (/\bexperiment\b|\bhypothesis\b/.test(text)) {
      standards["NGSS.3-5-ETS1-3"] = 0.7;
    }
    result[p.problemId] = standards;
  }
  return result;
}

// src/prism-v4/semantic/pipeline/runSemanticPipeline.ts
function toCanonicalProblem(documentId, problem, tags) {
  return {
    problemId: problem.problemId,
    localProblemId: problem.localProblemId ?? problem.problemId,
    problemGroupId: problem.problemGroupId ?? problem.rootProblemId ?? problem.problemId,
    canonicalProblemId: `${documentId}::${problem.problemId}`,
    rootProblemId: problem.rootProblemId,
    parentProblemId: problem.parentProblemId,
    problemNumber: problem.problemNumber,
    partIndex: problem.partIndex,
    partLabel: problem.partLabel,
    teacherLabel: problem.teacherLabel,
    stemText: problem.stemText,
    partText: problem.partText,
    displayOrder: problem.displayOrder,
    createdAt: problem.createdAt,
    rawText: problem.rawText,
    cleanedText: problem.cleanedText,
    mediaUrls: problem.mediaUrls,
    correctAnswer: problem.correctAnswer,
    rubric: problem.rubric,
    sourceType: problem.sourceType,
    sourceDocumentId: problem.sourceDocumentId,
    sourcePageNumber: problem.sourcePageNumber,
    tags
  };
}
async function runSemanticPipeline(input) {
  const learningRecords = await loadTemplateLearning();
  const extractedProblems = detectMultipart(extractProblems(input.azureExtract));
  const tablesByProblemId = extractTables(input.azureExtract, extractedProblems);
  const problems = extractProblemMetadata(extractedProblems, tablesByProblemId);
  const multipartParentIds = new Set(problems.filter((candidate) => candidate.parentProblemId).map((candidate) => candidate.parentProblemId));
  const concepts = tagConcepts(problems);
  const linguistic = tagLinguisticLoad(problems);
  const bloom = tagBloom(problems);
  const representation = tagRepresentation(problems);
  const misconceptions = tagMisconceptionTriggers(problems);
  const standards = tagStandards(problems);
  const problemVectors = buildProblemTagVector({
    problems,
    concepts,
    linguistic,
    bloom,
    representation,
    misconceptions,
    standards
  });
  const enrichedProblems = await Promise.all(problems.map(async (problem, index) => {
    const azureTags = problemVectors[index];
    const seedProblem = {
      ...problem,
      tags: azureTags
    };
    const structural = inferStructuralCognition(seedProblem, {
      isMultipartParent: multipartParentIds.has(problem.problemId)
    });
    const teacherTemplates = applyLearningAdjustments(await listTeacherDerivedTemplates(azureTags.subject, azureTags.domain), learningRecords);
    const subjectTemplates = applyLearningAdjustments(pickTemplatesForSubject(azureTags.subject), learningRecords);
    const subjectTemplateMatches = getTemplateMatches(seedProblem, subjectTemplates);
    const teacherTemplateMatches = getTemplateMatches(seedProblem, teacherTemplates);
    const prioritizedMatches = getPrioritizedTemplateMatches(seedProblem, subjectTemplates, teacherTemplates);
    const primaryMatch = prioritizedMatches[0];
    const matchedSubjectTemplates = subjectTemplateMatches.map((result) => result.template);
    const matchedTeacherTemplates = teacherTemplateMatches.map((result) => result.template);
    const domainTemplate = applyTemplates(seedProblem, subjectTemplates);
    const teacherTemplate = applyTemplates(seedProblem, teacherTemplates);
    const selectedStepMatch = prioritizedMatches.find((result) => result.template.stepHints);
    const stepReasoning = selectedStepMatch?.template.stepHints ? {
      templateExpectedSteps: selectedStepMatch.template.stepHints.expectedSteps,
      templateConfidence: selectedStepMatch.confidence,
      templateIsBestGuess: selectedStepMatch.isBestGuess,
      stepType: selectedStepMatch.template.stepHints.stepType,
      templateId: selectedStepMatch.template.id,
      templateSource: selectedStepMatch.source === "teacher" ? "teacher" : "subject"
    } : void 0;
    const useTeacherTemplateAsPrimary = primaryMatch?.source === "teacher";
    const template = {
      ...useTeacherTemplateAsPrimary ? domainTemplate : {},
      ...useTeacherTemplateAsPrimary ? teacherTemplate : domainTemplate,
      bloom: {
        remember: useTeacherTemplateAsPrimary ? teacherTemplate.bloom?.remember ?? domainTemplate.bloom?.remember ?? 0 : domainTemplate.bloom?.remember ?? 0,
        understand: useTeacherTemplateAsPrimary ? teacherTemplate.bloom?.understand ?? domainTemplate.bloom?.understand ?? 0 : domainTemplate.bloom?.understand ?? 0,
        apply: useTeacherTemplateAsPrimary ? teacherTemplate.bloom?.apply ?? domainTemplate.bloom?.apply ?? 0 : domainTemplate.bloom?.apply ?? 0,
        analyze: useTeacherTemplateAsPrimary ? teacherTemplate.bloom?.analyze ?? domainTemplate.bloom?.analyze ?? 0 : domainTemplate.bloom?.analyze ?? 0,
        evaluate: useTeacherTemplateAsPrimary ? teacherTemplate.bloom?.evaluate ?? domainTemplate.bloom?.evaluate ?? 0 : domainTemplate.bloom?.evaluate ?? 0,
        create: useTeacherTemplateAsPrimary ? teacherTemplate.bloom?.create ?? domainTemplate.bloom?.create ?? 0 : domainTemplate.bloom?.create ?? 0
      },
      reasoning: stepReasoning
    };
    const cognitive = fuseCognition(azureTags, structural, template);
    const internalReasoning = buildInternalProblemReasoning(structural, template);
    const canonicalProblemId = `${input.documentId}::${problem.problemId}`;
    const overrides = await getProblemOverride(canonicalProblemId);
    const overriddenProblem = fuseOverrides({
      ...seedProblem,
      canonicalProblemId,
      reasoning: internalReasoning,
      tags: {
        ...azureTags,
        cognitive,
        reasoning: {
          azureBloom: azureTags.bloom,
          structuralBloom: structural.bloom ?? {},
          templateIds: matchedSubjectTemplates.map((template2) => template2.id),
          teacherTemplateIds: matchedTeacherTemplates.map((template2) => template2.id),
          overridesApplied: Boolean(overrides),
          structuralMultiStep: structural.multiStep,
          selectedTemplateId: primaryMatch?.template.id,
          selectedTemplateName: primaryMatch?.template.name,
          selectedTemplateSource: primaryMatch?.source,
          selectedTemplateStatus: primaryMatch?.template.learningAdjustment?.status ?? "stable",
          selectedTemplateFrozen: primaryMatch?.template.learningAdjustment?.frozen ?? false,
          templateConfidence: typeof primaryMatch?.baseConfidence === "number" ? primaryMatch.baseConfidence : void 0,
          adjustedTemplateConfidence: typeof primaryMatch?.confidence === "number" ? primaryMatch.confidence : void 0,
          expectedSteps: selectedStepMatch?.template.learningAdjustment?.originalExpectedSteps ?? selectedStepMatch?.template.stepHints?.expectedSteps,
          adjustedExpectedSteps: selectedStepMatch?.template.stepHints?.expectedSteps
        }
      }
    }, overrides);
    return {
      problem: overriddenProblem,
      vector: overriddenProblem.tags
    };
  }));
  const enrichedProblemVectors = enrichedProblems.map((entry) => entry.vector);
  const taggedProblems = enrichedProblems.map((entry) => applyPostSemanticProcessing(toCanonicalProblem(input.documentId, entry.problem, entry.vector)));
  const conceptGraph = buildConceptGraph(enrichedProblemVectors, enrichedProblems);
  const documentInsights = buildDocumentInsights({
    documentId: input.documentId,
    azureExtract: input.azureExtract,
    problems: taggedProblems,
    problemVectors: enrichedProblemVectors,
    conceptGraph
  });
  return {
    documentId: input.documentId,
    documentInsights,
    problems: taggedProblems,
    problemVectors: enrichedProblemVectors
  };
}

// src/prism-v4/semantic/segment/hybridSegmenter.ts
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

// api/v4/simulator/shared.ts
function buildAzureExtractFromRow(row) {
  const ae = row.azure_extract;
  if (ae && (ae.content || ae.paragraphs?.length || ae.pages?.length)) {
    return ae;
  }
  const nodes = row.canonical_document?.nodes;
  if (nodes && nodes.length > 0) {
    const texts = nodes.filter((n) => n.nodeType !== "tableRow" && n.nodeType !== "table" && n.nodeType !== "inline").map((n) => n.text ?? n.normalizedText ?? "").filter(Boolean);
    if (texts.length > 0) {
      console.log(`[buildAzureExtractFromRow] synthesizing azure extract from ${texts.length} canonical node(s) (azure_extract was empty)`);
      return {
        content: texts.join("\n\n"),
        paragraphs: texts.map((t) => ({ text: t })),
        pages: [{ text: texts.join("\n"), pageNumber: 1 }]
      };
    }
  }
  const paras = row.canonical_document?.paragraphs;
  if (paras && paras.length > 0) {
    const texts = paras.map((p) => p.text ?? "").filter(Boolean);
    if (texts.length > 0) {
      console.log(`[buildAzureExtractFromRow] synthesizing azure extract from ${texts.length} canonical paragraph(s)`);
      return {
        content: texts.join("\n\n"),
        paragraphs: texts.map((t) => ({ text: t }))
      };
    }
  }
  return {};
}
var PROFILE_CATALOG = [
  { id: "average", label: "Average Student", color: "#3b82f6" },
  { id: "adhd", label: "ADHD Profile", color: "#f97316" },
  { id: "dyslexia", label: "Dyslexia Profile", color: "#22c55e" },
  { id: "ell", label: "ELL Profile", color: "#a855f7" },
  { id: "gifted", label: "Gifted / Fast", color: "#eab308" }
];
function computeConfusionScore(m, states) {
  const stepsNorm = Math.min((m.steps ?? 1) / 5, 1);
  const timeNorm = Math.min((m.timeToProcessSeconds ?? 0) / 30, 1);
  const raw = 0.4 * (m.linguisticLoad ?? 0) + 0.2 * (m.distractorDensity ?? 0) + 0.15 * stepsNorm + 0.15 * (states.misconceptionRisk ?? 0) + 0.1 * timeNorm;
  return Math.min(Math.max(raw, 0), 1);
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
async function runSemanticOnText(text, documentId = "synthetic") {
  console.log(`[runSemanticOnText] doc=${documentId} wc=${text.split(/\s+/).filter(Boolean).length}`);
  const syntheticExtract = {
    fileName: "segment",
    content: text,
    pages: [{ pageNumber: 1, text }],
    paragraphs: [{ text, pageNumber: 1 }],
    tables: [],
    readingOrder: []
  };
  try {
    const output = await runSemanticPipeline({
      documentId,
      fileName: "segment",
      azureExtract: syntheticExtract
    });
    const vec = output.problemVectors?.[0] ?? null;
    console.log(`[runSemanticOnText] doc=${documentId} \u2192 ${vec ? "vector OK" : "NO vector (null)"}`);
    return vec;
  } catch (err) {
    console.warn("[runSemanticOnText] pipeline failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
function applyPhaseADefaults(item) {
  return {
    ...item,
    branchingFactor: item.branchingFactor ?? 0,
    scaffoldLevel: item.scaffoldLevel ?? 0,
    ambiguityScore: item.ambiguityScore ?? 0,
    planningLoad: item.planningLoad ?? 0,
    writingMode: item.writingMode ?? "Describe",
    expectedResponseLength: item.expectedResponseLength ?? 0,
    conceptDensity: item.conceptDensity ?? 0,
    reasoningSteps: item.reasoningSteps ?? 0,
    subQuestionCount: item.subQuestionCount ?? 0,
    isMultiPartItem: item.isMultiPartItem ?? false,
    isMultipleChoice: item.isMultipleChoice ?? false,
    distractorCount: item.distractorCount ?? 0
  };
}
function countSyllables3(word) {
  return (word.toLowerCase().match(/[aeiouy]+/g) ?? []).length || 1;
}
function syllableVocabLevel(word) {
  const s = countSyllables3(word);
  if (s <= 1)
    return 1;
  if (s === 2)
    return 2;
  return 3;
}
function computeVocabStats(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { vocabCounts: { level1: 0, level2: 0, level3: 0 }, avgVocabLevel: 1, avgWordLength: 4 };
  }
  const levels = words.map(syllableVocabLevel);
  const vocabCounts = {
    level1: levels.filter((l) => l === 1).length,
    level2: levels.filter((l) => l === 2).length,
    level3: levels.filter((l) => l === 3).length
  };
  const avgVocabLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
  const avgWordLength = words.reduce((a, w) => a + w.length, 0) / words.length;
  return { vocabCounts, avgVocabLevel, avgWordLength };
}
var BLOOMS_KEYWORDS2 = {
  create: ["create", "design", "construct", "develop", "formulate", "compose", "invent", "generate", "produce", "plan", "build", "propose"],
  evaluate: ["evaluate", "justify", "critique", "argue", "assess", "defend", "support", "judge", "recommend", "prioritize", "verify", "validate", "debate"],
  analyze: ["analyze", "differentiate", "categorize", "examine", "investigate", "organize", "structure", "attribute", "diagram", "map", "inspect", "compare", "contrast"],
  apply: ["apply", "use", "solve", "compute", "calculate", "demonstrate", "perform", "execute", "implement", "operate", "model", "show", "carry out"],
  understand: ["explain", "summarize", "describe", "interpret", "classify", "paraphrase", "outline", "discuss", "report", "restate", "illustrate"],
  remember: ["identify", "list", "define", "recall", "name", "label", "match", "select", "state", "recognize", "repeat", "choose", "find", "underline", "point", "circle", "highlight"]
};
function computeBloomsLevel2(text) {
  const lower = text.toLowerCase();
  const hit = (kws) => kws.some((kw) => lower.includes(kw));
  if (hit(BLOOMS_KEYWORDS2.create))
    return { level: 6, label: "Create" };
  if (hit(BLOOMS_KEYWORDS2.evaluate))
    return { level: 5, label: "Evaluate" };
  if (hit(BLOOMS_KEYWORDS2.analyze))
    return { level: 4, label: "Analyze" };
  if (hit(BLOOMS_KEYWORDS2.apply))
    return { level: 3, label: "Apply" };
  if (hit(BLOOMS_KEYWORDS2.understand))
    return { level: 2, label: "Understand" };
  if (hit(BLOOMS_KEYWORDS2.remember))
    return { level: 1, label: "Remember" };
  return { level: 2, label: "Understand" };
}
function computeSentenceStats(text) {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const sentenceCount = Math.max(1, sentences.length);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return { sentenceCount, avgSentenceLength: Math.round(wordCount / sentenceCount * 10) / 10 };
}
function computeSymbolDensity(text) {
  if (!text)
    return 0;
  const symbols = (text.match(/[+\-*/=<>()[\]{}\^%÷×∑∫√≤≥≠±]/g) ?? []).length;
  return Math.min(symbols / Math.max(text.length, 1), 1);
}
function vectorToMeasurables(vec, text) {
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const wordCount = text.split(/\s+/).filter(Boolean).length || 10;
  const steps = Math.max(1, Math.round(vec.steps ?? 1));
  const timeToProcessSeconds = Math.max(5, Math.round(wordCount / 3.3 + steps * 8));
  const triggerValues = Object.values(vec.misconceptionTriggers ?? {});
  const misconceptionRisk = clamp(triggerValues.length > 0 ? Math.max(...triggerValues) : 0);
  const distractorDensity = clamp(vec.distractorDensity ?? 0);
  const { vocabCounts, avgVocabLevel, avgWordLength } = computeVocabStats(text);
  const normalizedVocab = (avgVocabLevel - 1) / 2;
  const normalizedWordLen = Math.min(avgWordLength / 10, 1);
  const linguisticLoad = clamp(0.6 * normalizedVocab + 0.4 * normalizedWordLen);
  const { level: bloomsLevel, label: bloomsLabel } = computeBloomsLevel2(text);
  const { sentenceCount, avgSentenceLength } = computeSentenceStats(text);
  const symbolDensity = computeSymbolDensity(text);
  return {
    linguisticLoad,
    avgVocabLevel,
    avgWordLength,
    vocabCounts,
    misconceptionRisk,
    distractorDensity,
    steps,
    timeToProcessSeconds,
    wordCount,
    confusionScore: computeConfusionScore({ linguisticLoad, distractorDensity, steps, timeToProcessSeconds }, { misconceptionRisk }),
    bloomsLevel,
    bloomsLabel,
    sentenceCount,
    avgSentenceLength,
    symbolDensity
  };
}

// api/v4/simulator/shortcircuit.ts
var runtime = "nodejs";
var maxDuration = 60;
var PROFILE_LOAD_MODIFIERS = {
  average: { linguistic: 1, confusion: 1, time: 1 },
  adhd: { linguistic: 1.15, confusion: 1.25, time: 0.85 },
  dyslexia: { linguistic: 1.4, confusion: 1.15, time: 1.5 },
  ell: { linguistic: 1.5, confusion: 1.3, time: 1.4 },
  gifted: { linguistic: 0.7, confusion: 0.75, time: 0.7 }
};
function clamp014(value) {
  return Math.max(0, Math.min(1, value));
}
function computeDocumentConfidence(diagnosticsList) {
  if (diagnosticsList.length === 0) {
    return 1;
  }
  let total = 0;
  for (const diagnostics of diagnosticsList) {
    let score = 1;
    if (diagnostics.answerKeyDetected) {
      score -= 0.22;
    }
    if (diagnostics.answerKeyLinesRemoved > 0) {
      score -= Math.min(0.18, diagnostics.answerKeyLinesRemoved * 0.02);
    }
    if (diagnostics.pageFurnitureLinesRemoved > 0) {
      score -= Math.min(0.15, diagnostics.pageFurnitureLinesRemoved * 0.03);
    }
    if (diagnostics.dedupedItems > 0) {
      score -= Math.min(0.1, diagnostics.dedupedItems * 0.02);
    }
    if (diagnostics.fallbackUsed) {
      score -= 0.15;
    }
    total += clamp014(score);
  }
  return clamp014(total / diagnosticsList.length);
}
function assignLogicalLabels(itemTrees) {
  const realItems = itemTrees.map((t) => t.item);
  realItems.forEach((item, idx) => {
    item.logicalNumber = idx + 1;
  });
  itemTrees.forEach((tree) => {
    const parentLogical = tree.item.logicalNumber ?? 0;
    if (tree.subItems && tree.subItems.length > 0) {
      tree.subItems.forEach((sub, subIdx) => {
        sub.logicalNumber = parentLogical;
        sub.logicalLabel = `${parentLogical}${String.fromCharCode(97 + subIdx)}`;
      });
      tree.item.logicalLabel = `${parentLogical}`;
    } else {
      tree.item.logicalLabel = `${parentLogical}`;
    }
  });
  return itemTrees;
}
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
  const { sessionId, profiles: rawProfiles } = body ?? {};
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }
  const requestedProfiles = Array.isArray(rawProfiles) && rawProfiles.length > 0 ? rawProfiles : ["average"];
  try {
    const rows = await supabaseRest("prism_v4_documents", {
      select: "document_id,source_file_name,azure_extract,canonical_document",
      filters: { session_id: `eq.${sessionId}` }
    });
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        error: "No documents found for this session. Upload a document first."
      });
    }
    console.log(`[shortcircuit] session=${sessionId} docs=${rows.length}`);
    rows.forEach((r, i) => {
      const paras = r.azure_extract?.paragraphs?.length ?? 0;
      const pages = r.azure_extract?.pages?.length ?? 0;
      const chars = r.azure_extract?.content?.length ?? 0;
      console.log(`[shortcircuit] doc[${i}] id=${r.document_id} file=${r.source_file_name ?? "?"} paras=${paras} pages=${pages} content=${chars}chars`);
    });
    const rawItems = [];
    const segmentationDiagnostics = [];
    let itemOffset = 0;
    for (const row of rows) {
      const azure = buildAzureExtractFromRow(row);
      const segmented = await segmentTextWithDiagnostics(azure);
      const docItems = segmented.items;
      segmentationDiagnostics.push(segmented.diagnostics);
      console.log(`[shortcircuit] doc=${row.document_id} \u2192 ${docItems.length} segment(s)`);
      for (const item of docItems) {
        rawItems.push({ itemNumber: itemOffset + item.itemNumber, text: item.text });
      }
      itemOffset += docItems.length;
    }
    console.log(`[shortcircuit] total rawItems after segmentation: ${rawItems.length}`);
    if (rawItems.length === 0) {
      const fullText = rows.map(extractFullText).filter(Boolean).join("\n\n---\n\n");
      if (!fullText.trim()) {
        return res.status(422).json({ error: "No readable text found in the stored documents." });
      }
      return res.status(422).json({ error: "Segmentation produced no items." });
    }
    const sectioning = buildSections(rawItems.map((seg) => ({ itemNumber: seg.itemNumber, text: seg.text })));
    const items = [];
    for (const seg of sectioning.itemBlocks) {
      console.log(`[shortcircuit] item ${seg.itemNumber}: running semantic pipeline (${seg.text.length} chars)`);
      const vec = await runSemanticOnText(seg.text);
      if (!vec) {
        console.warn(`[shortcircuit] item ${seg.itemNumber}: semantic pipeline returned null \u2014 skipped`);
        continue;
      }
      const m = vectorToMeasurables(vec, seg.text);
      console.log(`[shortcircuit] item ${seg.itemNumber}: linguistic=${m.linguisticLoad.toFixed(2)} confusion=${m.confusionScore.toFixed(2)} steps=${m.steps}`);
      items.push({
        itemNumber: seg.itemNumber,
        text: seg.text,
        ...m
      });
    }
    console.log(`[shortcircuit] done: ${items.length}/${rawItems.length} items with measurables`);
    if (items.length === 0) {
      return res.status(422).json({
        error: "Local semantic pipeline produced no measurables. Check that documents have analysed content."
      });
    }
    const itemsWithDefaults = items.map(applyPhaseADefaults);
    const baseItemTrees = itemsWithDefaults.map((item) => buildItemTree(item));
    const instructionsByItem = /* @__PURE__ */ new Map();
    for (const section of sectioning.sections) {
      for (const itemNumber of section.itemNumbers) {
        instructionsByItem.set(itemNumber, section.instructions);
      }
    }
    const itemTrees = assignLogicalLabels(baseItemTrees.map((tree) => {
      const instructions = instructionsByItem.get(tree.item.itemNumber) ?? [];
      const item = applySectionInstructionEffects(tree.item, instructions);
      const subItems = tree.subItems?.map((sub) => applySectionInstructionEffects(sub, instructions));
      return { ...tree, item, subItems };
    }));
    const itemsWithTreesApplied = itemTrees.map((tree) => tree.item);
    const sections = sectioning.sections.map((section) => ({
      ...section,
      itemTrees: itemTrees.filter((tree) => sectioning.itemToSectionId.get(tree.item.itemNumber) === section.id)
    }));
    const documentConfidence = computeDocumentConfidence(segmentationDiagnostics);
    const profileResults = requestedProfiles.map((profileId) => {
      const catalog = PROFILE_CATALOG.find((p) => p.id === profileId);
      const mods = PROFILE_LOAD_MODIFIERS[profileId] ?? PROFILE_LOAD_MODIFIERS["average"];
      const profileItems = itemsWithTreesApplied.map((item) => ({
        ...item,
        linguisticLoad: Math.min(1, item.linguisticLoad * mods.linguistic),
        confusionScore: Math.min(1, item.confusionScore * mods.confusion),
        timeToProcessSeconds: Math.round(item.timeToProcessSeconds * mods.time)
      }));
      const profileItemTrees = assignLogicalLabels(profileItems.map((item) => buildItemTree(item)).map((tree) => {
        const instructions = instructionsByItem.get(tree.item.itemNumber) ?? [];
        const item = applySectionInstructionEffects(tree.item, instructions);
        const subItems = tree.subItems?.map((sub) => applySectionInstructionEffects(sub, instructions));
        return { ...tree, item, subItems };
      }));
      return {
        profileId,
        profileLabel: catalog?.label ?? profileId,
        color: catalog?.color ?? "#3b82f6",
        items: profileItemTrees.map((tree) => tree.item),
        itemTrees: profileItemTrees
      };
    });
    return res.status(200).json({
      rawItems,
      documentConfidence,
      items: itemsWithTreesApplied,
      itemTrees,
      sections,
      profiles: profileResults
    });
  } catch (err) {
    console.error("[shortcircuit] ERROR:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Internal error"
    });
  }
}
function extractFullText(row) {
  const nodes = row.canonical_document?.nodes;
  if (nodes && nodes.length > 0) {
    return nodes.map((n) => n.text ?? n.normalizedText ?? "").filter(Boolean).join("\n");
  }
  const azureContent = row.azure_extract?.content;
  if (azureContent)
    return azureContent;
  const paras = row.azure_extract?.paragraphs;
  if (paras && paras.length > 0) {
    return paras.map((p) => p.text ?? "").filter(Boolean).join("\n");
  }
  const pages = row.azure_extract?.pages;
  if (pages && pages.length > 0) {
    return pages.map((p) => p.text ?? "").filter(Boolean).join("\n");
  }
  return "";
}
export {
  computeConfusionScore,
  handler as default,
  maxDuration,
  runtime
};
