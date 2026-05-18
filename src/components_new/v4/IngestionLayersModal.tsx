import { useEffect, useState } from "react";

type PrepLayer = {
  strength: "strong" | "partial" | "weak" | "none";
  conceptMatch: number;
  bloomAlignment: "aligned" | "below";
  representationAlignment: "aligned" | "mismatch";
  stepAlignment: "aligned" | "mismatch";
  coveredConcepts: string[];
  evidence?: string[];
  inferredOnly?: boolean;
  difficultyAdjustment: number;
  confusionAdjustment: number;
  timeMultiplier: number;
  bloomAdjustment: number;
} | null;

type ItemLayer = {
  id: string;
  itemNumber: number;
  type: string;
  logicalLabel?: string | null;
  groupId?: string | null;
  partIndex?: number;
  isParent?: boolean;
  stem: string;
  metadata: {
    base: Record<string, unknown> | null;
    answerKey: Record<string, unknown> | null;
    worked: Record<string, unknown> | null;
    rubric: Record<string, unknown> | null;
    prep: PrepLayer;
    final: Record<string, unknown> | null;
  };
};

type ItemLayersResponse = {
  documentId: string;
  items: ItemLayer[];
};

type ItemLayerGroup = {
  id: string;
  parent: ItemLayer | null;
  children: ItemLayer[];
};

type Props = {
  documentId: string;
  documentName?: string;
  onClose: () => void;
};

const PREP_STRENGTH_META: Record<
  NonNullable<PrepLayer>["strength"],
  { label: string; bg: string; fg: string }
> = {
  strong:  { label: "Strong",  bg: "#dcfce7", fg: "#166534" },
  partial: { label: "Partial", bg: "#fef9c3", fg: "#854d0e" },
  weak:    { label: "Weak",    bg: "#ffedd5", fg: "#9a3412" },
  none:    { label: "None",    bg: "#fee2e2", fg: "#991b1b" },
};

const DISPLAY_LABELS: Record<string, string> = {
  bloomLevel: "Bloom Level",
  cognitiveLoad: "Cognitive Load",
  linguisticLoad: "Linguistic Load",
  representationLoad: "Representation Load",
  symbolDensity: "Symbol Density",
  vocabularyCount: "Vocabulary Count",
  stepCount: "Step Count",
  stemLength: "Stem Length",
  itemType: "Item Type",
  distractorStructure: "Distractor Structure",
  difficultyScore: "Difficulty Score",
  confusionScore: "Confusion Score",
  timeSeconds: "Time-on-Task (s)",
  misconceptionLikelihood: "Misconception Likelihood",
  partialCreditEnabled: "Partial Credit",
  qualityThreshold: "Mastery Threshold",
  rubricStrictness: "Rubric Strictness",
  rubricTolerance: "Rubric Tolerance",
  requiredElementsCount: "Required Elements",
  branchingFactor: "Branching Factor",
  errorOpportunityCount: "Error Opportunities",
  correctAnswer: "Correct Answer",
  pCorrectAdjustment: "P(Correct) Adjustment",
  reasoningComplexity: "Reasoning Complexity",
  cognitiveSteps: "Cognitive Steps",
  timeOnTaskAdjustment: "Time-on-Task Adjustment",
  bloomGapAdjustment: "Bloom Gap Adjustment",
  rubricDifficulty: "Rubric Difficulty",
  masteryThreshold: "Mastery Threshold",
  bloomAlignment: "Bloom Alignment",
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Enabled" : "Disabled";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(4);
  if (Array.isArray(v)) return `[${v.map((x) => (typeof x === "number" ? x.toFixed(2) : String(x))).join(", ")}]`;
  return String(v);
}

function isScalarKey(key: string): boolean {
  return ![
    "stepDifficultyCurve", "stepTimeCurve", "stepCognitiveLoadCurve",
    "pCorrectAdjustment", "timeOnTaskAdjustment", "bloomGapAdjustment",
    "extractedProblemId", "sourceSpan"
  ].includes(key) && DISPLAY_LABELS[key] !== undefined;
}

