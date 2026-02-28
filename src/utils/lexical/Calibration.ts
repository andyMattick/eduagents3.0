import { getLexicalProfile } from "./Profiles";

const SIMPLE_SYNONYMS: Record<string, string> = {
  analyze: "look at",
  evaluate: "judge",
  determine: "find",
  identify: "find",
  construct: "make",
  calculate: "work out",
  compare: "tell how they are the same",
  contrast: "tell how they are different",
  explain: "tell why",
  demonstrate: "show",
  illustrate: "show",
};

function splitLongSentences(text: string, maxWords: number): string {
  const sentences = text.split(/(?<=[.?!])\s+/);

  return sentences
    .map(sentence => {
      const words = sentence.split(" ");
      if (words.length <= maxWords) return sentence;

      const midpoint = Math.floor(words.length / 2);
      return (
        words.slice(0, midpoint).join(" ") +
        ". " +
        words.slice(midpoint).join(" ")
      );
    })
    .join(" ");
}

function simplifyVocabulary(text: string): string {
  let result = text;

  for (const [complex, simple] of Object.entries(SIMPLE_SYNONYMS)) {
    const regex = new RegExp(`\\b${complex}\\b`, "gi");
    result = result.replace(regex, simple);
  }

  return result;
}

export function applyLexicalCalibration(
  text: string,
  grade: number
): string {
  const profile = getLexicalProfile(grade);
  if (/[\\^=+\-*/]/.test(text)) {
  return text;
}

  if (!profile.simplifyVocabulary) return text;

  let result = simplifyVocabulary(text);
  result = splitLongSentences(result, profile.maxSentenceLength);

  return result;
}