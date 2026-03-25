import type { UnifiedAssessmentRequest } from "pipeline/contracts";
import { runCreatePipeline } from "./create";
import { buildDocumentInsights } from "pipeline/agents/document/insights";

type DifferentiationProfile =
  | "standard"
  | "remedial"
  | "honors"
  | "ap"
  | "ell"
  | "iep504"
  | "challenge"
  | "scaffolded"
  | "accessibleReading";

const PROFILE_LABELS: Record<DifferentiationProfile, string> = {
  standard: "Standard",
  remedial: "Remedial",
  honors: "Honors",
  ap: "AP / Advanced",
  ell: "ELL",
  iep504: "IEP / 504",
  challenge: "Challenge",
  scaffolded: "Scaffolded",
  accessibleReading: "Accessible Reading",
};

const PROFILE_NOTES: Record<DifferentiationProfile, string> = {
  standard: "Balanced baseline aligned to class-level expectations.",
  remedial: "Reduced complexity, clearer wording, and incremental supports.",
  honors: "Higher cognitive demand with less scaffolding.",
  ap: "Advanced rigor with evaluation and synthesis emphasis.",
  ell: "Language-accessible wording, vocabulary support, and clear syntax.",
  iep504: "Accommodations-minded phrasing, chunking, and pacing support.",
  challenge: "Stretch extension tasks and deeper transfer expectations.",
  scaffolded: "Guided progression with prompts, hints, and structured steps.",
  accessibleReading: "Reading-load adjusted language and simpler sentence structure.",
};

function normalizeProfiles(input: unknown): DifferentiationProfile[] {
  if (!Array.isArray(input)) return ["standard"];
  const allowed = new Set<DifferentiationProfile>([
    "standard",
    "remedial",
    "honors",
    "ap",
    "ell",
    "iep504",
    "challenge",
    "scaffolded",
    "accessibleReading",
  ]);
  const values = input.filter((value): value is DifferentiationProfile => typeof value === "string" && allowed.has(value as DifferentiationProfile));
  return values.length > 0 ? Array.from(new Set(values)) : ["standard"];
}

function normalizeStyles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function buildBaseFromUpload(input: any): UnifiedAssessmentRequest {
  const text = String(input?.text ?? "").trim();
  if (!text) {
    throw new Error("Differentiation requires source text when using upload mode.");
  }

  const firstMeaningfulLine =
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 10) ?? "Uploaded assessment";

  return {
    subscriptionTier: "tier2",
    mode: "write",
    userId: "workflow-differentiate",
    gradeLevels: ["8"],
    course: "general",
    unitName: firstMeaningfulLine,
    lessonName: null,
    topic: firstMeaningfulLine,
    assessmentType: "worksheet",
    studentLevel: "standard",
    time: 30,
    questionTypes: ["multipleChoice", "shortAnswer", "constructedResponse"],
    additionalDetails:
      "Generate differentiated versions anchored to the uploaded assessment content. Preserve concept coverage and adjust rigor/language by profile.",
    questionFormat: "mixed",
    bloomPreference: null,
    sectionStructure: null,
    standards: null,
    stateCode: null,
    multiPartQuestions: "yes",
    sourceDocuments: [
      {
        id: "diff-source-upload",
        name: String(input?.fileName ?? "uploaded-document.txt"),
        content: text,
      },
    ],
    differentiation: {
      profiles: [],
      transformStyle: [],
    },
  };
}

function buildBaseFromScratch(input: any): UnifiedAssessmentRequest {
  const scratch = input?.scratch ?? {};
  const topic = String(scratch.topic ?? "").trim();
  if (!topic) {
    throw new Error("Differentiation requires a topic when using scratch mode.");
  }

  const gradeLevels = Array.isArray(scratch.gradeLevels)
    ? scratch.gradeLevels.map((value: unknown) => String(value).trim()).filter(Boolean)
    : ["8"];

  return {
    subscriptionTier: "tier2",
    mode: "write",
    userId: "workflow-differentiate",
    gradeLevels: gradeLevels.length > 0 ? gradeLevels : ["8"],
    course: String(scratch.course ?? "general") || "general",
    unitName: topic,
    lessonName: null,
    topic,
    assessmentType: "worksheet",
    studentLevel: "standard",
    time: 30,
    questionTypes: ["multipleChoice", "shortAnswer", "constructedResponse"],
    additionalDetails:
      "Generate differentiated versions from this topic brief. Keep alignment to core concept targets while adapting by profile.",
    questionFormat: "mixed",
    bloomPreference: null,
    sectionStructure: null,
    standards: null,
    stateCode: null,
    multiPartQuestions: "yes",
    sourceDocuments: [],
    differentiation: {
      profiles: [],
      transformStyle: [],
    },
  };
}

