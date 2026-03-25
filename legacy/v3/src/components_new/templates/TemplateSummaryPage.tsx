import { useEffect, useMemo, useState } from "react";
import { listTemplates } from "@/services_new/pipelineClient";
import { TemplateRecord } from "./types";

interface TemplateSummaryPageProps {
  teacherId: string;
  templateId: string;
  onNavigate: (path: string) => void;
  onUseTemplateInBuilder?: (template: { id: string; label: string }) => void;
}

function normalizeTemplateId(raw: string): string {
  return decodeURIComponent(raw || "").trim();
}

export function TemplateSummaryPage({
  teacherId,
  templateId,
  onNavigate,
  onUseTemplateInBuilder,
}: TemplateSummaryPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplateRecord | null>(null);

  useEffect(() => {
    let active = true;
    const id = normalizeTemplateId(templateId);

    setIsLoading(true);
    setError(null);

    listTemplates(teacherId)
      .then((payload) => {
        if (!active) return;
        const all = [...(payload.system ?? []), ...(payload.teacher ?? [])] as TemplateRecord[];
        const found = all.find((entry) => String(entry.id) === id) ?? null;
        if (!found) {
          setError("Template not found.");
          setTemplate(null);
          return;
        }
        setTemplate(found);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message ?? "Failed to load template summary");
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [teacherId, templateId]);

  const previewItems = useMemo(() => template?.previewItems ?? [], [template]);

  if (isLoading) return <div style={{ padding: "1.25rem" }}>Loading template summary...</div>;
  if (error) {
    return (
      <div style={{ padding: "1.25rem" }}>
        <p style={{ color: "#b91c1c" }}>{error}</p>
        <button className="ca-btn-ghost" onClick={() => onNavigate("/templates")}>Back To Templates</button>
      </div>
    );
  }

  if (!template) return null;

  return (
    <div style={{ padding: "1.25rem", maxWidth: "980px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Template Summary</h2>
        <button className="ca-btn-ghost" onClick={() => onNavigate("/templates")}>Back To Templates</button>
      </div>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem", marginBottom: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>{template.label}</h3>
        <div style={{ display: "grid", gap: "0.45rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div><strong>Subject:</strong> {String(template.subject ?? "Other")}</div>
          <div><strong>Intent:</strong> {String(template.cognitiveIntent ?? "n/a")}</div>
          <div><strong>Difficulty:</strong> {String(template.difficulty ?? "n/a")}</div>
          <div><strong>Item Type:</strong> {String(template.itemType ?? "n/a")}</div>
          <div><strong>Shared Context:</strong> {String(template.sharedContext ?? "none")}</div>
        </div>

        <h4 style={{ marginBottom: "0.35rem", marginTop: "0.9rem" }}>Explanation</h4>
        <p style={{ marginTop: 0, color: "#374151" }}>{template.explanation ?? "No explanation available."}</p>

        <h4 style={{ marginBottom: "0.35rem" }}>Structure</h4>
        <pre style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.6rem", fontSize: "0.8rem", overflowX: "auto" }}>
{JSON.stringify(template.configurableFields ?? {}, null, 2)}
        </pre>

        <h4 style={{ marginBottom: "0.35rem" }}>Live Preview</h4>
        {previewItems.length === 0 && <p style={{ color: "#6b7280" }}>No preview items available for this template.</p>}
        {previewItems.map((item, idx) => (
          <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.6rem", marginBottom: "0.45rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Preview {idx + 1}</div>
            <div style={{ fontSize: "0.9rem", color: "#374151" }}>{String((item as any)?.prompt ?? (item as any)?.question ?? JSON.stringify(item))}</div>
          </div>
        ))}

        <div style={{ marginTop: "1rem" }}>
          <button
            className="ca-btn-primary"
            onClick={() => {
              if (onUseTemplateInBuilder) {
                onUseTemplateInBuilder({ id: String(template.id), label: String(template.label ?? template.id) });
                return;
              }
              onNavigate("/");
            }}
          >
            Generate Items
          </button>
        </div>
      </section>
    </div>
  );
}
