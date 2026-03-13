import { DeriveTemplateRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { DeriveTemplateResult, TemplateAnalysis } from "./types";
import { buildDerivedTemplate } from "./builder";
import { AnalyzerV2, AnalyzerV2Output } from "@/pipeline/analyzerV2/analyzerV2";
import { create } from "@/pipeline/orchestrator/create";

function inferAnalysisFromExamples(request: DeriveTemplateRequest): TemplateAnalysis {
  const joined = request.examples.join("\n").toLowerCase();
  const wordCount = joined.split(/\s+/).filter(Boolean).length;

  const inferredItemType = joined.includes("explain")
    ? "short_answer"
    : joined.includes("choose") || joined.includes("multiple choice")
      ? "multiple_choice"
      : "constructed_response";

  const inferredIntent = joined.includes("analyze") || joined.includes("why")
    ? "analyze"
    : joined.includes("apply")
      ? "apply"
      : "understand";

  const inferredDifficulty = wordCount > 180 ? "hard" : wordCount > 90 ? "medium" : "easy";
  const inferredSharedContext = joined.includes("passage") || joined.includes("read the text")
    ? "passage"
    : null;

  return {
    subject: request.subject ?? "General",
    itemType: inferredItemType,
    cognitiveIntent: inferredIntent,
    difficulty: inferredDifficulty,
    sharedContext: inferredSharedContext,
    structure: {
      hasNumbers: /\d/.test(joined),
      variableCount: (joined.match(/[xyz]/g) ?? []).length,
    },
  };
}

function pickTopKey(distribution: Record<string, number> | undefined, fallback: string): string {
  if (!distribution || Object.keys(distribution).length === 0) return fallback;
  return Object.entries(distribution).sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

function mapAnalyzerToTemplateAnalysis(
  request: DeriveTemplateRequest,
  output: AnalyzerV2Output
): TemplateAnalysis {
  const itemType = pickTopKey(output.distributions?.questionTypes, "short_answer");
  const cognitiveIntent = pickTopKey(output.distributions?.bloom, "understand");
  const difficulty = pickTopKey(output.distributions?.difficulty, "medium");

  const allPrompts = output.items.map((item) => item.rawPrompt?.toLowerCase?.() ?? "").join("\n");
  const sharedContext = allPrompts.includes("passage") || allPrompts.includes("read the text")
    ? "passage"
    : null;

  return {
    subject: request.subject ?? "General",
    itemType,
    cognitiveIntent,
    difficulty,
    sharedContext,
    structure: {
      itemCount: output.items.length,
      sectionCount: output.sectionStructures.length,
      hasPatterns: output.genericTemplates.length > 0,
      signals: output.conceptCoverage ?? null,
      patterns: output.genericTemplates.map((template) => template.id),
    },
  };
}

async function analyzeExamplesWithAnalyzerV2(request: DeriveTemplateRequest): Promise<TemplateAnalysis> {
  const analyzer = new AnalyzerV2();
  const rawText = request.examples.join("\n\n");

  try {
    const output = await analyzer.analyze({
      documentId: `derive-template-${request.teacherId}-${Date.now()}`,
      rawText,
      teacherId: request.teacherId,
    });

    const analysis = mapAnalyzerToTemplateAnalysis(request, output);

    if (!analysis.itemType) analysis.itemType = "short_answer";
    if (!analysis.cognitiveIntent) analysis.cognitiveIntent = "understand";
    if (!analysis.difficulty) analysis.difficulty = "medium";
    if (analysis.sharedContext === undefined) analysis.sharedContext = null;
    if (!analysis.subject) analysis.subject = request.subject ?? "General";

    return analysis;
  } catch {
    return inferAnalysisFromExamples(request);
  }
}

export async function deriveTemplate(
  
  request: DeriveTemplateRequest
): Promise<DeriveTemplateResult> {
  const analysis = await analyzeExamplesWithAnalyzerV2(request);
  const template = buildDerivedTemplate(request, analysis);

  try {
    const preview = await create({
      mode: "create",
      template,
      templateId: template.id,
      count: 2,
      teacherPreferences: request.teacherPreferences,
      studentProfile: request.studentProfile,
      subscriptionTier: "free",
      userId: request.teacherId,
      gradeLevels: ["Unknown"],
      course: request.subject ?? "General",
      unitName: "Template Preview",
      lessonName: null,
      topic: template.label,
      assessmentType: "worksheet",
      studentLevel: "standard",
      time: 10,
      additionalDetails: "Generate two preview items from a derived template.",
      sourceDocuments: [],
      questionCount: 2,
      teacherId: request.teacherId,
    } as any);
    

    const previewAny = preview as any;
    template.previewItems =
      previewAny?.finalAssessment?.items?.length
        ? previewAny.finalAssessment.items
        : previewAny?.items?.length
          ? previewAny.items
          : request.examples.slice(0, 2).map((example, index) => ({
              id: `preview_${index + 1}`,
              prompt: example,
              source: "example_fallback",
            }));
  } catch {
    template.previewItems = request.examples.slice(0, 2).map((example, index) => ({
      id: `preview_${index + 1}`,
      prompt: example,
      source: "example_fallback",
    }));
  }
  console.log("ANALYSIS >>>", JSON.stringify(analysis, null, 2));


  return { template };
}
