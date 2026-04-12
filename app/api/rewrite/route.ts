import { NextResponse } from "next/server";

import { callGeminiDetailed } from "../../../lib/gemini";
import { supabaseAdmin } from "../../../lib/supabase";

export const runtime = "nodejs";

type DocType = "assignment" | "assessment" | "mixed" | "notes";

interface RewriteSuggestion {
  id: string;
  label: string;
  rationale?: string;
  instruction: string;
  severity?: "low" | "medium" | "high";
  actionable?: boolean;
}

interface RewriteRequest {
  original: string;
  suggestions: RewriteSuggestion[];
  selectedSuggestionIds: string[];
  docType?: DocType;
  profileApplied?: string;
}

interface RewriteResponse {
  rewritten: string;
  appliedSuggestionIds: string[];
  nonAppliedSuggestionIds: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseRewriteSuggestion(value: unknown): RewriteSuggestion | null {
  if (!isRecord(value)) return null;

  if (typeof value.id !== "string" || value.id.trim() === "") return null;
  if (typeof value.label !== "string" || value.label.trim() === "") return null;
  if (typeof value.instruction !== "string" || value.instruction.trim() === "") return null;

  if (value.rationale !== undefined && typeof value.rationale !== "string") return null;
  if (value.actionable !== undefined && typeof value.actionable !== "boolean") return null;
  if (
    value.severity !== undefined &&
    value.severity !== "low" &&
    value.severity !== "medium" &&
    value.severity !== "high"
  ) {
    return null;
  }

  return {
    id: value.id,
    label: value.label,
    rationale: typeof value.rationale === "string" ? value.rationale : undefined,
    instruction: value.instruction,
    severity: value.severity as RewriteSuggestion["severity"] | undefined,
    actionable: typeof value.actionable === "boolean" ? value.actionable : undefined,
  };
}

function parseRewriteRequest(value: unknown): RewriteRequest | null {
  if (!isRecord(value)) return null;

  const original = value.original;
  const suggestions = value.suggestions;
  const selectedSuggestionIds = value.selectedSuggestionIds;
  const docType = value.docType;
  const profileApplied = value.profileApplied;

  if (typeof original !== "string") return null;
  if (!Array.isArray(suggestions)) return null;
  if (!isStringArray(selectedSuggestionIds)) return null;
  if (docType !== undefined && typeof docType !== "string") return null;
  if (profileApplied !== undefined && typeof profileApplied !== "string") return null;

  const parsedSuggestions: RewriteSuggestion[] = [];
  for (const suggestion of suggestions) {
    const parsed = parseRewriteSuggestion(suggestion);
    if (!parsed) return null;
    parsedSuggestions.push(parsed);
  }

  return {
    original,
    suggestions: parsedSuggestions,
    selectedSuggestionIds,
    docType: typeof docType === "string" ? (docType as DocType) : undefined,
    profileApplied: typeof profileApplied === "string" ? profileApplied : undefined,
  };
}

export async function POST(req: Request) {
  let rawBody: unknown;

  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const body = parseRewriteRequest(rawBody);
  if (!body) {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Request body does not match RewriteRequest schema." },
      { status: 422 }
    );
  }

  const { original, suggestions, selectedSuggestionIds, docType, profileApplied } = body;

  if (docType && !["assignment", "assessment", "mixed"].includes(docType)) {
    return NextResponse.json(
      {
        code: "INVALID_DOC_TYPE",
        message: "Rewrite only supports assignment, assessment, or mixed documents.",
      },
      { status: 422 }
    );
  }

  if (!original.trim()) {
    return NextResponse.json(
      {
        code: "MISSING_ORIGINAL",
        message: "Original document text is required for rewrite.",
      },
      { status: 422 }
    );
  }

  if (selectedSuggestionIds.length === 0) {
    return NextResponse.json(
      {
        code: "NO_SUGGESTIONS_SELECTED",
        message: "Select at least one suggestion before rewriting.",
      },
      { status: 422 }
    );
  }

  const suggestionMap = new Map(suggestions.map((s) => [s.id, s]));
  const selectedSuggestions: RewriteSuggestion[] = [];

  for (const id of selectedSuggestionIds) {
    const s = suggestionMap.get(id);
    if (!s) {
      return NextResponse.json(
        {
          code: "INVALID_SELECTED_SUGGESTION_ID",
          message: `Selected suggestion id '${id}' not found.`,
        },
        { status: 422 }
      );
    }
    selectedSuggestions.push(s);
  }

