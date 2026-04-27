"use strict";
/* Bundled by esbuild — do not edit */

// src/prism-v4/narrator/composeNarrative.ts
function composeNarrative(blocks) {
  const lines = [];
  if (blocks.taskEssence) {
    lines.push(`This problem asks students to ${blocks.taskEssence.summary}.`);
  }
  if (blocks.cognitiveMoves?.length) {
    const move = blocks.cognitiveMoves[0];
    lines.push(`To do this well, students typically ${move.step}, which helps them ${move.whyItMatters}.`);
  }
  if (blocks.likelyMisconceptions?.length) {
    const misconception = blocks.likelyMisconceptions[0];
    lines.push(`Students often struggle with ${misconception.misconception}, especially when ${misconception.trigger}.`);
  }
  if (blocks.instructionalLevers?.length) {
    const lever = blocks.instructionalLevers[0];
    lines.push(`A helpful move is to ${lever.move}, because it ${lever.whyItWorks}.`);
  }
  if (blocks.instructionalPurpose) {
    lines.push(`This task builds toward ${blocks.instructionalPurpose.futureConnection}, making it an important stepping stone in the unit.`);
  }
  if (blocks.representationalDemands && lines.length === 0) {
    lines.push(`Students have to work with ${blocks.representationalDemands.forms.join(", ")}, and ${blocks.representationalDemands.explanation}.`);
  }
  return lines.join(" ");
}

// src/prism-v4/narrator/types.ts
var LENS_MAP = {
  "what-is-this-asking": ["taskEssence"],
  "cognitive-steps": ["cognitiveMoves"],
  "where-students-struggle": ["likelyMisconceptions"],
  "representations-involved": ["representationalDemands"],
  "how-to-scaffold": ["instructionalLevers"],
  "how-to-enrich": ["instructionalLevers", "instructionalPurpose"],
  "instructional-purpose": ["instructionalPurpose"],
  "lesson-fit": ["taskEssence", "instructionalPurpose"],
  "explain-to-student": ["taskEssence", "cognitiveMoves"],
  misconceptions: ["likelyMisconceptions"]
};