function withProfileOverlay(
  base: UnifiedAssessmentRequest,
  profile: DifferentiationProfile,
  transformStyle: string[]
): UnifiedAssessmentRequest {
  const stylePhrase = transformStyle.length > 0 ? `Transformation style: ${transformStyle.join(", ")}.` : "";

  const levelMap: Record<DifferentiationProfile, string> = {
    standard: "standard",
    remedial: "remedial",
    honors: "honors",
    ap: "AP",
    ell: "standard",
    iep504: "standard",
    challenge: "honors",
    scaffolded: "remedial",
    accessibleReading: "standard",
  };

  const profileDirective: Record<DifferentiationProfile, string> = {
    standard: "Baseline instructional version for general classroom use.",
    remedial: "Lower lexical load, increase supports, and add explicit steps.",
    honors: "Increase rigor and reduce scaffolds while preserving alignment.",
    ap: "Push analysis/evaluation depth and advanced response expectations.",
    ell: "Use language-accessible wording and built-in vocabulary support.",
    iep504: "Apply accommodation-friendly chunking and pacing supports.",
    challenge: "Add extension prompts and transfer-oriented challenge tasks.",
    scaffolded: "Provide hints, sentence stems, and progressive scaffolds.",
    accessibleReading: "Target accessible reading level and concise sentence structure.",
  };

  const questionCountMultiplier: Record<DifferentiationProfile, number> = {
    standard: 1,
    remedial: 0.8,
    honors: 1,
    ap: 1,
    ell: 0.85,
    iep504: 0.85,
    challenge: 1.1,
    scaffolded: 0.9,
    accessibleReading: 0.85,
  };

  const nextCount = base.questionCount
    ? Math.max(3, Math.round(base.questionCount * questionCountMultiplier[profile]))
    : undefined;

  return {
    ...base,
    questionCount: nextCount,
    studentLevel: levelMap[profile],
    additionalDetails: `${base.additionalDetails ?? ""} ${profileDirective[profile]} ${stylePhrase}`.trim(),
    differentiation: {
      profiles: [profile],
      transformStyle,
    },
  };
}

export async function runDifferentiatePipeline(internal: any) {
  const sourceMode: "upload" | "scratch" = internal?.sourceMode === "scratch" ? "scratch" : "upload";
  const profiles = normalizeProfiles(internal?.profiles);
  const transformStyle = normalizeStyles(internal?.transformStyle);

  const base = sourceMode === "scratch" ? buildBaseFromScratch(internal) : buildBaseFromUpload(internal);
  const sourceInsights = buildDocumentInsights(
    sourceMode === "upload"
      ? String(internal?.text ?? "")
      : `${internal?.scratch?.topic ?? ""}\n${internal?.scratch?.course ?? ""}`
  );

  if (sourceInsights.flags.unreadable) {
    return {
      type: "differentiate" as const,
      sourceMode,
      sourceInsights,
      transformStyle,
      versions: [],
      generatedAt: new Date().toISOString(),
      status: "skipped",
      reason: "Document unreadable. Differentiation was skipped.",
    };
  }

  const versions: Array<{
    profile: DifferentiationProfile;
    label: string;
    studentLevel: string;
    notes: string;
    result: any;
  }> = [];

  for (const profile of profiles) {
    const request = withProfileOverlay(base, profile, transformStyle);
    const result = await runCreatePipeline(request, 0);
    versions.push({
      profile,
      label: PROFILE_LABELS[profile],
      studentLevel: request.studentLevel,
      notes: PROFILE_NOTES[profile],
      result,
    });
  }

  return {
    type: "differentiate" as const,
    sourceMode,
    sourceInsights,
    transformStyle,
    versions,
    generatedAt: new Date().toISOString(),
  };
}