  const actionable = selectedSuggestions.filter((s) => s.actionable !== false);

  if (actionable.length === 0) {
    return NextResponse.json(
      {
        code: "NO_ACTIONABLE_SUGGESTIONS",
        message: "Selected suggestions cannot be applied automatically.",
      },
      { status: 422 }
    );
  }

  const prompt = buildRewritePrompt({
    original,
    docType,
    profileApplied,
    actionableSuggestions: actionable,
  });

  let modelResponse: { rewritten: string; usageTokens: number };

  try {
    modelResponse = await callRewriteModel(prompt);
  } catch {
    return NextResponse.json(
      {
        code: "MODEL_ERROR",
        message: "Rewrite model failed to generate output.",
      },
      { status: 500 }
    );
  }

  const { rewritten, usageTokens } = modelResponse;

  if (!rewritten.trim() || rewritten.trim() === original.trim()) {
    return NextResponse.json(
      {
        code: "NO_CHANGES",
        message: "Rewrite produced no changes. Check suggestions and try again.",
      },
      { status: 500 }
    );
  }

  try {
    const actor = resolveActor(req);
    await incrementTokenUsage(actor.actorKey, actor.userId, usageTokens);
  } catch {
    console.error("Token usage increment failed");
  }

  const appliedSuggestionIds = actionable.map((s) => s.id);
  const nonAppliedSuggestionIds = selectedSuggestionIds.filter(
    (id) => !appliedSuggestionIds.includes(id)
  );

  const response: RewriteResponse = {
    rewritten,
    appliedSuggestionIds,
    nonAppliedSuggestionIds,
  };

  return NextResponse.json(response, { status: 200 });
}

function buildRewritePrompt(args: {
  original: string;
  docType?: string;
  profileApplied?: string;
  actionableSuggestions: RewriteSuggestion[];
}): string {
  const { original, docType, profileApplied, actionableSuggestions } = args;

  const docTypeLine = docType ? `Document type: ${docType}.` : "";
  const profileLine = profileApplied ? `Adapt for profile: ${profileApplied}.` : "";

  const suggestionsText = actionableSuggestions
    .map(
      (s, idx) =>
        `${idx + 1}. ${s.instruction}${
          s.rationale ? ` (Reason: ${s.rationale})` : ""
        }`
    )
    .join("\n");

  return [
    "Rewrite the following document by applying ONLY these changes:",
    suggestionsText,
    "",
    docTypeLine,
    profileLine,
    "",
    "Return ONLY the rewritten document text.",
    "",
    "Original document:",
    original,
  ].join("\n");
}

async function callRewriteModel(
  prompt: string
): Promise<{ rewritten: string; usageTokens: number }> {
  const result = await callGeminiDetailed({
    model: "gemini-2.0-flash",
    prompt,
    temperature: 0.3,
    maxOutputTokens: 8192,
  });

  const rewritten = stripFence(result.text).trim();
  const usageTokens =
    result.usageMetadata?.totalTokenCount ??
    (result.usageMetadata?.promptTokenCount ?? 0) +
      (result.usageMetadata?.candidatesTokenCount ?? 0);

  return {
    rewritten,
    usageTokens,
  };
}

function stripFence(value: string): string {
  return value
    .replace(/^```(?:[a-zA-Z0-9_-]+)?\s*/u, "")
    .replace(/\s*```$/u, "");
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function resolveActor(req: Request): { actorKey: string; userId: string | null } {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const claimed = req.headers.get("x-user-id") ?? req.headers.get("x-teacher-id") ?? "";
  const userId = isUuid(claimed) ? claimed : null;

  return {
    actorKey: userId ?? `ip:${ip}`,
    userId,
  };
}

async function incrementTokenUsage(
  actorKey: string,
  userId: string | null,
  tokens: number
): Promise<void> {
  if (!Number.isFinite(tokens) || tokens <= 0) return;

  const { url, key } = supabaseAdmin();
  await fetch(`${url}/rest/v1/rpc/increment_token_usage`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_actor_key: actorKey,
      p_tokens: Math.max(1, Math.round(tokens)),
      p_user_id: userId,
    }),
  });
}
