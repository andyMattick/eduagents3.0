/**
 * GenerationPreview.tsx
 *
 * Section-ordered, collapsible live preview shown while the pipeline is
 * generating an assessment and optionally as the "In Progress" view before
 * the full AssessmentViewer takes over.
 *
 * Features:
 *  - Items grouped by questionType in blueprint slot order
 *  - Collapsible section headers with "N / Total" live progress pills
 *  - True/False items already carry "Circle T or F." via the builder
 *    trueFalseFormatter (applied before items reach this component)
 *  - Works with raw GeneratedItem[] (during streaming) AND FinalAssessmentItem[]
 *    (after builder post-processing)
 */

import { useState } from "react";
import { groupItemsBySection, formatSectionHeader } from "@/pipeline/agents/builder/sectionGrouper";
import type { FinalAssessmentItem } from "@/pipeline/agents/builder/FinalAssessment";
import "./GenerationPreview.css";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Minimal item shape accepted by the preview.
 * Compatible with both GeneratedItem (raw) and FinalAssessmentItem (built).
 */
export interface PreviewItem {
  slotId: string;
  questionType: string;
  prompt: string;
  options?: string[];
  questionNumber?: number;
}

/** Blueprint shape expected by sectionGrouper (plan.slots or slots). */
interface BlueprintLike {
  plan?: { slots?: Array<{ id: string; questionType: string }> };
  slots?: Array<{ id: string; questionType: string }>;
}

// ── QuestionPreview ───────────────────────────────────────────────────────────

function QuestionPreview({ item, displayNumber }: { item: PreviewItem; displayNumber: number }) {
  const isMC = item.questionType === "multipleChoice";

  return (
    <div className="gp-question">
      <span className="gp-q-num">{displayNumber}.</span>
      <div className="gp-q-body">
        <p className="gp-q-prompt">{item.prompt}</p>
        {isMC && item.options && item.options.length > 0 && (
          <ul className="gp-options">
            {item.options.map((opt, i) => (
              <li key={i} className="gp-option">{opt}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── SectionBlock ─────────────────────────────────────────────────────────────

interface SectionBlockProps {
  name: string;
  items: PreviewItem[];
  total: number;
  startNumber: number;
}

function SectionBlock({ name, items, total, startNumber }: SectionBlockProps) {
  const [open, setOpen] = useState(true);
  const filled = items.length;
  const complete = filled >= total && total > 0;

  return (
    <div className={`gp-section${complete ? " gp-section--complete" : ""}`}>
      <button
        className="gp-section-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="gp-section-title">{formatSectionHeader(name)}</span>
        <span className={`gp-section-progress${complete ? " gp-section-progress--done" : ""}`}>
          {filled} / {total}
        </span>
        <span className="gp-section-chevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="gp-section-content">
          {items.map((item, idx) => (
            <QuestionPreview
              key={item.slotId}
              item={item}
              displayNumber={startNumber + idx}
            />
          ))}

          {/* Skeleton placeholders for slots not yet generated */}
          {Array.from({ length: Math.max(0, total - filled) }).map((_, i) => (
            <div key={`skeleton-${i}`} className="gp-skeleton">
              <span className="gp-skeleton-num">{startNumber + filled + i}.</span>
              <div className="gp-skeleton-lines">
                <div className="gp-skeleton-line gp-skeleton-line--long" />
                <div className="gp-skeleton-line gp-skeleton-line--short" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── GenerationPreview ─────────────────────────────────────────────────────────

export interface GenerationPreviewProps {
  /** Partial or complete list of generated items. */
  items: PreviewItem[];
  /**
   * Blueprint — used to derive section order and total slot counts.
   * When null/undefined the component falls back to ordering by first
   * appearance of each questionType.
   */
  blueprint?: BlueprintLike | null;
  /** When true shows a "Complete" badge instead of the loading indicator. */
  isComplete?: boolean;
  /** Optional human-readable title displayed above the preview. */
  title?: string;
}

export function GenerationPreview({
  items,
  blueprint,
  isComplete = false,
  title,
}: GenerationPreviewProps) {
  // Cast items to FinalAssessmentItem shape (sectionGrouper needs questionNumber
  // only for sorting, which is optional — slotId is the key).
  const castItems = items as unknown as FinalAssessmentItem[];
  const { sections, sectionOrder, totalPerSection } = groupItemsBySection(
    blueprint ?? null,
    castItems
  );

  // Compute 1-based display number offsets per section
  let runningNumber = 1;
  const sectionStartNumbers: Record<string, number> = {};
  for (const type of sectionOrder) {
    sectionStartNumbers[type] = runningNumber;
    runningNumber += totalPerSection[type] ?? 0;
  }

  const totalSlots = Object.values(totalPerSection).reduce((s, n) => s + n, 0);
  const totalFilled = items.length;

  return (
    <div className="generation-preview">
      {/* Header bar */}
      <div className="gp-header">
        {title && <span className="gp-header-title">{title}</span>}
        <span className={`gp-status-badge${isComplete ? " gp-status-badge--done" : ""}`}>
          {isComplete ? "✓ Complete" : `Generating… ${totalFilled} / ${totalSlots}`}
        </span>
      </div>

      {/* Section blocks */}
      {sectionOrder.map((type) => (
        <SectionBlock
          key={type}
          name={type}
          items={sections[type] ?? []}
          total={totalPerSection[type] ?? 0}
          startNumber={sectionStartNumbers[type] ?? 1}
        />
      ))}

      {sectionOrder.length === 0 && !isComplete && (
        <div className="gp-empty">
          <div className="gp-spinner" aria-label="Generating questions…" />
          <p className="gp-empty-label">Setting up your assessment…</p>
        </div>
      )}
    </div>
  );
}

export default GenerationPreview;
