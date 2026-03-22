import type { TaggingPipelineInput, TaggingPipelineOutput } from "../../schema/semantic";
import type { Problem } from "../../schema/domain";
import { buildConceptGraph } from "../document/buildConceptGraph";
import { buildDocumentInsights } from "../document/buildDocumentInsights";
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

function toCanonicalProblem(problem: { problemId: string; rawText: string; cleanedText?: string; mediaUrls?: string[]; correctAnswer?: Problem["correctAnswer"]; rubric?: Problem["rubric"]; sourceType: Problem["sourceType"]; sourceDocumentId?: string; sourcePageNumber?: number; }, tags: Problem["tags"]): Problem {
  return {
    problemId: problem.problemId,
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
  const taggedProblems = problems.map((problem, index) => toCanonicalProblem(problem, problemVectors[index]));
  const conceptGraph = buildConceptGraph(problemVectors);
  const documentInsights = buildDocumentInsights({
    documentId: input.documentId,
    azureExtract: input.azureExtract,
    problems: taggedProblems,
    problemVectors,
    conceptGraph,
  });

  return {
    documentId: input.documentId,
    documentInsights,
    problems: taggedProblems,
    problemVectors,
  };
}
