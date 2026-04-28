import { useEffect, useState } from "react";

export interface PublicDocument {
  documentId: string;
  sourceFileName: string;
  sourceMimeType: string | null;
  isPublic: boolean;
  createdAt: string;
}

interface DocumentPickerProps {
  onClose: () => void;
  onSelectDocument?: (document: PublicDocument) => void;
}

/**
 * DocumentPicker — browse publicly shared teacher materials.
 * Displays metadata only; never exposes canonical document payloads.
 */
export function DocumentPicker({ onClose, onSelectDocument }: DocumentPickerProps) {
  const [docs, setDocs] = useState<PublicDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const shellStyle = {
    marginTop: "1rem",
    padding: "1.25rem",
    borderRadius: "18px",
    border: "1px solid rgba(86, 57, 32, 0.14)",
    background: "rgba(255, 251, 245, 0.96)",
    color: "#1f1a17",
  } as const;

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "0.75rem",
    marginBottom: "1rem",
  } as const;

  const cardStyle = {
    borderRadius: "18px",
    border: "1px solid rgba(86, 57, 32, 0.12)",
    background: "rgba(255, 255, 255, 0.76)",
    color: "#1f1a17",
    padding: "1rem",
  } as const;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setFetchError(null);

    fetch("/api/v4/documents?public=true", { credentials: "include" })
      .then(async (res) => {
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          throw new Error("Unexpected response from server");
        }
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error?.message ?? "Failed to load shared materials");
        }
        return payload.documents as PublicDocument[];
      })
      .then((result) => {
        if (!cancelled) setDocs(result);
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : "Failed to load shared materials");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="v4-document-picker" role="dialog" aria-label="Shared teacher materials" style={shellStyle}>
      <div className="v4-document-picker-header" style={headerStyle}>
        <h3 style={{ margin: 0, color: "#1f1a17" }}>Shared teacher materials</h3>
        <button type="button" className="v4-button v4-button-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      {isLoading && <p className="v4-body-copy">Loading…</p>}

      {fetchError && <p className="v4-error">{fetchError}</p>}

      {!isLoading && !fetchError && docs.length === 0 && (
        <p className="v4-body-copy">No shared materials available yet.</p>
      )}

      {!isLoading && !fetchError && docs.length > 0 && (
        <ul className="v4-document-list" aria-label="Public documents">
          {docs.map((doc) => (
            <li key={doc.documentId} className="v4-document-card v4-document-card--public" style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "start", flexWrap: "wrap" }}>
                <div>
                  <strong>{doc.sourceFileName}</strong>
                  {doc.sourceMimeType && (
                    <span className="v4-document-mime"> · {doc.sourceMimeType}</span>
                  )}
                </div>
                {onSelectDocument && (
                  <button
                    type="button"
                    className="v4-button v4-button-secondary"
                    onClick={() => onSelectDocument(doc)}
                    aria-label={`Use ${doc.sourceFileName}`}
                  >
                    Use document
                  </button>
                )}
              </div>
              <p className="v4-body-copy" style={{ fontSize: "0.75rem", color: "var(--v4-muted, #6b7280)" }}>
                Shared {new Date(doc.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
