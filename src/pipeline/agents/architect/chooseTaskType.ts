import { TASK_TYPES } from "pipeline/contracts/taskTypes";

export function chooseTaskType(
  domain: string,
  questionType: string,
  topic?: string
): string | undefined {
  void topic;
  const d = domain?.toLowerCase().trim();
  const qt = questionType?.toLowerCase().trim();

  // ELA
  if (d === "english" || d === "ela" || d === "language arts") {
    const mcqPool = [
      TASK_TYPES.english.inference,
      TASK_TYPES.english.evidence,
      TASK_TYPES.english.theme,
      TASK_TYPES.english.vocab,
    ];
    const saPool = [
      TASK_TYPES.english.inference,
      TASK_TYPES.english.evidence,
      TASK_TYPES.english.structure,
    ];
    if (qt === "multiplechoice") return pickOne(mcqPool);
    if (qt === "shortanswer") return pickOne(saPool);
    return pickOne([...mcqPool, ...saPool]);
  }

  // History
  if (d === "history" || d === "social studies" || d === "socialstudies") {
    return pickOne([
      TASK_TYPES.history.sourcing,
      TASK_TYPES.history.claimEvidence,
      TASK_TYPES.history.timeline,
      TASK_TYPES.history.map,
      TASK_TYPES.history.primarySource,
    ]);
  }

  // Science
  if (d === "science") {
    const mcqPool = [
      TASK_TYPES.science.cer,
      TASK_TYPES.science.phenomena,
      TASK_TYPES.science.graph,
      TASK_TYPES.science.dataTable,
    ];
    const saPool = [
      TASK_TYPES.science.cer,
      TASK_TYPES.science.experiment,
      TASK_TYPES.science.phenomena,
    ];
    if (qt === "multiplechoice") return pickOne(mcqPool);
    if (qt === "shortanswer") return pickOne(saPool);
    return pickOne([...mcqPool, ...saPool]);
  }

  // Math
  if (d === "math" || d === "mathematics") {
    return pickOne([
      TASK_TYPES.math.fluency,
      TASK_TYPES.math.concept,
      TASK_TYPES.math.application,
      TASK_TYPES.math.errorAnalysis,
    ]);
  }

  // STEM / CS
  if (d === "stem" || d === "computer science" || d === "cs") {
    return pickOne([
      TASK_TYPES.stem.debugging,
      TASK_TYPES.stem.modeling,
      TASK_TYPES.stem.engineering,
      TASK_TYPES.stem.compThinking,
    ]);
  }

  return undefined;
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
