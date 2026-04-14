import React from "react";
import type { AssessmentDocument, PrepDocument } from "../../prism-v4/schema/domain/Preparedness";
import { BlueprintActions, type GenerationMode } from "./BlueprintActions";
import { BlueprintHeader } from "./BlueprintHeader";
import { BlueprintMetrics } from "./BlueprintMetrics";

interface PreparednessBlueprintProps {
  prep: PrepDocument;
  assessment: AssessmentDocument;
  onGenerate: (mode: GenerationMode) => void;
  children?: React.ReactNode;
}

export function PreparednessBlueprint({ prep, assessment, onGenerate, children }: PreparednessBlueprintProps) {
  return (
    <>
      <BlueprintHeader />
      <BlueprintActions onGenerate={onGenerate} />
      <BlueprintMetrics prep={prep} assessment={assessment} />
      {children}
    </>
  );
}
