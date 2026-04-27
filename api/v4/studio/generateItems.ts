"use strict";
/* Bundled by esbuild — do not edit */

// src/components_new/v4/assessment/promptLibrary.ts
var SYSTEM_PROMPT = `You are an expert assessment writer.
Your job is to generate high-quality, classroom-ready assessment items aligned to a specific concept.

Rules:
- Follow the requested item type exactly.
- Follow the requested difficulty exactly.
- Use the provided concept definition and examples.
- Use the provided scenario style if included.
- Do NOT repeat stems across items.
- Do NOT create trick questions.
- Do NOT reference these instructions in your output.
- Output ONLY valid JSON \u2014 a JSON array with no surrounding markdown fences.`;
var ITEM_TYPE_GUIDELINES = {
  mc: `Write a multiple-choice question with:
- 1 correct answer
- 3 plausible distractors
- No "all of the above"
- No repeated phrasing across options
- No trick wording

Difficulty rules:
- easy: direct recall or simple interpretation
- medium: apply the concept in a realistic scenario
- hard: multi-step reasoning or subtle misconception trap`,
  short_answer: `Write a short-answer question requiring:
- 1\u20132 sentences to answer
- A clear, unambiguous correct answer
- No multiple choice options
- No long explanations in the stem`,
  frq: `Write a free-response question requiring:
- Multi-step reasoning
- Explanation of thinking
- Application of the concept in a realistic scenario
- A model answer of 3\u20136 sentences`
};

// src/components_new/v4/assessment/scenarioStyles.ts
var UNIVERSAL_SCENARIOS = [
  "medical testing (e.g., drug trials, diagnostic accuracy)",
  "sports analytics (e.g., performance metrics, win/loss data)",
  "public health (e.g., infection rates, vaccination coverage)",
  "consumer product testing (e.g., defect rates, quality control)",
  "education / classroom data (e.g., test scores, attendance)",
  "environmental science (e.g., pollution levels, temperature readings)",
  "business decision-making (e.g., sales conversion, marketing effectiveness)",
  "transportation (e.g., commute times, accident rates, fuel efficiency)",
  "agriculture (e.g., crop yield, germination rates, pesticide effectiveness)"
];
var SUBJECT_SCENARIOS = {
  statistics: [
    "clinical trials and hypothesis testing",
    "manufacturing quality control",
    "A/B testing for web products",
    "agricultural experiments and yield analysis",
    "sports performance analysis"
  ],
  biology: [
    "ecosystem changes and biodiversity",
    "cell processes and metabolic pathways",
    "genetics and inheritance patterns",
    "human physiology lab data",
    "microbiology lab results and colony counts"
  ],
  ela: [
    "literary analysis of short stories",
    "character motivation in novels",
    "theme development across chapters",
    "author's purpose in non-fiction",
    "comparing two texts on the same topic"
  ],
  chemistry: [
    "reaction rate experiments",
    "titration lab results",
    "gas law applications",
    "solution concentration problems"
  ],
  physics: [
    "projectile motion scenarios",
    "energy transfer in mechanical systems",
    "circuit analysis",
    "wave and optics experiments"
  ],
  history: [
    "primary source analysis",
    "cause and effect of historical events",
    "comparing perspectives from different groups",
    "evaluating historical significance"
  ]
};
function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = h * 31 + s.charCodeAt(i) >>> 0;
  }
  return h;
}
function pickScenario(subject, seed) {
  const subjectKey = subject?.toLowerCase();
  const subjectList = subjectKey && SUBJECT_SCENARIOS[subjectKey] ? SUBJECT_SCENARIOS[subjectKey] : [];
  const combined = [...UNIVERSAL_SCENARIOS, ...subjectList];
  if (!seed) {
    return combined[Math.floor(Math.random() * combined.length)] ?? combined[0];
  }
  return combined[hashString(seed) % combined.length] ?? combined[0];
}

// src/components_new/v4/assessment/difficultyRules.ts
function difficultyToTime(type, difficulty) {
  const times = {
    mc: { easy: 45, medium: 60, hard: 75 },
    short_answer: { easy: 60, medium: 90, hard: 120 },
    frq: { easy: 150, medium: 210, hard: 300 }
  };
  return times[type]?.[difficulty] ?? 60;
}

