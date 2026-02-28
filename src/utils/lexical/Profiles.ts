export interface GradeBandLexicalProfile {
  maxSentenceLength: number;
  maxWordLength: number;
  simplifyVocabulary: boolean;
}

export function getLexicalProfile(grade: number): GradeBandLexicalProfile {
  if (grade <= 2) {
    return {
      maxSentenceLength: 8,
      maxWordLength: 8,
      simplifyVocabulary: true,
    };
  }

  if (grade <= 5) {
    return {
      maxSentenceLength: 14,
      maxWordLength: 12,
      simplifyVocabulary: true,
    };
  }

  return {
    maxSentenceLength: 999,
    maxWordLength: 999,
    simplifyVocabulary: false,
  };
}