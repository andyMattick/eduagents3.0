import { ArchitectV3Input } from "../types";

export function feasibilityPrecheck(input: ArchitectV3Input) {
  const issues: string[] = [];

  const conceptCount = Array.isArray(input.schema?.concepts)
    ? input.schema.concepts.length
    : 0;

  const itemCount = Array.isArray(input.schema?.items)
    ? input.schema.items.length
    : 0;

  if (itemCount === 0) {
    issues.push("No items were extracted from the document.");
  }

  if (conceptCount < 3) {
    issues.push("The document contains very few concepts; coverage may be limited.");
  }

  const typePrefs = input.teacherProfile?.question_type_preferences ?? {};
  if (Object.keys(typePrefs).length === 0) {
    issues.push("No teacher question type preferences found; using defaults.");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
