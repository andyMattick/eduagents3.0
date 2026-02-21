import { UnifiedAssessmentRequest } from "../contracts/assessmentContracts";
import { WriterDraft } from "../writer/WriterDraft";
import { AstronomerReport } from "./astronomerReport";
import { buildAstronomerPrompt } from "./astronomerPrompt";

export async function runAstronomer(input: {
  uar: UnifiedAssessmentRequest;
  writerDraft: WriterDraft;
}): Promise<AstronomerReport> {

  const { uar, writerDraft } = input;

  const prompt = buildAstronomerPrompt(uar, writerDraft);

  const raw = await callAI(prompt);

  const parsed = JSON.parse(raw);

  return parsed as AstronomerReport;
}
