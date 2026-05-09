/**
 * LLM-based segmentation using OpenAI.
 * Replaces regex-based segmentText / detectMultiPart / detectMultipleChoice for item extraction.
 * Only segmentation uses OpenAI; narrative and metrics remain unchanged.
 */

export type SegmentedParent = {
	parent: string;
	subItems: { letter: string; text: string }[];
};

type AzureOpenAIConfig = {
	apiKey: string;
	endpoint: string;
	deployment: string;
	apiVersion: string;
};

const SEGMENTATION_PROMPT = `You are a structure extractor.

Given a block of text from a teacher-written assessment, return JSON with:
- "parent": the main question text (everything before the first sub-item)
- "subItems": an array of { "letter", "text" } for each sub-question (a, b, c, ...)

Rules:
- Sub-items always start with a letter followed by ) or . or ) with optional parentheses, e.g. "a)", "b.", "(c)".
- These are NOT multiple-choice answer choices.
- Do not infer answers. Do not rewrite text.
- Preserve the teacher's wording exactly.
- If there are no sub-items, "subItems" must be an empty array.

Return ONLY valid JSON, no commentary.`;

function getAzureOpenAIConfig(): AzureOpenAIConfig {
	const apiKey =
		import.meta.env?.VITE_AZURE_OPENAI_API_KEY
		?? (typeof process !== "undefined" ? process.env.AZURE_OPENAI_API_KEY : undefined);
	const endpoint =
		import.meta.env?.VITE_AZURE_OPENAI_ENDPOINT
		?? (typeof process !== "undefined" ? process.env.AZURE_OPENAI_ENDPOINT : undefined);
	const deployment =
		import.meta.env?.VITE_AZURE_OPENAI_DEPLOYMENT
		?? (typeof process !== "undefined" ? process.env.AZURE_OPENAI_DEPLOYMENT : undefined);
	const apiVersion =
		import.meta.env?.VITE_AZURE_OPENAI_API_VERSION
		?? (typeof process !== "undefined" ? process.env.AZURE_OPENAI_API_VERSION : undefined);

	const missing = [
		!apiKey ? "AZURE_OPENAI_API_KEY" : null,
		!endpoint ? "AZURE_OPENAI_ENDPOINT" : null,
		!deployment ? "AZURE_OPENAI_DEPLOYMENT" : null,
		!apiVersion ? "AZURE_OPENAI_API_VERSION" : null,
	].filter(Boolean);

	if (missing.length > 0) {
		throw new Error(`Azure OpenAI segmentation configuration missing: ${missing.join(", ")}`);
	}

	return {
		apiKey: apiKey as string,
		endpoint: endpoint as string,
		deployment: deployment as string,
		apiVersion: apiVersion as string,
	};
}

export async function segmentParentBlockWithLLM(blockText: string): Promise<SegmentedParent> {
	const config = getAzureOpenAIConfig();
	const base = config.endpoint.replace(/\/+$/, "");
	const url = `${base}/openai/deployments/${encodeURIComponent(config.deployment)}/chat/completions?api-version=${encodeURIComponent(config.apiVersion)}`;

	const body = JSON.stringify({
		messages: [
			{ role: "system", content: SEGMENTATION_PROMPT },
			{ role: "user", content: `Text:\n"""\n${blockText}\n"""` },
		],
		response_format: { type: "json_object" },
		temperature: 0,
	});

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"api-key": config.apiKey,
		},
		body,
	});

	if (!response.ok) {
		const errText = await response.text().catch(() => "(no body)");
		throw new Error(`Azure OpenAI segmentation request failed: ${response.status} ${errText}`);
	}

	const data = await response.json() as {
		choices: Array<{ message: { content: string } }>;
	};

	const raw = data.choices[0]?.message?.content ?? "";
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`OpenAI returned non-JSON segmentation response: ${raw.slice(0, 200)}`);
	}

	if (
		typeof parsed !== "object" ||
		parsed === null ||
		typeof (parsed as SegmentedParent).parent !== "string" ||
		!Array.isArray((parsed as SegmentedParent).subItems)
	) {
		throw new Error("Invalid segmentation response shape from OpenAI");
	}

	return parsed as SegmentedParent;
}
