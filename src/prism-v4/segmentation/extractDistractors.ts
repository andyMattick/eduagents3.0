export function extractDistractors(text: string): Array<{ label: string; text: string }> {
  const lines = text.split(/\r?\n/);

  return lines
    .filter((line) => /^[A-D][\.)]\s+/.test(line.trim()))
    .map((line) => {
      const label = line.trim()[0] ?? "";
      const cleaned = line.replace(/^[A-D][\.)]\s*/i, "").trim();
      return { label, text: cleaned };
    });
}