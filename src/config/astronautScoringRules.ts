export interface AstronautRubric {
  gradeBandBaselines: {
    "3-5": {
      readingLevel: [number, number];
      mathLevel: [number, number];
      stamina: [number, number];
      reasoning: [number, number];
      confusionTolerance: [number, number];
    };
    "6-8": {
      readingLevel: [number, number];
      mathLevel: [number, number];
      stamina: [number, number];
      reasoning: [number, number];
      confusionTolerance: [number, number];
    };
    "9-12": {
      readingLevel: [number, number];
      mathLevel: [number, number];
      stamina: [number, number];
      reasoning: [number, number];
      confusionTolerance: [number, number];
    };
  };
  classLevelMultipliers: {
    standard: number;
    honors: number;
    AP: number;
  };
  subjectModifiers: {
    math: { mathLevel: number; readingLevel: number; reasoning: number };
    english: { readingLevel: number; reasoning: number; mathLevel: number };
    science: { mathLevel: number; reasoning: number; readingLevel: number };
    history: { readingLevel: number; reasoning: number; mathLevel: number };
    general: { mathLevel: number; readingLevel: number; reasoning: number };
  };
  overlayMultipliers: {
    adhd: { stamina: number; reasoning: number; confusionTolerance: number };
    dyslexia: { readingLevel: number; confidence: number };
    fatigue_sensitive: { stamina: number; reasoning: number };
    esl: { readingLevel: number; confidence: number };
    anxiety_prone: { confidence: number; confusionTolerance: number };
  };
}

export function getAstronautScoringRules(): AstronautRubric {
  return {
    gradeBandBaselines: {
      "3-5": {
        readingLevel: [0.30, 0.60],
        mathLevel: [0.35, 0.65],
        stamina: [0.45, 0.75],
        reasoning: [0.35, 0.65],
        confusionTolerance: [0.50, 0.80],
      },
      "6-8": {
        readingLevel: [0.40, 0.70],
        mathLevel: [0.45, 0.75],
        stamina: [0.45, 0.75],
        reasoning: [0.45, 0.75],
        confusionTolerance: [0.45, 0.75],
      },
      "9-12": {
        readingLevel: [0.55, 0.85],
        mathLevel: [0.55, 0.85],
        stamina: [0.50, 0.80],
        reasoning: [0.55, 0.85],
        confusionTolerance: [0.45, 0.75],
      },
    },
    classLevelMultipliers: {
      standard: 1.0,
      honors: 1.10,
      AP: 1.20,
    },
    subjectModifiers: {
      math: { mathLevel: 1.1, readingLevel: 1.0, reasoning: 1.0 },
      english: { readingLevel: 1.1, reasoning: 1.0, mathLevel: 1.0 },
      science: { mathLevel: 1.0, reasoning: 1.1, readingLevel: 1.0 },
      history: { readingLevel: 1.1, reasoning: 1.0, mathLevel: 1.0 },
      general: { mathLevel: 1.0, readingLevel: 1.0, reasoning: 1.0 },
    },
    overlayMultipliers: {
      adhd: { stamina: 0.85, reasoning: 0.90, confusionTolerance: 0.75 },
      dyslexia: { readingLevel: 0.65, confidence: 0.80 },
      fatigue_sensitive: { stamina: 0.75, reasoning: 0.85 },
      esl: { readingLevel: 0.75, confidence: 0.85 },
      anxiety_prone: { confidence: 0.80, confusionTolerance: 0.70 },
    },
  };
}