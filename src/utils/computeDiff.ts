/**
 * computeDiff.ts
 *
 * Token-level diff between two strings.
 * Produces HTML with <span class="diff-added"> / <span class="diff-removed">
 * wrappers suitable for both UI rendering and PDF appendix pre-computing.
 *
 * Algorithm: Myers LCS on word tokens.
 * Whitespace is preserved as neutral tokens between words.
 */

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

/**
 * Split text into alternating [word, delimiter] pairs.
 * Delimiters (spaces, punctuation runs) are kept as their own tokens
 * so they survive the diff without being attributed to added/removed words.
 */
function tokenize(text: string): string[] {
	return text.split(/(\s+)/).filter((t) => t !== "");
}

// ---------------------------------------------------------------------------
// LCS via dynamic programming
// ---------------------------------------------------------------------------

/**
 * Build the standard LCS DP table for two token arrays.
 * Returns the table (m+1) × (n+1) for backtracking.
 */
function buildLcsTable(a: string[], b: string[]): number[][] {
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (a[i - 1] === b[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1] + 1;
			} else {
				dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
			}
		}
	}
	return dp;
}

// ---------------------------------------------------------------------------
// Edit-script types
// ---------------------------------------------------------------------------

type EditOp = { op: "keep" | "add" | "remove"; token: string };

/**
 * Backtrack through the LCS table to produce a sequence of keep/add/remove ops.
 */
function buildEditScript(a: string[], b: string[], dp: number[][]): EditOp[] {
	const ops: EditOp[] = [];
	let i = a.length;
	let j = b.length;

	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
			ops.push({ op: "keep", token: a[i - 1] });
			i--;
			j--;
		} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
			ops.push({ op: "add", token: b[j - 1] });
			j--;
		} else {
			ops.push({ op: "remove", token: a[i - 1] });
			i--;
		}
	}

	return ops.reverse();
}

// ---------------------------------------------------------------------------
// HTML serializer
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/**
 * Serialize an edit script to HTML.
 * Adjacent same-op tokens are merged to minimize span count.
 *
 * CSS classes:
 *   .diff-added    — text present in `rewritten` but not `original`
 *   .diff-removed  — text present in `original` but not `rewritten`
 * (no class = kept unchanged)
 */
function opsToHtml(ops: EditOp[]): string {
	let html = "";
	let i = 0;
	while (i < ops.length) {
		const { op, token } = ops[i];
		// Collect consecutive tokens with the same op
		let run = token;
		while (i + 1 < ops.length && ops[i + 1].op === op) {
			i++;
			run += ops[i].token;
		}
		if (op === "keep") {
			html += escapeHtml(run);
		} else if (op === "add") {
			html += `<span class="diff-added">${escapeHtml(run)}</span>`;
		} else {
			html += `<span class="diff-removed">${escapeHtml(run)}</span>`;
		}
		i++;
	}
	return html;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a word-level HTML diff between `original` and `rewritten`.
 *
 * Returns an HTML string with:
 *   <span class="diff-added">…</span>   for inserted text
 *   <span class="diff-removed">…</span> for deleted text
 *   plain text for unchanged text
 *
 * Handles inputs up to ~2000 tokens efficiently.
 * For very long strings (>2000 tokens) the inputs are truncated to prevent
 * O(m*n) timeout; callers should display a "too long to diff" notice in that
 * case (signalled by the `truncated` flag on the return value).
 */
export function computeWordDiff(
	original: string,
	rewritten: string,
): { html: string; truncated: boolean } {
	const TOKEN_LIMIT = 2000;

	const rawA = tokenize(original);
	const rawB = tokenize(rewritten);

	const truncated = rawA.length > TOKEN_LIMIT || rawB.length > TOKEN_LIMIT;
	const a = rawA.slice(0, TOKEN_LIMIT);
	const b = rawB.slice(0, TOKEN_LIMIT);

	const dp = buildLcsTable(a, b);
	const ops = buildEditScript(a, b, dp);
	const html = opsToHtml(ops);

	return { html, truncated };
}

/**
 * Convenience wrapper: returns just the HTML string.
 * `""` if both strings are identical.
 */
export function diffHtml(original: string, rewritten: string): string {
	if (original === rewritten) return "";
	return computeWordDiff(original, rewritten).html;
}
