import { ProblemWithMetadata } from "../extract/extractProblemMetadata";

export function tagBloom(
  problems: ProblemWithMetadata[]
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  for (const p of problems) {
    const text = (p.cleanedText || p.rawText || "").toLowerCase();
    const scores = {
      remember: 0,
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
      create: 0
    };

    if (/\bdefine\b|\blist\b|\bidentify\b/.test(text)) scores.remember = 1;
    if (/\bexplain\b|\bsummarize\b|\bdescribe\b/.test(text)) scores.understand = 1;
    if (/\bsolve\b|\buse\b|\bapply\b/.test(text)) scores.apply = 1;
    if (/\banalyze\b|\bcompare\b|\bcontrast\b/.test(text)) scores.analyze = 1;
    if (/\bevaluate\b|\bargue\b|\bjustify\b/.test(text)) scores.evaluate = 1;
    if (/\bdesign\b|\bcreate\b|\bcompose\b/.test(text)) scores.create = 1;

    if (Object.values(scores).every((v) => v === 0)) {
      scores.remember = 0.5;
      scores.understand = 0.5;
    }

    result[p.problemId] = scores;
  }

  return result;
}