// src/components_new/v4/assessment/itemTypeMapping.ts
var ITEM_TYPE_BY_CANONICAL = {
  "stats.null_hypothesis": ["mc", "short_answer"],
  "stats.alternative_hypothesis": ["mc", "short_answer"],
  "stats.p_value": ["mc", "short_answer", "frq"],
  "stats.decision_rule": ["mc", "short_answer"],
  "stats.significance_level": ["mc", "short_answer"],
  "stats.one_proportion_test": ["mc", "short_answer", "frq"],
  "stats.type_i_error": ["mc", "short_answer"],
  "stats.type_ii_error": ["mc", "short_answer"],
  "bio.photosynthesis": ["mc", "short_answer", "frq"],
  "bio.light_reactions": ["mc", "short_answer"],
  "bio.calvin_cycle": ["mc", "short_answer"],
  "bio.chloroplast": ["mc", "short_answer"],
  "bio.cellular_respiration": ["mc", "short_answer", "frq"],
  "bio.glycolysis": ["mc", "short_answer"],
  "bio.atp_synthesis": ["mc", "short_answer", "frq"],
  "bio.krebs_cycle": ["mc", "short_answer"],
  "bio.ecosystem": ["mc", "short_answer", "frq"],
  "bio.food_chain": ["mc", "short_answer"],
  "bio.energy_flow": ["mc", "short_answer", "frq"],
  "ela.narrative_structure": ["mc", "short_answer", "frq"],
  "ela.plot": ["mc", "short_answer"],
  "ela.conflict": ["mc", "short_answer", "frq"],
  "ela.point_of_view": ["mc", "short_answer"],
  "ela.figurative_language": ["mc", "short_answer", "frq"],
  "ela.metaphor": ["mc", "short_answer"],
  "ela.simile": ["mc", "short_answer"],
  "ela.symbolism": ["mc", "short_answer", "frq"],
  "ela.theme": ["short_answer", "frq"],
  "ela.motif": ["short_answer", "frq"],
  "ela.characterization": ["mc", "short_answer", "frq"]
};
var DEFAULT_TYPES = ["mc", "short_answer"];
function allowedTypesForConcept(canonicalId) {
  return ITEM_TYPE_BY_CANONICAL[canonicalId] ?? DEFAULT_TYPES;
}

// src/components_new/v4/steps/conceptStepRange.ts
var DEFAULT_STEP_RANGE = [2, 4];
function getConceptStepRange(concept) {
  return concept?.typicalStepRange ?? DEFAULT_STEP_RANGE;
}

