import type { TaggingPipelineInput, TaggingPipelineOutput } from "../../schema/semantic";
import type { Problem } from "../../schema/domain";
import type { ValidatedOverrides } from "../../teacherFeedback";
import { getProblemOverride, listTeacherDerivedTemplates } from "../../teacherFeedback";
import { applyLearningAdjustments, loadTemplateLearning } from "../learning/learningService";
import { buildConceptGraph } from "../document/buildConceptGraph";
import { buildDocumentInsights } from "../document/buildDocumentInsights";
import { applyTemplates, buildInternalProblemReasoning, fuseCognition, fuseOverrides, getPrioritizedTemplateMatches, getTemplateMatches, inferStructuralCognition, pickTemplatesForSubject, type InternalProblemReasoning, type TemplateCognitionInput } from "../cognitive";
import { extractProblems } from "../extract/extractProblem";
import { extractProblemMetadata } from "../extract/extractProblemMetadata";
import { extractTables } from "../extract/extractTables";
import { detectMultipart } from "../structure/detectMultipart";
import { buildProblemTagVector } from "../tag/buildProblemTagVector";
import { tagBloom } from "../tag/tagBloom";
import { tagConcepts } from "../tag/tagConcepts";
import { tagLinguisticLoad } from "../tag/tagLinguisticLoad";
import { tagMisconceptionTriggers } from "../tag/tagMisconceptionTriggers";
import { tagRepresentation } from "../tag/tagRepresentation";
import { tagStandards } from "../tag/tagStandards";

function toCanonicalProblem(
  documentId: string,
  problem: {
    problemId: string;
    localProblemId?: string;
    problemGroupId?: string;
    canonicalProblemId?: string;
    rootProblemId?: string;
    parentProblemId?: string | null;
    problemNumber?: number;
    partIndex?: number;
    partLabel?: string;
    teacherLabel?: string;
    stemText?: string;
    partText?: string;
    displayOrder?: number;
    createdAt?: string;
    rawText: string;
    cleanedText?: string;
    mediaUrls?: string[];
    correctAnswer?: Problem["correctAnswer"];
    rubric?: Problem["rubric"];
    sourceType: Problem["sourceType"];
    sourceDocumentId?: string;
    sourcePageNumber?: number;
  },
  tags: Problem["tags"]
): Problem {
  return {
    problemId: problem.problemId,
    localProblemId: problem.localProblemId ?? problem.problemId,
    problemGroupId: problem.problemGroupId ?? problem.rootProblemId ?? problem.problemId,
    canonicalProblemId: `${documentId}::${problem.problemId}`,
    rootProblemId: problem.rootProblemId,
    parentProblemId: problem.parentProblemId,
    problemNumber: problem.problemNumber,
    partIndex: problem.partIndex,
    partLabel: problem.partLabel,
    teacherLabel: problem.teacherLabel,
    stemText: problem.stemText,
    partText: problem.partText,
    displayOrder: problem.displayOrder,
    createdAt: problem.createdAt,
    rawText: problem.rawText,
    cleanedText: problem.cleanedText,
    mediaUrls: problem.mediaUrls,
    correctAnswer: problem.correctAnswer,
    rubric: problem.rubric,
    sourceType: problem.sourceType,
    sourceDocumentId: problem.sourceDocumentId,
    sourcePageNumber: problem.sourcePageNumber,
    tags,
  };
}

type InternalProblem = Problem & {
	reasoning?: InternalProblemReasoning;
};

