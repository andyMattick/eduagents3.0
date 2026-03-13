import { useEffect, useMemo, useState } from "react";
import { deleteTemplate, listTemplates, saveTemplate } from "@/services_new/pipelineClient";
import TemplateCard from "./TemplateCard";
import { TemplateOption, TemplateRecord } from "./types";

interface TemplatesPageProps {
  teacherId: string;
  onNavigate: (path: string) => void;
  onUseTemplateInBuilder?: (template: TemplateOption) => void;
}

export function TemplatesPage({ teacherId, onNavigate, onUseTemplateInBuilder }: TemplatesPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemTemplates, setSystemTemplates] = useState<TemplateRecord[]>([]);
  const [teacherTemplates, setTeacherTemplates] = useState<TemplateRecord[]>([]);
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function groupBySubject(templates: TemplateRecord[]) {
    return templates.reduce((acc, t) => {
      const subject = (t.subject ?? "Other").trim() || "Other";
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(t);
      return acc;
    }, {} as Record<string, TemplateRecord[]>);
  }

  function toggle(subject: string) {
    setOpenSubjects((prev) => ({
      ...prev,
      [subject]: !prev[subject],
    }));
  }

  function openDrawer(template: TemplateRecord) {
    setSelectedTemplate(template);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedTemplate(null);
  }

  const loadTemplates = () => {
    setIsLoading(true);
    setError(null);

    return listTemplates(teacherId)
      .then((payload) => {
        setSystemTemplates(payload.system ?? []);
        setTeacherTemplates(payload.teacher ?? []);
      })
      .catch((err: any) => {
        setError(err?.message ?? "Failed to load templates");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

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
      teacherTemplates.map((t) => ({
        id: String(t.id),
        label: String(t.label ?? t.id),
      })),
    [teacherTemplates]
  );

  const allTemplates = useMemo(
    () => [...systemTemplates, ...teacherTemplates],
    [systemTemplates, teacherTemplates]
  );

  const groupedTemplates = useMemo(() => groupBySubject(allTemplates), [allTemplates]);
  const groupedEntries = useMemo(() => Object.entries(groupedTemplates).sort((a, b) => a[0].localeCompare(b[0])), [groupedTemplates]);

  async function duplicateTemplate() {
    if (!selectedTemplate || !selectedTemplate.isTeacherTemplate) return;
    setIsDuplicating(true);
    setError(null);
    try {
      const nextId = `${selectedTemplate.id}-copy-${Date.now()}`;
      await saveTemplate(teacherId, {
        id: nextId,
        label: `${selectedTemplate.label} (Copy)`,
        subject: String(selectedTemplate.subject ?? "Other"),
        itemType: String(selectedTemplate.itemType ?? "short_answer") as any,
        cognitiveIntent: String(selectedTemplate.cognitiveIntent ?? "analyze") as any,
        difficulty: String(selectedTemplate.difficulty ?? "medium") as any,
        sharedContext: String(selectedTemplate.sharedContext ?? "none") as any,
        configurableFields: selectedTemplate.configurableFields ?? {},
        examples: selectedTemplate.examples ?? [],
        inferred: (selectedTemplate.inferred as any) ?? {
          itemType: false,
          cognitiveIntent: false,
          difficulty: false,
          sharedContext: false,
        },
        previewItems: selectedTemplate.previewItems ?? [],
      });
      await loadTemplates();
    } catch (err: any) {
      setError(err?.message ?? "Failed to duplicate template");
    } finally {
      setIsDuplicating(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!selectedTemplate || !selectedTemplate.isTeacherTemplate) return;

    const confirmed = window.confirm(`Delete teacher template \"${selectedTemplate.label}\"? This cannot be undone.`);
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteTemplate(teacherId, String(selectedTemplate.id));
      closeDrawer();
      await loadTemplates();
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete template");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="templates-page">
      <div className="templates-page__header">
        <div>
          <h2 className="templates-page__title">Templates</h2>
          <p className="templates-page__subtitle">System templates and your saved templates.</p>
        </div>
        <button className="ca-btn-primary" onClick={() => onNavigate("/templates/new")}>+ New Template</button>
      </div>

      {isLoading && <p>Loading templates...</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {!isLoading && !error && (
        <div className={`templates-page__content${drawerOpen ? " templates-page__content--drawer-open" : ""}`}>
          {groupedEntries.length === 0 && <p style={{ color: "#6b7280" }}>No templates available.</p>}

          {groupedEntries.map(([subject, templates]) => (
            <section key={subject} className="template-subject-section">
              <button
                type="button"
                onClick={() => toggle(subject)}
                className="subject-header"
              >
                {subject} ({templates.length})
              </button>

              {openSubjects[subject] && (
                <div className="template-list">
                  {templates.map((template) => (
                    <TemplateCard key={template.id} template={template} onOpen={openDrawer} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {drawerOpen && selectedTemplate && (
        <aside
          className="template-drawer"
        >
          <div className="template-drawer__header">
            <h3 className="template-drawer__title">Template</h3>
            <button type="button" className="ca-btn-ghost" onClick={closeDrawer}>Close</button>
          </div>

          <h4 className="template-drawer__name">{selectedTemplate.label}</h4>
          <div className="template-drawer__meta">
            <div>Subject: {String(selectedTemplate.subject ?? "Other")}</div>
            <div>Intent: {String(selectedTemplate.cognitiveIntent ?? "n/a")}</div>
            <div>Difficulty: {String(selectedTemplate.difficulty ?? "n/a")}</div>
            <div>Item Type: {String(selectedTemplate.itemType ?? "n/a")}</div>
          </div>

          <h5 className="template-drawer__section-title">Explanation</h5>
          <p className="template-drawer__body">{selectedTemplate.explanation ?? "No explanation available."}</p>

          <h5 className="template-drawer__section-title">Structure</h5>
          <pre className="template-drawer__code-block">
{JSON.stringify(selectedTemplate.configurableFields ?? {}, null, 2)}
          </pre>

          <h5 className="template-drawer__section-title">Live Preview</h5>
          {(selectedTemplate.previewItems ?? []).length === 0 && (
            <p style={{ color: "#6b7280" }}>No preview items available.</p>
          )}
          {(selectedTemplate.previewItems ?? []).map((item, idx) => (
            <div key={idx} className="template-drawer__preview-card">
              <div className="template-drawer__preview-title">Preview {idx + 1}</div>
              <div className="template-drawer__preview-body">
                {String((item as any)?.prompt ?? (item as any)?.question ?? JSON.stringify(item))}
              </div>
            </div>
          ))}

          <div className="template-drawer__actions">
            <button
              className="ca-btn-primary"
              onClick={() => onNavigate(`/templates/${encodeURIComponent(String(selectedTemplate.id))}/summary`)}
            >
              Use Template
            </button>

            {selectedTemplate.isTeacherTemplate && (
              <>
                <button className="ca-btn-ghost" onClick={() => onNavigate("/templates/new")}>Edit</button>
                <button className="ca-btn-ghost" onClick={duplicateTemplate} disabled={isDuplicating}>
                  {isDuplicating ? "Duplicating..." : "Duplicate"}
                </button>
                <button className="ca-btn-ghost" onClick={handleDeleteTemplate} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </>
            )}
          </div>

          {selectedTemplate.isTeacherTemplate && teacherTemplateOptions.some((t) => t.id === selectedTemplate.id) && (
            <div className="template-drawer__secondary-action">
              <button
                className="ca-btn-ghost"
                onClick={() => {
                  if (onUseTemplateInBuilder) onUseTemplateInBuilder({ id: String(selectedTemplate.id), label: String(selectedTemplate.label) });
                  onNavigate("/");
                }}
              >
                Use In Builder
              </button>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