// src/components_new/v4/steps/structureParser.ts
function detectDistribution(text) {
  return /distribut|expand|foil|\d\s*\([^)]+[+\-][^)]+\)/i.test(text) ? 1 : 0;
}
function detectCombiningLikeTerms(text) {
  return /combin\w* like|simplif\w* express|collect\w* term/i.test(text) ? 1 : 0;
}
function detectMovingTerms(text) {
  return /move\w* term|add .+ to both|subtract .+ from both|bring .+ to/i.test(text) ? 1 : 0;
}
function detectIsolateVariable(text) {
  return /isolat\w* (the )?(variable|x|y|z|n)|solv\w* for/i.test(text) ? 1 : 0;
}
function detectEvaluateExpression(text) {
  return /evaluat\w* (the )?express|calculat\w* the value|find the value of/i.test(text) ? 1 : 0;
}
function detectComputeTestStatistic(text) {
  return /test statistic|z-score|t-score|compute (the )?(z|t)\b/i.test(text) ? 1 : 0;
}
function detectComputePValue(text) {
  return /p-value|p value|probability (of|that) .+ occur/i.test(text) ? 1 : 0;
}
function detectInterpretResult(text) {
  return /interpret\w*|conclude|reject (the )?null|fail to reject|what does .+ (tell|suggest|indicate)/i.test(text) ? 1 : 0;
}
function detectIdentifyClaim(text) {
  return /identif\w* (the )?claim|central argument|author.{0,20}claim|author.{0,20}assert/i.test(text) ? 1 : 0;
}
function detectIdentifyEvidence(text) {
  return /identif\w* (the )?evidence|support\w* (detail|claim|argument)|textual evidence/i.test(text) ? 1 : 0;
}
function detectConnectReasoning(text) {
  return /connect\w* .{0,20}reasoning|explain how .{0,20}support|how does .{0,20}develop|logical connection/i.test(text) ? 1 : 0;
}
function countOperations(text) {
  return detectDistribution(text) + detectCombiningLikeTerms(text) + detectMovingTerms(text) + detectIsolateVariable(text) + detectEvaluateExpression(text) + detectComputeTestStatistic(text) + detectComputePValue(text) + detectInterpretResult(text) + detectIdentifyClaim(text) + detectIdentifyEvidence(text) + detectConnectReasoning(text);
}
function countTransformations(text) {
  let count = 0;
  if (/convert\w*|in terms of|rewrite (as|in)|express .{0,20}(as|in terms of)/i.test(text))
    count++;
  if (/percent(age)?|decimal|fraction/i.test(text) && /convert|express|write/i.test(text))
    count++;
  if (/substitut|plug in|replace .{0,20}with/i.test(text))
    count++;
  return count;
}
var REPRESENTATION_PATTERNS = [
  ["equation", /equation|formula|expression\s/i],
  ["graph", /graph|plot|curve|axis|axes/i],
  ["table", /table|row|column|data set/i],
  ["scenario", /scenario|situation|context|problem states|passage/i],
  ["diagram", /diagram|figure|illustration|image|picture/i]
];
function detectRepresentations(text) {
  return REPRESENTATION_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
}
function estimateScenarioComplexity(text) {
  const words = text.trim().split(/\s+/).length;
  const clauses = (text.match(/,|;| and | but | because | however | therefore /gi) ?? []).length;
  if (words > 120 || clauses > 6)
    return "high";
  if (words > 50 || clauses > 2)
    return "medium";
  return "low";
}
function analyzeStructure(problemText) {
  const operations = Math.min(countOperations(problemText), 5);
  const transformations = Math.min(countTransformations(problemText), 3);
  const hasParentheses = /\([^)]+[+\-×÷*/][^)]+\)/.test(problemText);
  const variableBothSides = (() => {
    const eqIdx = problemText.indexOf("=");
    if (eqIdx === -1)
      return false;
    const lhs = problemText.slice(0, eqIdx);
    const rhs = problemText.slice(eqIdx + 1);
    const singleLetterRe = /(?<![a-zA-Z])([a-z])(?![a-zA-Z])/gi;
    const lhsVars = new Set(Array.from(lhs.matchAll(singleLetterRe), (m) => m[1].toLowerCase()));
    const rhsVars = Array.from(rhs.matchAll(singleLetterRe), (m) => m[1].toLowerCase());
    return rhsVars.some((v) => lhsVars.has(v));
  })();
  const representations = detectRepresentations(problemText);
  const scenarioComplexity = estimateScenarioComplexity(problemText);
  return {
    operations,
    transformations,
    hasParentheses,
    variableBothSides,
    representations,
    scenarioComplexity
  };
}

// src/components_new/v4/steps/difficultyAdjustments.ts
function adjustForDifficulty(steps, difficulty) {
  if (difficulty === "easy")
    return steps - 1;
  if (difficulty === "hard")
    return steps + 1;
  return steps;
}

// src/components_new/v4/steps/scenarioAdjustments.ts
function adjustForScenario(steps, complexity) {
  if (complexity === "high")
    return steps + 1;
  return steps;
}

// src/components_new/v4/steps/learnerAdjustments.ts
function adjustForLearner(steps, profile) {
  switch (profile) {
    case "support":
      return steps + 1;
    case "accessible":
      return steps + 1;
    case "iep504":
      return steps + 2;
    case "challenge":
      return steps - 1;
    default:
      return steps;
  }
}

// src/components_new/v4/steps/stepEngine.ts
function computeStepCount(concept, context) {
  if (context.teacherStepOverride !== void 0) {
    return Math.max(1, context.teacherStepOverride);
  }
  const [min, max] = getConceptStepRange(concept);
  const structure = analyzeStructure(context.problemText);
  let steps = min + structure.operations + structure.transformations + (structure.hasParentheses ? 1 : 0) + (structure.variableBothSides ? 1 : 0) + structure.representations.length;
  steps = adjustForDifficulty(steps, context.difficulty);
  const resolvedComplexity = context.scenarioComplexity !== "medium" ? context.scenarioComplexity : structure.scenarioComplexity;
  steps = adjustForScenario(steps, resolvedComplexity);
  steps = adjustForLearner(steps, context.learnerProfile);
  return Math.max(1, Math.max(min, Math.min(steps, max)));
}

