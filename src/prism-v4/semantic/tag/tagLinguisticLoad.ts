import { ProblemWithMetadata } from "../extract/extractProblemMetadata";
import { countSyllables, splitSentences } from "../utils/textUtils";
import { clamp01 } from "../utils/heuristics";

export interface LinguisticTags {
  linguisticLoad: Record<string, number>;
  vocabularyTier: Record<string, number>;
  sentenceComplexity: Record<string, number>;
  wordProblem: Record<string, number>;
  passiveVoice: Record<string, number>;
  abstractLanguage: Record<string, number>;
}

export function tagLinguisticLoad(
  problems: ProblemWithMetadata[]
): LinguisticTags {
  const linguisticLoad: Record<string, number> = {};
  const vocabularyTier: Record<string, number> = {};
  const sentenceComplexity: Record<string, number> = {};
  const wordProblem: Record<string, number> = {};
  const passiveVoice: Record<string, number> = {};
  const abstractLanguage: Record<string, number> = {};

  for (const p of problems) {
    const text = p.cleanedText || p.rawText || "";
    const sentences = splitSentences(text);
    const words = text.split(/\s+/).filter(Boolean);

    const avgSentenceLength = sentences.length
      ? words.length / sentences.length
      : words.length;

    const avgSyllables =
      words.length > 0
        ? words.reduce((sum, w) => sum + countSyllables(w), 0) / words.length
        : 1;

    const load = clamp01((avgSentenceLength / 20 + avgSyllables / 3) / 2);
    linguisticLoad[p.problemId] = load;

    vocabularyTier[p.problemId] =
      avgSyllables < 1.5 ? 1 : avgSyllables < 2.5 ? 2 : 3;

    sentenceComplexity[p.problemId] = clamp01(avgSentenceLength / 25);

    wordProblem[p.problemId] = /\bstory\b|\bword problem\b|\bscenario\b|\bhow many\b|\bhow much\b/i.test(text)
      ? 1
      : 0;

    passiveVoice[p.problemId] = /\bwas\b\s+\w+ed\b|\bwere\b\s+\w+ed\b/i.test(text)
      ? 0.7
      : 0.1;

    abstractLanguage[p.problemId] = /\bjustice\b|\bfreedom\b|\bidea\b|\bconcept\b/i.test(
      text
    )
      ? 0.8
      : 0.2;
  }

  return {
    linguisticLoad,
    vocabularyTier,
    sentenceComplexity,
    wordProblem,
    passiveVoice,
    abstractLanguage
  };
}
