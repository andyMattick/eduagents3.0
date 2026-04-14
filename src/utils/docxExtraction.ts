import JSZip from "jszip";

const CONTAINER_NODES = new Set([
  "w:tbl",
  "w:tr",
  "w:tc",
  "w:txbxContent",
  "v:textbox",
  "w:drawing",
  "w:pict",
  "v:shape",
  "mc:AlternateContent",
]);

function cleanText(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/[\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRuns(paragraphNode: Node): string {
  const paragraphElement = paragraphNode as Element;
  const runs = paragraphElement.getElementsByTagName("w:t");

  let text = "";
  for (let i = 0; i < runs.length; i += 1) {
    text += runs[i].textContent ?? "";
  }

  return text;
}

function extractNode(node: Node, paragraphs: string[]): void {
  if (!node) {
    return;
  }

  const name = node.nodeName;

  if (name === "w:p") {
    const text = extractRuns(node);
    if (text.trim().length > 0) {
      paragraphs.push(text.trim());
    }
    return;
  }

  if (CONTAINER_NODES.has(name)) {
    node.childNodes.forEach((child) => extractNode(child, paragraphs));
    return;
  }

  node.childNodes.forEach((child) => extractNode(child, paragraphs));
}

export async function extractDocxParagraphs(arrayBuffer: ArrayBuffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const xml = await zip.file("word/document.xml")?.async("string");

  if (!xml) {
    throw new Error("DOCX missing document.xml");
  }

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    throw new Error("DOCX extraction failed: invalid XML in document.xml");
  }

  const paragraphs: string[] = [];
  extractNode(doc.documentElement, paragraphs);

  const cleaned = paragraphs
    .map((paragraph) => cleanText(paragraph))
    .filter((paragraph) => paragraph.length > 0);

  if (cleaned.some((paragraph) => /<\/?\s*w:/i.test(paragraph))) {
    throw new Error("Extraction failed: XML artifacts detected in output");
  }

  return cleaned;
}