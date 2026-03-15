export const SUBJECT_PROBLEM_TYPES: Record<string, string[]> = {
  biology: [
    "matching",            // paper-friendly replacement for dragDrop
    "fillBlank",           // fill-in-the-blank
    "sequencing",          // ScienceSequencingProblemType
    "classification",      // ScienceClassificationProblemType
    "diagramLabeling",     // ScienceDiagramLabelingProblemType
    "tableCompletion"      // ScienceTableCompletionProblemType
  ],

  science: [
    "matching",
    "fillBlank",
    "sequencing",
    "classification",
    "diagramLabeling",
    "tableCompletion",
    "dataInterpretation",
    "graphInterpretation"
  ],

  math: [
    "numericEntry",
    "equationConstruction",
    "tableCompletion",
    "graphInterpretation",
    "shortAnswer",
    "matching"
  ],

  english: [
    "multipleChoice",
    "shortAnswer",
    "extendedResponse",
    "essay",
    "passageExtendedResponse",
    "sourceComparison",
    "causeEffect",
    "sequencing"
  ],

  history: [
    "multipleChoice",
    "sourceComparison",
    "extendedResponse",
    "essay",
    "causeEffect",
    "sequencing",
    "classification",
    "timeline"
  ],

  stem: [
    "matching",
    "errorAnalysis",
    "designTask",
    "graphInterpretation",
    "tableCompletion",
    "shortAnswer"
  ],

  foreignLanguage: [
    "multipleChoice",
    "fillBlank",
    "shortAnswer",
    "sequencing"
  ],

  general: [
    "multipleChoice",
    "shortAnswer",
    "extendedResponse"
  ]
};
