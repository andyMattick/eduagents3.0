import type { DocumentExample } from "@/pipeline/contracts";

export function extractExamples(text: string): DocumentExample[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const candidates = lines
    .filter((line) => /\?|\b(example|solve|explain|analyze|show your work|justify)\b/i.test(line))
    .slice(0, 25);

  return candidates.map((line) => ({
    text: line,
    type: /\bexample\b/i.test(line)
      ? "example"
      : /\b(step|worked)\b/i.test(line)
      ? "worked"
      : "question",
  }));
}
