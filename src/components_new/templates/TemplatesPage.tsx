import { useEffect, useMemo, useState } from "react";
import { listTemplates } from "@/services_new/pipelineClient";
import { TemplateOption } from "./types";

interface TemplatesPageProps {
  teacherId: string;
  onNavigate: (path: string) => void;
  onUseTemplateInBuilder?: (template: TemplateOption) => void;
}

export function TemplatesPage({ teacherId, onNavigate, onUseTemplateInBuilder }: TemplatesPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemTemplates, setSystemTemplates] = useState<Array<any>>([]);
  const [teacherTemplates, setTeacherTemplates] = useState<Array<any>>([]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    listTemplates(teacherId)
      .then((payload) => {
        if (!active) return;
        setSystemTemplates(payload.system ?? []);
        setTeacherTemplates(payload.teacher ?? []);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message ?? "Failed to load templates");
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [teacherId]);

  const teacherTemplateOptions: TemplateOption[] = useMemo(
    () =>
      teacherTemplates.map((t: any) => ({
        id: String(t.id),
        label: String(t.label ?? t.id),
      })),
    [teacherTemplates]
  );

  return (
    <div style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Templates</h2>
          <p style={{ margin: "0.25rem 0 0", color: "#6b7280" }}>System templates and your saved templates.</p>
        </div>
        <button className="ca-btn-primary" onClick={() => onNavigate("/templates/new")}>+ New Template</button>
      </div>

      {isLoading && <p>Loading templates...</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {!isLoading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
          <section style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.9rem" }}>
            <h3 style={{ marginTop: 0 }}>My Templates</h3>
            {teacherTemplateOptions.length === 0 && <p style={{ color: "#6b7280" }}>No teacher templates yet.</p>}
            {teacherTemplateOptions.map((template) => (
              <div key={template.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.45rem 0" }}>
                <span>{template.label}</span>
                <button
                  className="ca-btn-ghost"
                  onClick={() => {
                    if (onUseTemplateInBuilder) onUseTemplateInBuilder(template);
                    onNavigate("/");
                  }}
                >
                  Use In Builder
                </button>
              </div>
            ))}
          </section>

          <section style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.9rem" }}>
            <h3 style={{ marginTop: 0 }}>System Templates</h3>
            {systemTemplates.length === 0 && <p style={{ color: "#6b7280" }}>No system templates available.</p>}
            {systemTemplates.map((template: any) => (
              <div key={template.id} style={{ padding: "0.45rem 0" }}>
                <div style={{ fontWeight: 600 }}>{template.label ?? template.id}</div>
                <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>
                  Intent: {String(template.defaultIntent ?? "n/a")} · Difficulty: {String(template.defaultDifficulty ?? "n/a")}
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
