import type { TaggingPipelineInput, TaggingPipelineOutput } from "../../schema/semantic";
import type { Problem } from "../../schema/domain";
import { getProblemOverride, listTeacherDerivedTemplates } from "../../teacherFeedback";
import { buildConceptGraph } from "../document/buildConceptGraph";
import { buildDocumentInsights } from "../document/buildDocumentInsights";
import { applyTemplates, fuseCognition, fuseOverrides, getMatchedTemplates, inferStructuralCognition, pickTemplatesForSubject } from "../cognitive";
import { extractProblems } from "../extract/extractProblem";
import { extractProblemMetadata } from "../extract/extractProblemMetadata";
import { extractTables } from "../extract/extractTables";
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

export async function runSemanticPipeline(input: TaggingPipelineInput): Promise<TaggingPipelineOutput> {
  const extractedProblems = extractProblems(input.azureExtract);
  const tablesByProblemId = extractTables(input.azureExtract, extractedProblems);
  const problems = extractProblemMetadata(extractedProblems, tablesByProblemId);
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
    const structural = inferStructuralCognition(seedProblem);
    const teacherTemplates = await listTeacherDerivedTemplates(azureTags.subject, azureTags.domain);
    const subjectTemplates = pickTemplatesForSubject(azureTags.subject);
    const matchedSubjectTemplates = getMatchedTemplates(seedProblem, subjectTemplates);
    const matchedTeacherTemplates = getMatchedTemplates(seedProblem, teacherTemplates);
    const domainTemplate = applyTemplates(seedProblem, subjectTemplates);
    const teacherTemplate = applyTemplates(seedProblem, teacherTemplates);
    const template = {
      ...domainTemplate,
      ...teacherTemplate,
      bloom: {
        ...(domainTemplate.bloom ?? {}),
        ...(teacherTemplate.bloom ?? {}),
      },
    };
    const cognitive = fuseCognition(azureTags, structural, template);
    const canonicalProblemId = `${input.documentId}::${problem.problemId}`;
    const overrides = await getProblemOverride(canonicalProblemId);
    const overriddenProblem = fuseOverrides({
      ...seedProblem,
      canonicalProblemId,
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
		},
      },
    }, overrides);

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
