import { callGemini } from "../../../lib/gemini";
import type { ProblemTagVector } from "../schema/semantic";
import { composeNarrative } from "./composeNarrative";
import { LENS_MAP, type NarrateProblemRequest, type NarrateProblemResponse, type NarratorBlocks, type NarratorInstructionalPurpose, type NarratorLens } from "./types";

interface NarratorLLMResponse extends NarratorBlocks {
	teacherVoiceNarrative?: string;
}

const NARRATOR_PROMPT = `You are an expert teacher who explains problems to other teachers.

Your job is to analyze a single problem and produce a structured JSON object
containing only the narrative blocks requested by the teacher's chosen lens.

Inputs:
- problemText: the full text of the problem
- semanticFingerprint: structured v4 semantics (concepts, steps, representations, difficulty, misconceptions)
- lens: the teacher’s chosen question (mapped to narrative blocks)
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

function humanize(value: string) {
	return value
		.split(/[._-]/g)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function topKeys(record: Record<string, number> | undefined, limit: number) {
	return Object.entries(record ?? {})
		.sort((left, right) => right[1] - left[1])
		.slice(0, limit)
		.map(([key]) => key);
}

function topBloomLevel(fingerprint: ProblemTagVector) {
	return Object.entries(fingerprint.cognitive.bloom)
		.sort((left, right) => right[1] - left[1])[0]?.[0] ?? "apply";
}

function normalizeProblemText(problemText: string) {
	return problemText.replace(/\s+/g, " ").trim();
}

function summarizeEvidence(problemText: string) {
	const normalized = normalizeProblemText(problemText);
	if (!normalized) {
		return "the wording of the prompt and the quantities or relationships it highlights";
	}

	return normalized.slice(0, 160);
}

function buildTaskEssence(problemText: string, fingerprint: ProblemTagVector) {
	const bloom = topBloomLevel(fingerprint);
	const concept = topKeys(fingerprint.concepts, 1)[0] ?? fingerprint.domain ?? fingerprint.subject;
	const summaryByBloom: Record<string, string> = {
		remember: `recall or identify key ideas in ${humanize(concept).toLowerCase()}`,
		understand: `explain what is happening in ${humanize(concept).toLowerCase()} terms`,
		apply: `apply ${humanize(concept).toLowerCase()} to solve the situation`,
		analyze: `analyze the structure of the situation and justify the choice of strategy`,
		evaluate: `evaluate the reasoning or method that best fits the task`,
		create: `construct a response or method that extends the underlying idea`,
	};

	return {
		summary: summaryByBloom[bloom] ?? "make sense of the prompt and solve it with clear reasoning",
		evidence: summarizeEvidence(problemText),
	};
}

function buildCognitiveMoves(fingerprint: ProblemTagVector) {
	const concept = topKeys(fingerprint.concepts, 1)[0];
	const expectedSteps = fingerprint.reasoning?.adjustedExpectedSteps ?? fingerprint.reasoning?.expectedSteps ?? fingerprint.steps;
	const firstMove = concept
		? `identify the relevant ${humanize(concept).toLowerCase()} relationship in the prompt`
		: "identify what quantities, relationships, or ideas matter in the prompt";
	const secondMove = expectedSteps > 1
		? "carry that relationship across each step instead of treating the parts as unrelated"
		: "apply that relationship consistently to the final response";

	return [
		{
			step: firstMove,
			whyItMatters: "anchor the work in the right mathematical or conceptual structure",
		},
		{
			step: secondMove,
			whyItMatters: "keep the reasoning coherent from setup through conclusion",
		},
	];
}

function buildRepresentationalDemands(fingerprint: ProblemTagVector) {
	const forms = [fingerprint.representation];
	const explanation = fingerprint.representationCount > 1
		? "students need to coordinate the representation named in the prompt with the other cues in the problem without losing the underlying relationship"
		: "students need to interpret that form accurately and connect it to the reasoning they use to answer";

	return { forms, explanation };
}

function buildLikelyMisconceptions(fingerprint: ProblemTagVector) {
	const misconceptionKey = topKeys(fingerprint.misconceptionTriggers, 1)[0];
	if (misconceptionKey) {
		const label = humanize(misconceptionKey).toLowerCase();
		return [{
			misconception: label,
			trigger: `the prompt can cue that misunderstanding when students rush past the structure of the task`,
			howToNotice: `students may choose a procedure quickly but struggle to explain why it matches the prompt`,
		}];
	}

	if (fingerprint.cognitive.multiStep >= 0.45) {
		return [{
			misconception: "treating the parts of the problem as separate instead of connected",
			trigger: "students have to hold onto the same relationship across more than one step",
			howToNotice: "their work may start correctly but drift when they move to the next step",
		}];
	}

	return [{
		misconception: "using a familiar procedure without checking whether it fits this prompt",
		trigger: "the task looks routine on the surface",
		howToNotice: "students may produce an answer with little explanation or mismatched reasoning",
	}];
}

function buildInstructionalLevers(fingerprint: ProblemTagVector) {
	const useRepresentation = fingerprint.representation !== "paragraph";
	const move = useRepresentation
		? `name what the ${fingerprint.representation} is showing before asking students to solve`
		: "have students restate the relationship in their own words before they compute or explain";

	return [{
		move,
		whenToUse: fingerprint.cognitive.multiStep >= 0.45 ? "when students are losing the thread across multiple steps" : "when students jump into a procedure too quickly",
		whyItWorks: "makes the underlying structure visible before students commit to a strategy",
	}];
}

function buildInstructionalPurpose(fingerprint: ProblemTagVector): NarratorInstructionalPurpose {
	const concept = humanize(topKeys(fingerprint.concepts, 1)[0] ?? fingerprint.domain ?? fingerprint.subject).toLowerCase();
	const futureConnection = fingerprint.subject === "math"
		? `${concept} in later proportional, algebraic, or modeling work`
		: `${concept} in later grade-level reasoning and application tasks`;

	return { concept, futureConnection };
}

function buildFallbackBlocks(problemText: string, semanticFingerprint: ProblemTagVector): NarratorBlocks {
	return {
		taskEssence: buildTaskEssence(problemText, semanticFingerprint),
		cognitiveMoves: buildCognitiveMoves(semanticFingerprint),
		representationalDemands: buildRepresentationalDemands(semanticFingerprint),
		likelyMisconceptions: buildLikelyMisconceptions(semanticFingerprint),
		instructionalLevers: buildInstructionalLevers(semanticFingerprint),
		instructionalPurpose: buildInstructionalPurpose(semanticFingerprint),
	};
}

function cleanJsonString(raw: string) {
	const withoutCodeFences = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
	const firstBrace = withoutCodeFences.indexOf("{");
	const lastBrace = withoutCodeFences.lastIndexOf("}");
	if (firstBrace >= 0 && lastBrace > firstBrace) {
		return withoutCodeFences.slice(firstBrace, lastBrace + 1);
	}
	return withoutCodeFences;
}

function parseNarratorJson(raw: string): NarratorLLMResponse | null {
	try {
		return JSON.parse(cleanJsonString(raw)) as NarratorLLMResponse;
	} catch {
		return null;
	}
}

function pickBlocksForLens(lens: NarratorLens, blocks: NarratorBlocks): NarratorBlocks {
	return LENS_MAP[lens].reduce<NarratorBlocks>((selected, key) => {
		if (blocks[key] !== undefined) {
			selected[key] = blocks[key];
		}
		return selected;
	}, {});
}

function buildPrompt(payload: NarrateProblemRequest) {
	return `${NARRATOR_PROMPT}

