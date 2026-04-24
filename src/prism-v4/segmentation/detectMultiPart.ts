export function detectMultiPart(text: string): boolean {
  const lines = text.split(/\r?\n/);
  return lines.some((line) => /^[a-h]\)/i.test(line.trim()));
}