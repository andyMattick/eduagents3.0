import type { DocumentInsights } from "@/pipeline/contracts";

const SUBJECT_KEYWORDS: Array<{ subject: string; terms: string[] }> = [
  { subject: "math", terms: ["equation", "algebra", "geometry", "calculus", "fraction", "solve"] },
  { subject: "science", terms: ["biology", "chemistry", "physics", "experiment", "hypothesis", "cell"] },
  { subject: "history", terms: ["history", "civilization", "war", "constitution", "revolution", "empire"] },
  { subject: "english", terms: ["literature", "thesis", "passage", "grammar", "vocabulary", "author"] },
];

function estimateReadingLevel(text: string): number | null {
  const words = text.match(/[A-Za-z]+/g) ?? [];
  if (words.length < 20) return null;
  const longWords = words.filter((word) => word.length >= 7).length;
  const ratio = longWords / words.length;
  return Number((4 + ratio * 10).toFixed(1));
}

function inferDifficulty(readingLevel: number | null, formulas: string[]): string | null {
  if (readingLevel == null) return null;
  if (readingLevel >= 10 || formulas.length >= 4) return "hard";
  if (readingLevel >= 7 || formulas.length >= 2) return "medium";
  return "easy";
}

function inferSubject(textLower: string): string | null {
  for (const candidate of SUBJECT_KEYWORDS) {
    if (candidate.terms.some((term) => textLower.includes(term))) return candidate.subject;
  }
  return null;
}

function inferGrade(text: string, readingLevel: number | null): string | null {
  const match = text.match(/\b(?:grade|gr\.?)\s*(K|[1-9]|1[0-2])\b/i);
  if (match) return match[1].toUpperCase();
  if (readingLevel == null) return null;
  if (readingLevel <= 5.5) return "5";
  if (readingLevel <= 8) return "8";
  if (readingLevel <= 10) return "10";
  return "11";
}

export function inferMetadata(input: {
  text: string;
  formulas: string[];
  topicCandidates: string[];
  unreadable: boolean;
  confidence: number;
}): DocumentInsights["metadata"] {
  if (input.unreadable || input.confidence < 0.6) {
    return {
      gradeEstimate: null,
      subjectEstimate: null,
      topicCandidates: [],
      difficulty: null,
      readingLevel: null,
    };
  }

  const textLower = input.text.toLowerCase();
  const readingLevel = estimateReadingLevel(input.text);

  return {
    gradeEstimate: inferGrade(input.text, readingLevel),
    subjectEstimate: inferSubject(textLower),
    topicCandidates: input.topicCandidates.slice(0, 8),
    difficulty: inferDifficulty(readingLevel, input.formulas),
    readingLevel,
  };
}