// src/prism-v4/narrator/service.ts
var NARRATOR_PROMPT = `You are an expert teacher who explains problems to other teachers.

Your job is to analyze a single problem and produce a structured JSON object
containing only the narrative blocks requested by the teacher's chosen lens.

Inputs:
- problemText: the full text of the problem
- semanticFingerprint: structured v4 semantics (concepts, steps, representations, difficulty, misconceptions)
- lens: the teacher\u2019s chosen question (mapped to narrative blocks)
- gradeLevel and subject: optional context for tone and precision

Output JSON structure:
{
  "taskEssence": {
    "summary": "What the student is fundamentally being asked to do.",
    "evidence": "Which parts of the prompt reveal this."
  },
  "cognitiveMoves": [
    {
      "step": "A mental action a proficient student takes.",
      "whyItMatters": "Why this step is cognitively important."
    }
  ],
  "representationalDemands": {
    "forms": ["equation", "table", "graph", "diagram", "paragraph"],
    "explanation": "How the student must move between representations."
  },
  "likelyMisconceptions": [
    {
      "misconception": "A predictable misunderstanding.",
      "trigger": "What in the problem causes it.",
      "howToNotice": "What student behavior signals this misconception."
    }
  ],
  "instructionalLevers": [
    {
      "move": "A scaffold or teacher move.",
      "whenToUse": "When this move is most effective.",
      "whyItWorks": "The cognitive reason this move helps."
    }
  ],
  "instructionalPurpose": {
    "concept": "The underlying idea or skill this problem builds.",
    "futureConnection": "Where this skill shows up later in the curriculum."
  },
  "teacherVoiceNarrative": "A warm, collegial paragraph synthesizing ONLY the blocks relevant to the chosen lens."
}

Rules:
- Only include the blocks requested by the lens.
- Use a warm, practical teacher voice.
- No jargon, no metadata, no tags, no bullet points.
- The narrative must be a single cohesive paragraph.
- Do not mention the lens or internal reasoning.
- Do not invent representations not present in the problem.
- If a block is not relevant, omit it entirely.`;
function humanize(value) {
  return value.split(/[._-]/g).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
function topKeys(record, limit) {
  return Object.entries(record ?? {}).sort((left, right) => right[1] - left[1]).slice(0, limit).map(([key]) => key);
}
function topBloomLevel(fingerprint) {
  return Object.entries(fingerprint.cognitive.bloom).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "apply";
}
function normalizeProblemText(problemText) {
  return problemText.replace(/\s+/g, " ").trim();
}
function summarizeEvidence(problemText) {
  const normalized = normalizeProblemText(problemText);
  if (!normalized) {
    return "the wording of the prompt and the quantities or relationships it highlights";
  }
  return normalized.slice(0, 160);
}
function buildTaskEssence(problemText, fingerprint) {
  const bloom = topBloomLevel(fingerprint);
  const concept = topKeys(fingerprint.concepts, 1)[0] ?? fingerprint.domain ?? fingerprint.subject;
  const summaryByBloom = {
    remember: `recall or identify key ideas in ${humanize(concept).toLowerCase()}`,
    understand: `explain what is happening in ${humanize(concept).toLowerCase()} terms`,
    apply: `apply ${humanize(concept).toLowerCase()} to solve the situation`,
    analyze: `analyze the structure of the situation and justify the choice of strategy`,
    evaluate: `evaluate the reasoning or method that best fits the task`,
    create: `construct a response or method that extends the underlying idea`
  };
  return {
    summary: summaryByBloom[bloom] ?? "make sense of the prompt and solve it with clear reasoning",
    evidence: summarizeEvidence(problemText)
  };
}
function buildCognitiveMoves(fingerprint) {
  const concept = topKeys(fingerprint.concepts, 1)[0];
  const expectedSteps = fingerprint.reasoning?.adjustedExpectedSteps ?? fingerprint.reasoning?.expectedSteps ?? fingerprint.steps;
  const firstMove = concept ? `identify the relevant ${humanize(concept).toLowerCase()} relationship in the prompt` : "identify what quantities, relationships, or ideas matter in the prompt";
  const secondMove = expectedSteps > 1 ? "carry that relationship across each step instead of treating the parts as unrelated" : "apply that relationship consistently to the final response";
  return [
    {
      step: firstMove,
      whyItMatters: "anchor the work in the right mathematical or conceptual structure"
    },
    {
      step: secondMove,
      whyItMatters: "keep the reasoning coherent from setup through conclusion"
    }
  ];
}
function buildRepresentationalDemands(fingerprint) {
  const forms = [fingerprint.representation];
  const explanation = fingerprint.representationCount > 1 ? "students need to coordinate the representation named in the prompt with the other cues in the problem without losing the underlying relationship" : "students need to interpret that form accurately and connect it to the reasoning they use to answer";
  return { forms, explanation };
}
function buildLikelyMisconceptions(fingerprint) {
  const misconceptionKey = topKeys(fingerprint.misconceptionTriggers, 1)[0];
  if (misconceptionKey) {
    const label = humanize(misconceptionKey).toLowerCase();
    return [{
      misconception: label,
      trigger: `the prompt can cue that misunderstanding when students rush past the structure of the task`,
      howToNotice: `students may choose a procedure quickly but struggle to explain why it matches the prompt`
    }];
  }
  if (fingerprint.cognitive.multiStep >= 0.45) {
    return [{
      misconception: "treating the parts of the problem as separate instead of connected",
      trigger: "students have to hold onto the same relationship across more than one step",
      howToNotice: "their work may start correctly but drift when they move to the next step"
    }];
  }
  return [{
    misconception: "using a familiar procedure without checking whether it fits this prompt",
    trigger: "the task looks routine on the surface",
    howToNotice: "students may produce an answer with little explanation or mismatched reasoning"
  }];
}
function buildInstructionalLevers(fingerprint) {
  const useRepresentation = fingerprint.representation !== "paragraph";
  const move = useRepresentation ? `name what the ${fingerprint.representation} is showing before asking students to solve` : "have students restate the relationship in their own words before they compute or explain";
  return [{
    move,
    whenToUse: fingerprint.cognitive.multiStep >= 0.45 ? "when students are losing the thread across multiple steps" : "when students jump into a procedure too quickly",
    whyItWorks: "makes the underlying structure visible before students commit to a strategy"
  }];
}
function buildInstructionalPurpose(fingerprint) {
  const concept = humanize(topKeys(fingerprint.concepts, 1)[0] ?? fingerprint.domain ?? fingerprint.subject).toLowerCase();
  const futureConnection = fingerprint.subject === "math" ? `${concept} in later proportional, algebraic, or modeling work` : `${concept} in later grade-level reasoning and application tasks`;
  return { concept, futureConnection };
}
function buildFallbackBlocks(problemText, semanticFingerprint) {
  return {
    taskEssence: buildTaskEssence(problemText, semanticFingerprint),
    cognitiveMoves: buildCognitiveMoves(semanticFingerprint),
    representationalDemands: buildRepresentationalDemands(semanticFingerprint),
    likelyMisconceptions: buildLikelyMisconceptions(semanticFingerprint),
    instructionalLevers: buildInstructionalLevers(semanticFingerprint),
    instructionalPurpose: buildInstructionalPurpose(semanticFingerprint)
  };
}
function cleanJsonString(raw) {
  const withoutCodeFences = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const firstBrace = withoutCodeFences.indexOf("{");
  const lastBrace = withoutCodeFences.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return withoutCodeFences.slice(firstBrace, lastBrace + 1);
  }
  return withoutCodeFences;
}
function parseNarratorJson(raw) {
  try {
    return JSON.parse(cleanJsonString(raw));
  } catch {
    return null;
  }
}
function pickBlocksForLens(lens, blocks) {
  return LENS_MAP[lens].reduce((selected, key) => {
    if (blocks[key] !== void 0) {
      selected[key] = blocks[key];
    }
    return selected;
  }, {});
}
function buildPrompt(payload) {
  return `${NARRATOR_PROMPT}

Teacher inputs:
${JSON.stringify({
    problemText: payload.problemText,
    semanticFingerprint: payload.semanticFingerprint,
    lens: payload.lens,
    requestedBlocks: LENS_MAP[payload.lens],
    gradeLevel: payload.gradeLevel,
    subject: payload.subject
  }, null, 2)}

Return valid JSON only.`;
}
function toProblemTagVector(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value;
  if (!candidate.cognitive || !candidate.representation || !candidate.subject || !candidate.domain) {
    return null;
  }
  return candidate;
}
async function narrateProblem(payload) {
  const semanticFingerprint = toProblemTagVector(payload.semanticFingerprint);
  if (!semanticFingerprint) {
    throw new Error("semanticFingerprint must be a valid v4 problem semantic fingerprint");
  }
  const fallbackBlocks = buildFallbackBlocks(payload.problemText, semanticFingerprint);
  let blocks = fallbackBlocks;
  let narrative = composeNarrative(pickBlocksForLens(payload.lens, fallbackBlocks));
  const filteredBlocks = pickBlocksForLens(payload.lens, blocks);
  return {
    problemId: payload.problemId,
    lens: payload.lens,
    blocks: filteredBlocks,
    narrative
  };
}

// api/v4/narrate-problem.ts
var runtime = "nodejs";
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function parseBody(body) {
  if (typeof body !== "string") {
    return body;
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Invalid JSON body");
  }
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
    const payload = parseBody(req.body ?? {});
    if (!payload?.problemText || !payload?.semanticFingerprint || !payload?.lens) {
      return res.status(400).json({ error: "Missing required fields: problemText, semanticFingerprint, lens" });
    }
    const response = await narrateProblem(payload);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Narration failed"
    });
  }
}
export {
  handler as default,
  runtime
};