function DiffRow({ label, prev, next }: { label: string; prev: unknown; next: unknown }) {
  const prevStr = formatValue(prev);
  const nextStr = formatValue(next);
  const changed = prevStr !== nextStr;
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", fontSize: "0.82rem", padding: "0.15rem 0" }}>
      <span style={{ color: "#64748b", minWidth: "11rem", flexShrink: 0 }}>{label}:</span>
      {changed ? (
        <span>
          <span style={{ color: "#94a3b8", textDecoration: "line-through" }}>{prevStr}</span>
          <span style={{ color: "#94a3b8", margin: "0 0.3rem" }}>→</span>
          <span style={{ color: "#0f172a", fontWeight: 600 }}>{nextStr}</span>
        </span>
      ) : (
        <span style={{ color: "#334155" }}>{nextStr}</span>
      )}
    </div>
  );
}

function BaseLayerPanel({ base }: { base: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(true);
  if (!base) return <p style={{ color: "#94a3b8", fontSize: "0.82rem" }}>No base traits available. Upload and ingest the test document.</p>;
  const keys = Object.keys(base).filter(isScalarKey);
  return (
    <div style={{ borderLeft: "3px solid #3b82f6", paddingLeft: "0.75rem", marginBottom: "0.75rem" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", color: "#1e3a5f", padding: 0, marginBottom: "0.4rem" }}
      >
        {open ? "▾" : "▸"} Layer 1 — Test (Base Traits)
      </button>
      {open && (
        <div>
          {keys.map((k) => (
            <div key={k} style={{ display: "flex", gap: "0.5rem", fontSize: "0.82rem", padding: "0.15rem 0" }}>
              <span style={{ color: "#64748b", minWidth: "11rem", flexShrink: 0 }}>{DISPLAY_LABELS[k] ?? k}:</span>
              <span style={{ color: "#334155" }}>{formatValue(base[k])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OverrideLayerPanel({
  title,
  borderColor,
  layer,
  prev,
}: {
  title: string;
  borderColor: string;
  layer: Record<string, unknown> | null;
  prev: Record<string, unknown> | null;
}) {
  const [open, setOpen] = useState(true);
  if (!layer) {
    return (
      <div style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: "0.75rem", marginBottom: "0.75rem", opacity: 0.5 }}>
        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#64748b" }}>{title}</span>
        <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "0.2rem 0 0" }}>No companion document uploaded for this layer.</p>
      </div>
    );
  }
  const keys = Object.keys(layer).filter(isScalarKey);
  const prevObj = prev ?? {};
  return (
    <div style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: "0.75rem", marginBottom: "0.75rem" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", color: "#1e3a5f", padding: 0, marginBottom: "0.4rem" }}
      >
        {open ? "▾" : "▸"} {title}
      </button>
      {open && (
        <div>
          {keys.length === 0 && <p style={{ fontSize: "0.82rem", color: "#94a3b8" }}>No changes detected.</p>}
          {keys.map((k) => (
            <DiffRow key={k} label={DISPLAY_LABELS[k] ?? k} prev={prevObj[k]} next={layer[k]} />
          ))}
        </div>
      )}
    </div>
  );
}

function PrepLayerPanel({ prep }: { prep: PrepLayer }) {
  const [open, setOpen] = useState(true);
  if (!prep) {
    return (
      <div style={{ borderLeft: "3px solid #0d9488", paddingLeft: "0.75rem", marginBottom: "0.75rem", opacity: 0.5 }}>
        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#64748b" }}>Layer 5 — Prep-Doc Washover</span>
        <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "0.2rem 0 0" }}>
          No prep coverage analysed. Upload a prep companion document to enable Layer 5 coverage.
        </p>
      </div>
    );
  }
  const meta = PREP_STRENGTH_META[prep.strength] ?? PREP_STRENGTH_META.none;
  const deltaRows = [
    ["Difficulty Adjustment", `${prep.difficultyAdjustment > 0 ? "+" : ""}${(prep.difficultyAdjustment * 100).toFixed(0)}%`],
    ["Confusion Adjustment", `${prep.confusionAdjustment > 0 ? "+" : ""}${(prep.confusionAdjustment * 100).toFixed(0)}%`],
    ["Time Multiplier", `${prep.timeMultiplier > 0 ? "+" : ""}${(prep.timeMultiplier * 100).toFixed(0)}%`],
    ["Bloom Adjustment", `${prep.bloomAdjustment > 0 ? "+" : ""}${prep.bloomAdjustment.toFixed(2)}`],
  ];
  return (
    <div style={{ borderLeft: "3px solid #0d9488", paddingLeft: "0.75rem", marginBottom: "0.75rem" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", color: "#1e3a5f", padding: 0, marginBottom: "0.4rem" }}
      >
        {open ? "▾" : "▸"} Layer 5 — Prep-Doc Washover
      </button>
      {open && (
        <div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Coverage strength:</span>
            <span style={{
              display: "inline-block", padding: "0.12rem 0.5rem", borderRadius: "9999px",
              fontSize: "0.72rem", fontWeight: 600, background: meta.bg, color: meta.fg,
            }}>{meta.label}</span>
            <span style={{ fontSize: "0.72rem", color: prep.inferredOnly ? "#9a3412" : "#0f766e", fontWeight: 600 }}>
              {prep.inferredOnly ? "Inferred from prep language" : "Explicit concept coverage"}
            </span>
          </div>
          {[
            ["Concept Match",            `${(prep.conceptMatch * 100).toFixed(0)}%`],
            ["Bloom Alignment",          prep.bloomAlignment],
            ["Representation Alignment", prep.representationAlignment],
            ["Step Alignment",           prep.stepAlignment],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", gap: "0.5rem", fontSize: "0.82rem", padding: "0.15rem 0" }}>
              <span style={{ color: "#64748b", minWidth: "11rem", flexShrink: 0 }}>{label}:</span>
              <span style={{ color: "#0f172a", fontWeight: 500 }}>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: "0.45rem", padding: "0.5rem 0.6rem", background: "rgba(13,148,136,0.05)", borderRadius: "0.4rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#0f766e", marginBottom: "0.25rem" }}>
              Applied deltas
            </div>
            {deltaRows.map(([label, value]) => (
              <div key={label} style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem", padding: "0.1rem 0" }}>
                <span style={{ color: "#64748b", minWidth: "11rem", flexShrink: 0 }}>{label}:</span>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
          {prep.coveredConcepts.length > 0 && (
            <div style={{ marginTop: "0.35rem", fontSize: "0.78rem", color: "#475569" }}>
              <span style={{ fontWeight: 600 }}>Covered concepts: </span>
              {prep.coveredConcepts.join(", ")}
            </div>
          )}
          {Array.isArray(prep.evidence) && prep.evidence.length > 0 && (
            <div style={{ marginTop: "0.45rem" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "0.2rem" }}>
                Evidence
              </div>
              {prep.evidence.slice(0, 6).map((line) => (
                <div key={line} style={{ fontSize: "0.78rem", color: "#334155", padding: "0.08rem 0" }}>
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FinalLayerPanel({ final, base }: { final: Record<string, unknown> | null; base: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(true);
  if (!final) return <p style={{ color: "#94a3b8", fontSize: "0.82rem" }}>Final traits not yet computed.</p>;
  const keys = Object.keys(final).filter(isScalarKey);
  return (
    <div style={{ borderLeft: "3px solid #059669", paddingLeft: "0.75rem", marginBottom: "0.75rem", background: "rgba(5,150,105,0.04)", borderRadius: "0 4px 4px 0" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", color: "#065f46", padding: "0.4rem 0", marginBottom: "0.2rem" }}
      >
        {open ? "▾" : "▸"} Final Traits Used in Simulation
      </button>
      {open && (
        <div>
          {keys.map((k) => (
            <div key={k} style={{ display: "flex", gap: "0.5rem", fontSize: "0.82rem", padding: "0.18rem 0" }}>
              <span style={{ color: "#047857", minWidth: "11rem", flexShrink: 0 }}>{DISPLAY_LABELS[k] ?? k}:</span>
              <span style={{ color: "#064e3b", fontWeight: 600 }}>{formatValue(final[k])}</span>
              {base && base[k] !== undefined && String(formatValue(base[k])) !== String(formatValue(final[k])) && (
                <span style={{ color: "#94a3b8", fontSize: "0.75rem", marginLeft: "0.3rem" }}>
                  (was {formatValue(base[k])})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function IngestionLayersModal({ documentId, documentName, onClose }: Props) {
  const [data, setData] = useState<ItemLayersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/v4/documents/${encodeURIComponent(documentId)}/item-layers`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load item layers (${r.status})`);
        return r.json() as Promise<ItemLayersResponse>;
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : "Load failed"); setLoading(false); });
  }, [documentId]);

  const groupedItems: ItemLayerGroup[] = (() => {
    if (!data?.items?.length) {
      return [];
    }

    const groups = new Map<string, ItemLayerGroup>();
    for (const item of data.items) {
      const groupKey = item.groupId ?? String(item.itemNumber);
      const current = groups.get(groupKey) ?? { id: groupKey, parent: null, children: [] };
      const isChild = (item.partIndex ?? 0) > 0 || item.isParent === false;
      if (isChild) {
        current.children.push(item);
      } else if (!current.parent) {
        current.parent = item;
      } else {
        current.children.push(item);
      }
      groups.set(groupKey, current);
    }

    return [...groups.values()].sort((left, right) => {
      const leftNumber = left.parent?.itemNumber ?? left.children[0]?.itemNumber ?? 0;
      const rightNumber = right.parent?.itemNumber ?? right.children[0]?.itemNumber ?? 0;
      return leftNumber - rightNumber;
    }).map((group) => ({
      ...group,
      children: [...group.children].sort((left, right) => (left.partIndex ?? 0) - (right.partIndex ?? 0)),
    }));
  })();

  const selectableItems = groupedItems.flatMap((group) => {
    const ordered: ItemLayer[] = [];
    if (group.parent) {
      ordered.push(group.parent);
    }
    ordered.push(...group.children);
    return ordered;
  });

  const hasPrepLayerData = selectableItems.some((item) => item.metadata.prep !== null);
  const uncoveredByPrepItems = hasPrepLayerData
    ? selectableItems.filter((item) => {
      const prep = item.metadata.prep;
      if (!prep) {
        return true;
      }
      if (prep.strength === "none") {
        return true;
      }
      return prep.coveredConcepts.length === 0 && prep.conceptMatch <= 0.05;
    })
    : [];
  const prepGapAddendumLines = uncoveredByPrepItems.map((item) => {
    const isChild = (item.partIndex ?? 0) > 0 || item.isParent === false;
    const label = item.logicalLabel ?? String(item.itemNumber);
    const stemPreview = item.stem.trim().replace(/\s+/g, " ").slice(0, 140);
    return `${isChild ? "Sub-item" : "Item"} ${label}: ${stemPreview}${item.stem.length > 140 ? "..." : ""}`;
  });
  const prepGapAddendumText = prepGapAddendumLines.length > 0
    ? `Addendum: Topics/items missing from prep coverage\n\n${prepGapAddendumLines.map((line, index) => `${index + 1}. ${line}`).join("\n")}`
    : "";

  const selectedItem = selectableItems[selectedItemIndex] ?? null;
  const hasOnlyParentRows = selectableItems.length > 0
    && selectableItems.every((item) => (item.partIndex ?? 0) === 0 && item.isParent !== false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ingestion Layers"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center"
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: "10px", maxWidth: "760px", width: "100%",
        maxHeight: "88vh", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ padding: "1rem 1.25rem 0.75rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ingestion Layer Visualizer</p>
            <h2 style={{ margin: "0.1rem 0 0", fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
              {documentName ?? "Document"} — Ingestion Summary
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", color: "#64748b", padding: "0.25rem", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Item list */}
          <div style={{ width: "220px", borderRight: "1px solid #e2e8f0", overflowY: "auto", background: "#f8fafc", flexShrink: 0 }}>
            {loading && <p style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#94a3b8" }}>Loading…</p>}
            {!loading && !error && groupedItems.map((group) => {
              const orderedItems = [
                ...(group.parent ? [group.parent] : []),
                ...group.children,
              ];

              return (
                <div key={group.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  {orderedItems.map((item) => {
                    const idx = selectableItems.findIndex((candidate) => candidate.id === item.id);
                    const isChild = (item.partIndex ?? 0) > 0 || item.isParent === false;
                    const label = item.logicalLabel ?? (isChild ? `${item.itemNumber}` : String(item.itemNumber));

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemIndex(idx)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: isChild ? "0.55rem 0.75rem 0.55rem 1.35rem" : "0.6rem 0.75rem",
                          border: "none",
                          cursor: "pointer",
                          background: idx === selectedItemIndex ? "#dbeafe" : "transparent",
                          color: idx === selectedItemIndex ? "#1e40af" : "#374151",
                          fontWeight: idx === selectedItemIndex ? 600 : (isChild ? 500 : 700),
                          fontSize: "0.82rem",
                          borderTop: isChild ? "1px solid rgba(226,232,240,0.6)" : "none"
                        }}
                      >
                        <span style={{ display: "block" }}>{isChild ? `Sub-item ${label}` : `Item ${label}`}</span>
                        <span style={{ display: "block", fontSize: "0.7rem", color: idx === selectedItemIndex ? "#2563eb" : "#64748b" }}>{item.type || "assessment item"}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Layer panel */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem" }}>
            {loading && <p style={{ color: "#64748b" }}>Loading ingestion layers…</p>}
            {error && <p style={{ color: "#dc2626" }}>{error}</p>}
            {!loading && !error && hasOnlyParentRows && (
              <div style={{
                marginBottom: "0.9rem",
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                borderRadius: "0.6rem",
                padding: "0.7rem 0.8rem"
              }}>
                <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#1e3a8a" }}>
                  Why only parent items appear here
                </p>
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#1e40af" }}>
                  The structured item tree can show inferred sub-parts from segmentation, but this panel reads persisted v4 item-layer rows.
                  If child rows are not saved to v4 items, Layer 2-5 data is available only at parent level.
                </p>
              </div>
            )}
            {!loading && !error && hasPrepLayerData && uncoveredByPrepItems.length > 0 && (
              <div style={{
                marginBottom: "0.9rem",
                border: "1px solid #fca5a5",
                background: "#fff1f2",
                borderRadius: "0.6rem",
                padding: "0.7rem 0.8rem"
              }}>
                <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#9f1239" }}>
                  Prep coverage gaps: {uncoveredByPrepItems.length} test item{uncoveredByPrepItems.length !== 1 ? "s" : ""} not found in prep docs
                </p>
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#7f1d1d" }}>
                  Use this as an addendum checklist before merging into a single review document.
                </p>
                <div style={{ marginTop: "0.45rem", maxHeight: "7.2rem", overflowY: "auto", paddingLeft: "1rem" }}>
                  {uncoveredByPrepItems.map((item) => {
                    const isChild = (item.partIndex ?? 0) > 0 || item.isParent === false;
                    const label = item.logicalLabel ?? String(item.itemNumber);
                    return (
                      <div key={`prep-gap-${item.id}`} style={{ fontSize: "0.76rem", color: "#7f1d1d", padding: "0.08rem 0" }}>
                        {isChild ? "Sub-item" : "Item"} {label}: {item.stem.slice(0, 95)}{item.stem.length > 95 ? "…" : ""}
                      </div>
                    );
                  })}
                </div>
                <textarea
                  readOnly
                  value={prepGapAddendumText}
                  style={{
                    marginTop: "0.5rem",
                    width: "100%",
                    minHeight: "6rem",
                    resize: "vertical",
                    border: "1px solid #fecdd3",
                    borderRadius: "0.5rem",
                    padding: "0.5rem",
                    fontSize: "0.75rem",
                    color: "#881337",
                    background: "#fff"
                  }}
                />
              </div>
            )}
            {!loading && !error && !selectableItems.length && (
              <p style={{ color: "#64748b" }}>
                No items found for this document. Upload and ingest the test document first, then run the washover pipeline by creating a session with companion documents.
              </p>
            )}
            {!loading && !error && selectedItem && (
              <>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "#64748b", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {((selectedItem.partIndex ?? 0) > 0 || selectedItem.isParent === false) ? "Sub-item" : "Item"} {selectedItem.logicalLabel ?? selectedItem.itemNumber}: {selectedItem.stem.slice(0, 120)}{selectedItem.stem.length > 120 ? "…" : ""}
                </p>
                <BaseLayerPanel base={selectedItem.metadata.base} />
                <OverrideLayerPanel
                  title="Layer 2 — Answer Key Overrides"
                  borderColor="#f59e0b"
                  layer={selectedItem.metadata.answerKey}
                  prev={selectedItem.metadata.base}
                />
                <OverrideLayerPanel
                  title="Layer 3 — Worked Solutions Overrides"
                  borderColor="#8b5cf6"
                  layer={selectedItem.metadata.worked}
                  prev={selectedItem.metadata.answerKey ?? selectedItem.metadata.base}
                />
                <OverrideLayerPanel
                  title="Layer 4 — Rubric Overrides"
                  borderColor="#ef4444"
                  layer={selectedItem.metadata.rubric}
                  prev={selectedItem.metadata.worked ?? selectedItem.metadata.answerKey ?? selectedItem.metadata.base}
                />
                <PrepLayerPanel prep={selectedItem.metadata.prep ?? null} />
                <FinalLayerPanel final={selectedItem.metadata.final} base={selectedItem.metadata.base} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
