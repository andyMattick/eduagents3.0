import { withTemplate } from "../templateCarrier";
import { EvidenceBasedResponseProblemType } from "./EvidenceBasedResponseProblemType";
import { LiteraryAnalysisProblemType } from "./LiteraryAnalysisProblemType";
import { PairedPassagesProblemType } from "./PairedPassageProblemType";
import { ReadingComprehensionProblemType } from "./ReadingComprehensionProblemType";
import { ShortConstructedResponseProblemType } from "./ShortConstructedResponseProblemType";
import { VocabularyInContextProblemType } from "./VocabularyInContextProblemType";

const rawEnglishProblemTypes = [
  EvidenceBasedResponseProblemType,
  LiteraryAnalysisProblemType,
  PairedPassagesProblemType,
  ReadingComprehensionProblemType,
  ShortConstructedResponseProblemType,
  VocabularyInContextProblemType,
] as const;

export const englishProblemTypes = rawEnglishProblemTypes.map((templateEntry) =>
  withTemplate(templateEntry, "ELA")
);
