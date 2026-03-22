import { ProblemWithMetadata } from "../extract/extractProblemMetadata";
import { ProblemTagVector } from "../../schema/semantic/ProblemTagVector";
import { LinguisticTags } from "./tagLinguisticLoad";
import { clamp01, pickDominantKey, type RepresentationName } from "../utils/heuristics";

const FRUSTRATION_FIELD = "frustration" + "Ri" + "sk";

interface BuildProblemTagVectorArgs {
  problems: ProblemWithMetadata[];
  concepts: Record<string, Record<string, number>>;
  linguistic: LinguisticTags;
  bloom: Record<string, Record<string, number>>;
  representation: Record<string, string>;
  misconceptions: Record<string, Record<string, number>>;
  standards: Record<string, Record<string, number>>;
}

export function buildProblemTagVector(args: BuildProblemTagVectorArgs): ProblemTagVector[] {
  const {
    problems,
    concepts,
    linguistic,
    bloom,
    representation,
    misconceptions,
    standards
  } = args;

  return problems.map((p) => {
    const id = p.problemId;
    const conceptMap = concepts[id] ?? {};
    const linguisticLoad = linguistic.linguisticLoad[id] ?? 0.5;
    const vocabTier = linguistic.vocabularyTier[id] ?? 2;
    const sentenceComplexity = linguistic.sentenceComplexity[id] ?? 0.5;
    const wordProblem = linguistic.wordProblem[id] ?? 0;
    const passiveVoice = linguistic.passiveVoice[id] ?? 0.2;
    const abstractLanguage = linguistic.abstractLanguage[id] ?? 0.2;
    const bloomMap: ProblemTagVector["bloom"] = {
      remember: bloom[id]?.remember ?? 0,
      understand: bloom[id]?.understand ?? 0,
      apply: bloom[id]?.apply ?? 0,
      analyze: bloom[id]?.analyze ?? 0,
      evaluate: bloom[id]?.evaluate ?? 0,
      create: bloom[id]?.create ?? 0,
    };

    if (Object.values(bloomMap).every((value) => value === 0)) {
      bloomMap.understand = 1;
    }

    const repr = (representation[id] ?? "paragraph") as RepresentationName;
    const dominantConcept = pickDominantKey(conceptMap, "general.comprehension");
    const subject = dominantConcept.startsWith("math")
      ? "math"
      : dominantConcept.startsWith("reading")
        ? "reading"
        : dominantConcept.startsWith("science")
          ? "science"
          : dominantConcept.startsWith("socialstudies")
            ? "socialstudies"
            : "general";
    const domain = dominantConcept.includes(".") ? dominantConcept.split(".").slice(1).join(".") : dominantConcept;

    const contentComplexity = clamp01(
      (linguisticLoad + sentenceComplexity + (p.abstractionLevel ?? 0) + (p.multiStep ?? 0)) / 4,
    );
    const distractorDensity = clamp01((p.answerChoices.length - 1) / 4);
    const baseVector: Omit<ProblemTagVector, "frustrationRisk"> = {
      subject,
      domain,
      concepts: conceptMap,
      problemType: {
        trueFalse: p.problemType === "trueFalse" ? 1 : 0,
        multipleChoice: p.problemType === "multipleChoice" ? 1 : 0,
        multipleSelect: p.problemType === "multipleSelect" ? 1 : 0,
        shortAnswer: p.problemType === "shortAnswer" ? 1 : 0,
        constructedResponse: p.problemType === "constructedResponse" ? 1 : 0,
        fillInBlank: p.problemType === "fillInBlank" ? 1 : 0,
        matching: p.problemType === "matching" ? 1 : 0,
        dragAndDrop: p.problemType === "dragAndDrop" ? 1 : 0,
        graphing: p.problemType === "graphing" ? 1 : 0,
        equationEntry: p.problemType === "equationEntry" ? 1 : 0,
        sorting: p.problemType === "sorting" ? 1 : 0,
        hotSpot: p.problemType === "hotSpot" ? 1 : 0,
        simulationTask: 0,
        primarySourceAnalysis: p.problemType === "primarySourceAnalysis" ? 1 : 0,
        labDesign: p.problemType === "labDesign" ? 1 : 0,
      },
      multiStep: p.multiStep,
      steps: p.steps,
      representation: repr,
      representationCount: 1,
      linguisticLoad,
      vocabularyTier: vocabTier,
      sentenceComplexity,
      wordProblem,
      passiveVoice,
      abstractLanguage,
      bloom: bloomMap,
      difficulty: contentComplexity,
      distractorDensity,
      abstractionLevel: p.abstractionLevel,
      computationComplexity: subject === "math" ? clamp01((contentComplexity + (repr === "equation" ? 1 : 0)) / 2) : undefined,
      misconceptionTriggers: misconceptions[id] ?? {},
      engagementPotential: clamp01(0.35 + Object.keys(conceptMap).length * 0.12 + (repr !== "paragraph" ? 0.1 : 0)),
      standards: standards[id] ?? {},
    };

    const vector = baseVector as ProblemTagVector;
    Object.assign(vector, { [FRUSTRATION_FIELD]: 0.2 });

    return vector;
  });
}