export async function runSemanticPipeline(input: TaggingPipelineInput): Promise<TaggingPipelineOutput> {
  const learningRecords = await loadTemplateLearning();
  const extractedProblems = detectMultipart(extractProblems(input.azureExtract));
  const tablesByProblemId = extractTables(input.azureExtract, extractedProblems);
  const problems = extractProblemMetadata(extractedProblems, tablesByProblemId);
  const multipartParentIds = new Set(
    problems
      .filter((candidate) => candidate.parentProblemId)
      .map((candidate) => candidate.parentProblemId!)
  );
  const concepts = tagConcepts(problems);
  const linguistic = tagLinguisticLoad(problems);
  const bloom = tagBloom(problems);
  const representation = tagRepresentation(problems);
  const misconceptions = tagMisconceptionTriggers(problems);
  const standards = tagStandards(problems);
  const problemVectors = buildProblemTagVector({
    problems,
    concepts,
    linguistic,
    bloom,
    representation,
    misconceptions,
    standards,
  });
  const enrichedProblems = await Promise.all(problems.map(async (problem, index) => {
    const azureTags = problemVectors[index];
    const seedProblem = {
      ...problem,
      tags: azureTags,
    };
    const structural = inferStructuralCognition(seedProblem, {
      isMultipartParent: multipartParentIds.has(problem.problemId),
    });
    const teacherTemplates = applyLearningAdjustments(
      await listTeacherDerivedTemplates(azureTags.subject, azureTags.domain),
      learningRecords,
    );
    const subjectTemplates = applyLearningAdjustments(
      pickTemplatesForSubject(azureTags.subject),
      learningRecords,
    );
    const subjectTemplateMatches = getTemplateMatches(seedProblem, subjectTemplates);
    const teacherTemplateMatches = getTemplateMatches(seedProblem, teacherTemplates);
    const prioritizedMatches = getPrioritizedTemplateMatches(seedProblem, subjectTemplates, teacherTemplates);
    const primaryMatch = prioritizedMatches[0];
    const matchedSubjectTemplates = subjectTemplateMatches.map((result) => result.template);
    const matchedTeacherTemplates = teacherTemplateMatches.map((result) => result.template);
    const domainTemplate = applyTemplates(seedProblem, subjectTemplates);
    const teacherTemplate = applyTemplates(seedProblem, teacherTemplates);
    const selectedStepMatch = prioritizedMatches.find((result) => result.template.stepHints);
    const stepReasoning: TemplateCognitionInput["reasoning"] = selectedStepMatch?.template.stepHints
      ? {
          templateExpectedSteps: selectedStepMatch.template.stepHints.expectedSteps,
          templateConfidence: selectedStepMatch.confidence,
          templateIsBestGuess: selectedStepMatch.isBestGuess,
          stepType: selectedStepMatch.template.stepHints.stepType,
          templateId: selectedStepMatch.template.id,
        templateSource: selectedStepMatch.source === "teacher" ? "teacher" : "subject",
        }
      : undefined;
    const useTeacherTemplateAsPrimary = primaryMatch?.source === "teacher";
    const template = {
      ...(useTeacherTemplateAsPrimary ? domainTemplate : {}),
      ...(useTeacherTemplateAsPrimary ? teacherTemplate : domainTemplate),
      bloom: {
        remember: useTeacherTemplateAsPrimary
          ? teacherTemplate.bloom?.remember ?? domainTemplate.bloom?.remember ?? 0
          : domainTemplate.bloom?.remember ?? 0,
        understand: useTeacherTemplateAsPrimary
          ? teacherTemplate.bloom?.understand ?? domainTemplate.bloom?.understand ?? 0
          : domainTemplate.bloom?.understand ?? 0,
        apply: useTeacherTemplateAsPrimary
          ? teacherTemplate.bloom?.apply ?? domainTemplate.bloom?.apply ?? 0
          : domainTemplate.bloom?.apply ?? 0,
        analyze: useTeacherTemplateAsPrimary
          ? teacherTemplate.bloom?.analyze ?? domainTemplate.bloom?.analyze ?? 0
          : domainTemplate.bloom?.analyze ?? 0,
        evaluate: useTeacherTemplateAsPrimary
          ? teacherTemplate.bloom?.evaluate ?? domainTemplate.bloom?.evaluate ?? 0
          : domainTemplate.bloom?.evaluate ?? 0,
        create: useTeacherTemplateAsPrimary
          ? teacherTemplate.bloom?.create ?? domainTemplate.bloom?.create ?? 0
          : domainTemplate.bloom?.create ?? 0,
      },
      reasoning: stepReasoning,
    };
    const cognitive = fuseCognition(azureTags, structural, template);
    const internalReasoning = buildInternalProblemReasoning(structural, template);
    const canonicalProblemId = `${input.documentId}::${problem.problemId}`;
    const overrides = await getProblemOverride(canonicalProblemId) as ValidatedOverrides | null;
    const overriddenProblem = fuseOverrides({
      ...seedProblem,
      canonicalProblemId,
      reasoning: internalReasoning,
      tags: {
        ...azureTags,
        cognitive,
		reasoning: {
			azureBloom: azureTags.bloom,
			structuralBloom: structural.bloom ?? {},
			templateIds: matchedSubjectTemplates.map((template) => template.id),
			teacherTemplateIds: matchedTeacherTemplates.map((template) => template.id),
			overridesApplied: Boolean(overrides),
			structuralMultiStep: structural.multiStep,
      selectedTemplateId: primaryMatch?.template.id,
      selectedTemplateName: primaryMatch?.template.name,
      selectedTemplateSource: primaryMatch?.source,
      selectedTemplateStatus: primaryMatch?.template.learningAdjustment?.status ?? "stable",
      selectedTemplateFrozen: primaryMatch?.template.learningAdjustment?.frozen ?? false,
      templateConfidence: typeof primaryMatch?.baseConfidence === "number" ? primaryMatch.baseConfidence : undefined,
      adjustedTemplateConfidence: typeof primaryMatch?.confidence === "number" ? primaryMatch.confidence : undefined,
      expectedSteps: selectedStepMatch?.template.learningAdjustment?.originalExpectedSteps ?? selectedStepMatch?.template.stepHints?.expectedSteps,
      adjustedExpectedSteps: selectedStepMatch?.template.stepHints?.expectedSteps,
		},
      },
    } as InternalProblem, overrides);

    return {
      problem: overriddenProblem,
      vector: overriddenProblem.tags!,
    };
  }));
  const enrichedProblemVectors = enrichedProblems.map((entry) => entry.vector);
  const taggedProblems = enrichedProblems.map((entry) => toCanonicalProblem(input.documentId, entry.problem, entry.vector));
  const conceptGraph = buildConceptGraph(enrichedProblemVectors);
  const documentInsights = buildDocumentInsights({
    documentId: input.documentId,
    azureExtract: input.azureExtract,
    problems: taggedProblems,
    problemVectors: enrichedProblemVectors,
    conceptGraph,
  });

  return {
    documentId: input.documentId,
    documentInsights,
    problems: taggedProblems,
    problemVectors: enrichedProblemVectors,
  };
}
