// pipeline/contracts/TaskTypes.ts
export const TASK_TYPES = {
  english: {
    inference: "ela_inference",
    evidence: "ela_evidence",
    theme: "ela_theme",
    structure: "ela_structure",
    vocab: "ela_vocab",
    misconception: "ela_misconception",
  },
  history: {
    sourcing: "history_sourcing",
    claimEvidence: "history_claim_evidence",
    timeline: "history_timeline",
    map: "history_map_interpretation",
    primarySource: "history_primary_source",
  },
  science: {
    cer: "science_cer",
    phenomena: "science_phenomena",
    dataTable: "science_data_table",
    graph: "science_graph_interpretation",
    experiment: "science_experimental_design",
  },
  math: {
    fluency: "math_fluency",
    concept: "math_conceptual",
    application: "math_application",
    errorAnalysis: "math_error_analysis",
  },
  stem: {
    debugging: "stem_debugging",
    modeling: "stem_modeling",
    engineering: "stem_engineering_design",
    compThinking: "stem_computational_thinking",
  },
} as const;