Teacher inputs:
${JSON.stringify({
	problemText: payload.problemText,
	semanticFingerprint: payload.semanticFingerprint,
	lens: payload.lens,
	requestedBlocks: LENS_MAP[payload.lens],
	gradeLevel: payload.gradeLevel,
	subject: payload.subject,
}, null, 2)}

Return valid JSON only.`;
}

function toProblemTagVector(value: unknown): ProblemTagVector | null {
	if (!value || typeof value !== "object") {
		return null;
	}

	const candidate = value as ProblemTagVector;
	if (!candidate.cognitive || !candidate.representation || !candidate.subject || !candidate.domain) {
		return null;
	}

	return candidate;
}

export async function narrateProblem(payload: NarrateProblemRequest): Promise<NarrateProblemResponse> {
	const semanticFingerprint = toProblemTagVector(payload.semanticFingerprint);
	if (!semanticFingerprint) {
		throw new Error("semanticFingerprint must be a valid v4 problem semantic fingerprint");
	}

	const fallbackBlocks = buildFallbackBlocks(payload.problemText, semanticFingerprint);
	let blocks = fallbackBlocks;
	let narrative = composeNarrative(pickBlocksForLens(payload.lens, fallbackBlocks));

	try {
		const raw = await callGemini({
			model: "gemini-2.0-flash",
			prompt: buildPrompt(payload),
			temperature: 0,
			maxOutputTokens: 1024,
		});
		const parsed = parseNarratorJson(raw);
		if (parsed) {
			blocks = { ...fallbackBlocks, ...parsed };
			const filteredBlocks = pickBlocksForLens(payload.lens, blocks);
			narrative = typeof parsed.teacherVoiceNarrative === "string" && parsed.teacherVoiceNarrative.trim().length > 0
				? parsed.teacherVoiceNarrative.trim()
				: composeNarrative(filteredBlocks);
			return {
				problemId: payload.problemId,
				lens: payload.lens,
				blocks: filteredBlocks,
				narrative,
			};
		}
	} catch (error) {
		console.warn("[narrator] LLM generation failed, using semantic fallback:", error);
	}

	const filteredBlocks = pickBlocksForLens(payload.lens, blocks);
	return {
		problemId: payload.problemId,
		lens: payload.lens,
		blocks: filteredBlocks,
		narrative,
	};
}