// api/v4/studio/generateItems.ts
var runtime = "nodejs";
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function buildUserPrompt(params) {
  const { conceptId, canonical, type, difficulty, count } = params;
  const typeGuideline = ITEM_TYPE_GUIDELINES[type] ?? "";
  const label = canonical?.label ?? conceptId;
  const description = canonical?.description ?? "";
  const prereqs = canonical?.prerequisites?.join(", ") ?? "";
  const misconceptions = canonical?.misconceptions?.join(", ") ?? "";
  const scenarioStyle = pickScenario(canonical?.subject, `${conceptId}__${type}`);
  const estimatedTime = difficultyToTime(type, difficulty);
  const concept = toCanonicalConcept(canonical, conceptId);
  const targetSteps = computeStepCount(concept, {
    conceptId: concept.id,
    difficulty,
    scenarioComplexity: "medium",
    learnerProfile: "core",
    problemText: description
  });
  return `${typeGuideline}

Generate ${count} assessment item${count === 1 ? "" : "s"}.

Concept:
- ID: ${conceptId}
- Canonical Label: ${label}
${description ? `- Description: ${description}` : ""}
${prereqs ? `- Prerequisites: ${prereqs}` : ""}
${misconceptions ? `- Common Misconceptions: ${misconceptions}` : ""}

Item Requirements:
- Item Type: ${type}
- Difficulty: ${difficulty}
- Scenario Style: ${scenarioStyle}
- Solution Steps: aim for ${targetSteps} step${targetSteps === 1 ? "" : "s"} in the answer key

Output Format \u2014 a JSON array where every element matches this shape:
{
  "stem": "...",
  "type": "${type}",
  ${type === "mc" ? '"options": ["A...", "B...", "C...", "D..."],' : ""}
  "correctAnswer": "...",
  "rationale": "...",
  "concepts": ["${canonical?.id ?? conceptId}"],
  "difficulty": "${difficulty}",
  "estimatedTimeSeconds": ${estimatedTime}
}`;
}
function toCanonicalConcept(canonical, conceptId) {
  return {
    id: canonical?.id ?? conceptId,
    label: canonical?.label ?? conceptId,
    description: canonical?.description,
    subject: canonical?.subject ?? "general",
    prerequisites: canonical?.prerequisites ?? [],
    misconceptions: canonical?.misconceptions,
    typicalStepRange: canonical?.typicalStepRange
  };
}
function isValidItemType(v) {
  return v === "mc" || v === "short_answer" || v === "frq";
}
function placeholderItems(params) {
  return Array.from({ length: params.count }, (_, i) => ({
    id: `${params.conceptId}__${params.type}__${params.difficulty}__${i}`,
    stem: `[Placeholder] ${params.type.toUpperCase()} question ${i + 1} for "${params.canonical?.label ?? params.conceptId}"`,
    type: params.type,
    ...params.type === "mc" ? { options: ["Option A", "Option B", "Option C", "Option D"], correctAnswer: "Option A" } : { correctAnswer: "" },
    concepts: [params.canonical?.id ?? params.conceptId],
    difficulty: params.difficulty,
    estimatedTimeSeconds: difficultyToTime(params.type, params.difficulty)
  }));
}
async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS")
    return res.status(200).json({});
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  let params;
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { conceptId, canonical, type, difficulty, count } = body;
    if (!conceptId || !type || !difficulty || !count) {
      return res.status(400).json({ error: "Missing required fields: conceptId, type, difficulty, count" });
    }
    const resolvedType = (() => {
      if (!isValidItemType(type))
        return "mc";
      if (!canonical?.id)
        return type;
      const allowed = allowedTypesForConcept(canonical.id);
      return allowed.includes(type) ? type : allowed[0];
    })();
    params = { conceptId, canonical, type: resolvedType, difficulty, count: Math.max(1, Math.min(count, 20)) };
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  void buildUserPrompt(params);
  const items = placeholderItems(params);
  const concept = toCanonicalConcept(params.canonical, params.conceptId);
  const enriched = items.map((item) => ({
    ...item,
    stepCount: computeStepCount(concept, {
      conceptId: concept.id,
      difficulty: item.difficulty,
      scenarioComplexity: "medium",
      learnerProfile: "core",
      problemText: item.stem
    })
  }));
  return res.status(200).json({ items: enriched.slice(0, params.count) });
}
export {
  handler as default,
  runtime
};
