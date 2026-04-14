import React from "react";

export interface UploadedSource {
  name: string;
  tag: "PREP" | "TEST";
}

interface MergedSourcesListProps {
  sources: UploadedSource[];
  onRemove?: (index: number) => void;
}

export function MergedSourcesList({ sources, onRemove }: MergedSourcesListProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="v4-kicker" style={{ marginBottom: "0.5rem" }}>Merged Sources</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {sources.map((source, index) => (
          <span
            key={`${source.tag}-${source.name}-${index}`}
            className="v4-pill"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
          >
            <span>{source.tag}: {source.name}</span>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  color: "#7b3519",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
                aria-label={`Remove ${source.name}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
