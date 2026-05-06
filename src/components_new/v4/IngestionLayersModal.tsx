import { useEffect, useState } from "react";

type ItemLayer = {
  id: string;
  itemNumber: number;
  type: string;
  stem: string;
  metadata: {
    base: Record<string, unknown> | null;
    answerKey: Record<string, unknown> | null;
    worked: Record<string, unknown> | null;
    rubric: Record<string, unknown> | null;
    final: Record<string, unknown> | null;
  };
};

type ItemLayersResponse = {
  documentId: string;
  items: ItemLayer[];
};

type Props = {
  documentId: string;
  documentName?: string;
  onClose: () => void;
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

  const selectedItem = data?.items[selectedItemIndex] ?? null;

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
          <div style={{ width: "160px", borderRight: "1px solid #e2e8f0", overflowY: "auto", background: "#f8fafc", flexShrink: 0 }}>
            {loading && <p style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#94a3b8" }}>Loading…</p>}
            {!loading && !error && data?.items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemIndex(idx)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "0.6rem 0.75rem", border: "none", cursor: "pointer",
                  background: idx === selectedItemIndex ? "#dbeafe" : "transparent",
                  color: idx === selectedItemIndex ? "#1e40af" : "#374151",
                  fontWeight: idx === selectedItemIndex ? 600 : 400,
                  fontSize: "0.82rem", borderBottom: "1px solid #e2e8f0"
                }}
              >
                Item {item.itemNumber}
                {item.metadata.final && <span style={{ display: "block", fontSize: "0.7rem", color: "#64748b" }}>{item.type}</span>}
              </button>
            ))}
          </div>

          {/* Layer panel */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem" }}>
            {loading && <p style={{ color: "#64748b" }}>Loading ingestion layers…</p>}
            {error && <p style={{ color: "#dc2626" }}>{error}</p>}
            {!loading && !error && !data?.items.length && (
              <p style={{ color: "#64748b" }}>
                No items found for this document. Upload and ingest the test document first, then run the washover pipeline by creating a session with companion documents.
              </p>
            )}
            {!loading && !error && selectedItem && (
              <>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "#64748b", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Item {selectedItem.itemNumber}: {selectedItem.stem.slice(0, 120)}{selectedItem.stem.length > 120 ? "…" : ""}
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
                <FinalLayerPanel final={selectedItem.metadata.final} base={selectedItem.metadata.base} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
