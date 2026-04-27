import type { AzureExtractResult } from "../../schema/semantic";
import type { IngestionSection } from "../types";

type CanonicalParagraph = NonNullable<AzureExtractResult["paragraphs"]>[number];

function getParagraphs(canonical: AzureExtractResult): CanonicalParagraph[] {
  if (canonical.paragraphs && canonical.paragraphs.length > 0) {
    return canonical.paragraphs;
  }

  if (canonical.pages.length > 0) {
    return canonical.pages
      .map((page) => ({
        text: page.text,
        pageNumber: page.pageNumber,
      }))
      .filter((paragraph) => paragraph.text.trim().length > 0);
  }

  return canonical.content.trim().length > 0
    ? [{ text: canonical.content, pageNumber: 1 }]
    : [];
}

function isHeading(paragraph: CanonicalParagraph) {
  const text = paragraph.text.trim();
  const looksLikeStandaloneHeading = /^[A-Z][A-Za-z0-9 ,:'"-]{0,80}$/.test(text);
  const shortTitleCaseLine =
    text.length <= 80 &&
    /^[A-Z]/.test(text) &&
    !/[.!?]$/.test(text) &&
    text.split(/\s+/).length <= 10;

  return paragraph.role === "title" || looksLikeStandaloneHeading || shortTitleCaseLine;
}

export function segmentSections(canonical: AzureExtractResult): IngestionSection[] {
  const sections: IngestionSection[] = [];
  let current: { sectionId: string; title?: string; text: string } | null = null;
  let sectionIndex = 0;

  for (const para of getParagraphs(canonical)) {
    const text = para.text.trim();
    if (!text) {
      continue;
    }

    if (isHeading(para)) {
      if (current && current.text.trim().length > 0) {
        sections.push(current);
      }
      sectionIndex += 1;
      current = {
        sectionId: `sec-${sectionIndex}`,
        title: text,
        text: ""
      };
    } else {
      if (!current) {
        sectionIndex += 1;
        current = {
          sectionId: `sec-${sectionIndex}`,
          text: "",
        };
      }

      current.text += text + "\n\n";
    }
  }

  if (current && current.text.trim().length > 0) {
    sections.push(current);
  }

  return sections;
}
