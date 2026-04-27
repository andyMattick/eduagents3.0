export function extractSubItems(text: string): Array<{ itemNumber: number; text: string }> {
  const lines = text.split(/\r?\n/);

  return lines
    .filter((line) => /^[a-h]\)/i.test(line.trim()))
    .map((line, index) => ({
      itemNumber: index + 1,
      text: line.replace(/^[a-h]\)\s*/i, "").trim(),
    }));
}