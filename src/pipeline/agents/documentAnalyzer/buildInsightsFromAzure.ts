/**
 * AZURE DOCUMENT INTELLIGENCE → DOCUMENT INSIGHTS MAPPER
 *
 * Azure's prebuilt-layout model gives us clean, structured text with
 * paragraph roles and table data already separated.  We take advantage of:
 *   - `content`    → rawText for the semantic pipeline
 *   - `paragraphs` → section headings + richer structure seeding
 *   - `pages`      → per-page text for DocumentPage[]
 *   - `tables`     → pre-parsed tables (bypass regex extraction)
 *
 * The full semantic pipeline (concepts, vocab, formulas, examples) is still
 * run on the clean Azure text — Azure just replaces the pdf.js extraction
 * step, not the analysis step.
 */

import type { DocumentInsights, DocumentPage, DocumentSection, DocumentTable } from "@/pipeline/contracts";
import { buildDocumentInsights } from "./buildDocumentInsights";
import type { AzureExtractResult } from "./extractAzureText";

/** Heading-role names that Azure's layout model can assign to paragraphs */
const HEADING_ROLES = new Set(["title", "sectionHeading", "heading"]);

/**
 * Convert an `AzureExtractResult` into a full `DocumentInsights` object.
 *
 * Steps:
 *  1. Build `DocumentPage[]` from Azure's per-page content slices.
 *  2. Build seed `DocumentSection[]` from heading paragraphs (Azure already
 *     identified them) — these are injected as a structure hint.
 *  3. Build `DocumentTable[]` from Azure's structured table data.
 *  4. Run `buildDocumentInsights` on the clean `content` string so that
 *     all semantic extractors (concepts, vocab, formulas, etc.) run normally.
 *  5. Override the tables array with our richer, pre-parsed version.
 */
export function buildInsightsFromAzure(azureResult: AzureExtractResult): DocumentInsights {
  const rawText = (azureResult.content ?? "").trim();

  // ── 1. Per-page slices ────────────────────────────────────────────────────
  const pages: DocumentPage[] = azureResult.pages.map((p) => ({
    pageNumber: p.pageNumber,
    text: p.content ?? "",
  }));

  // ── 2. Section headings from paragraph roles ──────────────────────────────
  // We don't inject these into buildDocumentInsights directly (it doesn't
  // accept pre-built sections) but we capture them for post-merge below.
  const azureSections: DocumentSection[] = [];
  let sectionIdx = 0;
  const headingParagraphs = azureResult.paragraphs.filter((p) => HEADING_ROLES.has(p.role));

  for (const para of headingParagraphs) {
    const heading = para.text.trim();
    if (!heading) continue;
    azureSections.push({
      id: `section-az-${sectionIdx++}`,
      heading,
      content: "", // content will be populated by buildDocumentInsights structure pass
    });
  }

  // ── 3. Pre-parsed tables ──────────────────────────────────────────────────
  const azureTables: DocumentTable[] = azureResult.tables.map((t, i) => ({
    id: `table-az-${i}`,
    preview: t.preview ?? `Table (${t.rowCount}×${t.columnCount})`,
  }));

  // ── 4. Full semantic analysis on clean Azure text ─────────────────────────
  const insights = buildDocumentInsights(rawText, { pages, partiallyReadable: false });

  // ── 5. Merge Azure structure advantages ───────────────────────────────────
  //  • Tables: Azure's parser is far more accurate than our regex — use it.
  //  • Sections: If Azure found headings that the regex pass missed, add them.
  if (azureTables.length > 0) {
    insights.tables = azureTables;
  }

  if (azureSections.length > insights.sections.length) {
    // Azure found more headings — use its list as the canonical source
    insights.sections = azureSections.map((sec, i) => ({
      ...sec,
      // Keep any content that buildDocumentInsights extracted for the same idx
      content: insights.sections[i]?.content ?? "",
    }));
  }

  return insights;
}
