import { useEffect, useMemo, useState } from "react";
import "./documents-page.css";

type GroupId = "test" | "prep" | "notes" | "other";

type DocumentRecord = {
  documentId: string;
  sourceFileName: string;
  createdAt: string;
  docType?: string | null;
  declaredRole?: string | null;
};

type GroupConfig = {
  id: GroupId;
  title: string;
};

const GROUPS: GroupConfig[] = [
  { id: "test", title: "Test Documents" },
  { id: "prep", title: "Prep Documents" },
  { id: "notes", title: "Notes / Slides / Worksheets" },
  { id: "other", title: "Other Resources" },
];

const EXPANDED_BY_DEFAULT: Record<GroupId, boolean> = {
  test: true,
  prep: true,
  notes: true,
  other: true,
};

interface DocumentsPageProps {
  navigate: (path: string) => void;
}

function classifyGroup(doc: DocumentRecord): GroupId {
  const type = (doc.docType ?? "").toLowerCase();
  const name = (doc.sourceFileName ?? "").toLowerCase();

  if (["test", "problem", "assessment", "exam", "quiz"].includes(type)) {
    return "test";
  }

  if (["prep", "prep-doc", "study-guide", "study_guide"].includes(type)) {
    return "prep";
  }

  if (["notes", "slide", "slides", "worksheet", "worksheets"].includes(type)) {
    return "notes";
  }

  if (name.includes("prep") || name.includes("study guide") || name.includes("preparation")) {
    return "prep";
  }

  if (name.includes("note") || name.includes("slide") || name.includes("worksheet")) {
    return "notes";
  }

  if (name.includes("test") || name.includes("quiz") || name.includes("exam") || name.includes("assessment")) {
    return "test";
  }

  return "other";
}

function formatDocType(docType?: string | null): string {
  if (!docType) {
    return "Unclassified";
  }
  return docType
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function canAttachCompanions(doc: DocumentRecord): boolean {
  return doc.declaredRole === "test" || classifyGroup(doc) === "test";
}

export function DocumentsPage({ navigate }: DocumentsPageProps) {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openByGroup, setOpenByGroup] = useState<Record<GroupId, boolean>>(EXPANDED_BY_DEFAULT);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setFetchError(null);

    fetch("/api/v4/documents", { credentials: "include" })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error?.message ?? "Failed to load documents");
        }
        return (payload.documents as DocumentRecord[]) ?? [];
      })
      .then((result) => {
        if (!cancelled) {
          setDocs(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "Failed to load documents");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const groupedDocs = useMemo(() => {
    const next: Record<GroupId, DocumentRecord[]> = {
      test: [],
      prep: [],
      notes: [],
      other: [],
    };

    const sorted = [...docs].sort((a, b) => {
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      return bt - at;
    });

    for (const doc of sorted) {
      const group = classifyGroup(doc);
      next[group].push(doc);
    }

    return next;
  }, [docs]);

  const totalCount = docs.length;

  const toggleGroup = (groupId: GroupId) => {
    setOpenByGroup((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  };

  return (
    <section className="documents-page-shell" aria-label="Your documents grouped view">
      <header className="documents-page-header">
        <div>
          <p className="documents-page-kicker">Your Documents</p>
          <h2 className="documents-page-title">Grouped Document Browser</h2>
          <p className="documents-page-subtitle">{totalCount} total document{totalCount === 1 ? "" : "s"}</p>
        </div>
        <div className="documents-page-actions">
          <button type="button" className="v4-button v4-button-secondary" onClick={() => navigate("/upload")}>
            Upload a Document
          </button>
          <button type="button" className="v4-button" onClick={() => navigate("/simulation")}>
            Open Simulation
          </button>
        </div>
      </header>

      {isLoading && <p className="documents-state">Loading documents...</p>}
      {fetchError && <p className="documents-state documents-state-error">{fetchError}</p>}

      {!isLoading && !fetchError && totalCount === 0 && (
        <div className="documents-empty-state">
          <p>No documents uploaded yet.</p>
          <button type="button" className="v4-button" onClick={() => navigate("/upload")}>
            Upload your first document
          </button>
        </div>
      )}

      {!isLoading && !fetchError && totalCount > 0 && (
        <div className="documents-groups" role="list">
          {GROUPS.map((group) => {
            const sectionDocs = groupedDocs[group.id];
            const isOpen = openByGroup[group.id];

            return (
              <section key={group.id} className="documents-group" role="listitem" aria-label={group.title}>
                <button
                  type="button"
                  className="documents-group-header"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  aria-controls={`documents-group-body-${group.id}`}
                >
                  <span className={`documents-group-chevron${isOpen ? " documents-group-chevron-open" : ""}`}>{">"}</span>
                  <span className="documents-group-title">{group.title}</span>
                  <span className="documents-group-count">{sectionDocs.length}</span>
                </button>

                <div
                  id={`documents-group-body-${group.id}`}
                  className={`documents-group-body-shell${isOpen ? " documents-group-body-shell-open" : ""}`}
                >
                  <div className="documents-group-body">
                    {sectionDocs.length === 0 ? (
                      <p className="documents-group-empty">No documents in this section yet.</p>
                    ) : (
                      <ul className="documents-list">
                        {sectionDocs.map((doc) => (
                          <li key={doc.documentId} className="documents-list-row">
                            <div className="documents-list-action">
                              <div>
                                <p className="documents-file-name">{doc.sourceFileName}</p>
                                <p className="documents-file-meta">
                                  {formatDocType(doc.docType)} · Added {new Date(doc.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                <span className="documents-id-chip">{doc.documentId.slice(0, 8)}</span>
                                <button
                                  type="button"
                                  className="documents-open-hint"
                                  onClick={() => navigate(`/simulation?documentId=${encodeURIComponent(doc.documentId)}`)}
                                  aria-label={`Open ${doc.sourceFileName} in simulation`}
                                >
                                  Open
                                </button>
                                {canAttachCompanions(doc) && (
                                  <button
                                    type="button"
                                    className="documents-open-hint"
                                    onClick={() => navigate(`/simulation?documentId=${encodeURIComponent(doc.documentId)}`)}
                                    aria-label={`Attach saved companion docs to ${doc.sourceFileName}`}
                                  >
                                    Attach companions
                                  </button>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
