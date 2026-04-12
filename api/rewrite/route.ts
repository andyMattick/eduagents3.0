import { NextResponse } from "next/server";

//
// Types
//
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

//
// POST handler
//
export async function POST(req: Request) {
  let body: RewriteRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { original, suggestions, selectedSuggestionIds, docType, profileApplied } = body;

  //
  // 1. Validate docType
  //
  if (docType && !["assignment", "assessment", "mixed"].includes(docType)) {
    return NextResponse.json(
      {
        code: "INVALID_DOC_TYPE",
        message: "Rewrite only supports assignment, assessment, or mixed documents."
      },
      { status: 422 }
    );
  }

  //
  // 2. Validate original text
  //
  if (!original || !original.trim()) {
    return NextResponse.json(
      {
        code: "MISSING_ORIGINAL",
        message: "Original document text is required for rewrite."
      },
      { status: 422 }
    );
  }

  //
  // 3. Validate selected suggestions
  //
  if (!selectedSuggestionIds || selectedSuggestionIds.length === 0) {
    return NextResponse.json(
      {
        code: "NO_SUGGESTIONS_SELECTED",
        message: "Select at least one suggestion before rewriting."
      },
      { status: 422 }
    );
  }

  const suggestionMap = new Map(suggestions.map(s => [s.id, s]));
  const selectedSuggestions: RewriteSuggestion[] = [];

  for (const id of selectedSuggestionIds) {
    const s = suggestionMap.get(id);
    if (!s) {
      return NextResponse.json(
        {
          code: "INVALID_SELECTED_SUGGESTION_ID",
          message: `Selected suggestion id '${id}' not found.`
        },
        { status: 422 }
      );
    }
    selectedSuggestions.push(s);
  }

  //
  // 4. Filter actionable suggestions
  //
  const actionable = selectedSuggestions.filter(s => s.actionable !== false);

  if (actionable.length === 0) {
    return NextResponse.json(
      {
        code: "NO_ACTIONABLE_SUGGESTIONS",
        message: "Selected suggestions cannot be applied automatically."
      },
      { status: 422 }
    );
  }

  //
  // 5. Build prompt
  //
  const prompt = buildRewritePrompt({
    original,
    docType,
    profileApplied,
    actionableSuggestions: actionable
  });

  //
  // 6. Call your model (Gemini, OpenAI, etc.)
  //
  let modelResponse: { rewritten: string; usageTokens: number };

  try {
    modelResponse = await callRewriteModel(prompt);
  } catch (err) {
    return NextResponse.json(
      {
        code: "MODEL_ERROR",
        message: "Rewrite model failed to generate output."
      },
      { status: 500 }
    );
  }

  const { rewritten, usageTokens } = modelResponse;

  //
  // 7. No-op guard
  //
  if (rewritten.trim() === original.trim()) {
    return NextResponse.json(
      {
        code: "NO_CHANGES",
        message: "Rewrite produced no changes. Check suggestions and try again."
      },
      { status: 500 }
    );
  }

  //
  // 8. Charge tokens ONLY after successful model response
  //
  try {
    await incrementTokenUsage(usageTokens);
  } catch {
    // Token charging failure should NOT break rewrite
    console.error("Token usage increment failed");
  }

  //
  // 9. Return response
  //
  const appliedSuggestionIds = actionable.map(s => s.id);
  const nonAppliedSuggestionIds = selectedSuggestionIds.filter(
    id => !appliedSuggestionIds.includes(id)
  );

  const response: RewriteResponse = {
    rewritten,
    appliedSuggestionIds,
    nonAppliedSuggestionIds
  };

  return NextResponse.json(response, { status: 200 });
}

//
// Prompt builder
//
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
    original
  ].join("\n");
}

//
// Model call stub — your dev plugs in Gemini here
//
async function callRewriteModel(prompt: string): Promise<{ rewritten: string; usageTokens: number }> {
  // Replace with your Gemini call
  // Must return: { rewritten: string, usageTokens: number }
  throw new Error("callRewriteModel not implemented");
}

//
// Token usage increment stub — your dev plugs in Supabase RPC here
//
async function incrementTokenUsage(tokens: number): Promise<void> {
  // Replace with your Supabase RPC call
  // Must NOT throw if it fails
  return;
}
