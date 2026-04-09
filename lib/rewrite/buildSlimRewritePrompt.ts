export function buildSlimRewritePrompt({
	original,
	suggestions,
	notes,
	profile,
}: {
	original: string;
	suggestions?: string[];
	notes?: string;
	profile?: string;
}) {
	return `
You are rewriting a single instructional text block for a teacher.

DIFFERENTIATION PROFILE:
${profile ?? "None"}

IMPORTANT:
You must ONLY rewrite the text when:
- at least one selected suggestion applies, OR
- the differentiation profile requires a change.

If NO rewrite is needed, return:
NO REWRITE NEEDED

ORIGINAL:
${original}

TEACHER SUGGESTIONS:
${suggestions?.length ? suggestions.join("\n") : "None"}

TEACHER NOTES:
${notes || "None"}

REWRITE RULES:
- Keep mathematical meaning identical.
- Improve clarity, structure, and readability ONLY where suggestions/profile require.
- Do NOT add new concepts unless explicitly requested.
- Do NOT simplify or change difficulty unless explicitly requested.
- Do NOT rewrite for style alone.

OUTPUT FORMAT:
If no rewrite is needed:
NO REWRITE NEEDED

If rewrite is needed:
Return ONLY the rewritten text.
`;
}
