import { useEffect, useMemo, useState } from "react";
import { deriveTemplate, listTemplates, saveTemplate, TemplateListEntry } from "@/services_new/pipelineClient";
import { DerivedTemplate } from "pipeline/contracts/deriveTemplate";
import { TemplateAnalysis } from "pipeline/agents/templateDeriver/types";

interface TemplateWizardPageProps {
  teacherId: string;
  onNavigate: (path: string) => void;
}

type WizardStep = 0 | 1 | 2 | 3;
type WizardMode = "system" | "custom";

export function TemplateWizardPage({ teacherId, onNavigate }: TemplateWizardPageProps) {
  const [step, setStep] = useState<WizardStep>(0);
  const [wizardMode, setWizardMode] = useState<WizardMode>("system");
  const [systemTemplates, setSystemTemplates] = useState<TemplateListEntry[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [baseTemplate, setBaseTemplate] = useState<TemplateListEntry | null>(null);
  const [examples, setExamples] = useState<string[]>([""]);
  const [subject, setSubject] = useState("");
  const [itemType, setItemType] = useState("");
  const [cognitiveIntent, setCognitiveIntent] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [isDeriving, setIsDeriving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [derivedTemplate, setDerivedTemplate] = useState<DerivedTemplate | null>(null);
  const [debugAnalysis, setDebugAnalysis] = useState<TemplateAnalysis | null>(null);

  const cleanedExamples = useMemo(() => examples.map((e) => e.trim()).filter(Boolean), [examples]);

  function asStringOptions(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    systemTemplates.forEach((template) => {
      const value = String(template.subject ?? "").trim();
      if (value) set.add(value);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [systemTemplates]);

  const itemTypeOptions = useMemo(() => {
    const fromConfig = asStringOptions(baseTemplate?.configurableFields?.itemType);
    if (fromConfig.length > 0) return fromConfig;

    const set = new Set<string>();
    systemTemplates.forEach((template) => {
      const value = String(template.itemType ?? "").trim();
      if (value) set.add(value);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [baseTemplate, systemTemplates]);

  const cognitiveIntentOptions = useMemo(() => {
    const fromConfig = asStringOptions(baseTemplate?.configurableFields?.cognitiveIntent);
    if (fromConfig.length > 0) return fromConfig;

    const set = new Set<string>();
    systemTemplates.forEach((template) => {
      const value = String(template.cognitiveIntent ?? "").trim();
      if (value) set.add(value);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [baseTemplate, systemTemplates]);

  const difficultyOptions = useMemo(() => {
    const fromConfig = asStringOptions(baseTemplate?.configurableFields?.difficulty);
    if (fromConfig.length > 0) return fromConfig;

    const set = new Set<string>(["easy", "medium", "hard"]);
    systemTemplates.forEach((template) => {
      const value = String(template.difficulty ?? "").trim();
      if (value) set.add(value);
    });
    return Array.from(set);
  }, [baseTemplate, systemTemplates]);

  useEffect(() => {
    let active = true;
    setIsLoadingTemplates(true);
    setError(null);

    listTemplates(teacherId)
      .then((payload) => {
        if (!active) return;
        setSystemTemplates(payload.system ?? []);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message ?? "Failed to load problem types");
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingTemplates(false);
      });

    return () => {
      active = false;
    };
  }, [teacherId]);

  async function handleDerive() {
    if (wizardMode === "system" && !baseTemplate) {
      setError("Please select a problem type first.");
      return;
    }

    setError(null);
    setIsDeriving(true);

    try {
      const response = await deriveTemplate({
        mode: "deriveTemplate",
        examples: cleanedExamples,

        // Seed with system template metadata unless teacher overrides.
        subject: subject || baseTemplate?.subject,
        itemType: (itemType || baseTemplate?.itemType) as any,
        cognitiveIntent: (cognitiveIntent || baseTemplate?.cognitiveIntent) as any,
        difficulty: (difficulty || baseTemplate?.difficulty) as any,
        sharedContext: baseTemplate?.sharedContext,

        teacherPreferences: {},
        studentProfile: {},
        teacherId,
      });

      setDerivedTemplate(response.template);
      setDebugAnalysis(response.analysis ?? null);
      setStep(3);
    } catch (err: any) {
      setError(err?.message ?? "Failed to derive template");
    } finally {
      setIsDeriving(false);
    }
  }

  async function handleSaveTemplate() {
    if (!derivedTemplate) return;
    setError(null);
    setIsSaving(true);
    try {
      await saveTemplate(teacherId, derivedTemplate);
      onNavigate("/templates");
    } catch (err: any) {
      setError(err?.message ?? "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ padding: "1.25rem", maxWidth: "980px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>New Template</h2>
          <p style={{ margin: "0.25rem 0 0", color: "#6b7280" }}>Step {step + 1} of 4</p>
        </div>
        <button className="ca-btn-ghost" onClick={() => onNavigate("/templates")}>Back To Templates</button>
      </div>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {step > 0 && baseTemplate && (
        <section style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.75rem", marginBottom: "0.75rem", background: "#f9fafb" }}>
          <div style={{ fontWeight: 700 }}>Selected Problem Type: {baseTemplate.label}</div>
          <div style={{ marginTop: "0.3rem", color: "#4b5563", fontSize: "0.9rem" }}>
            {String(baseTemplate.subject ?? "General")} · {String(baseTemplate.itemType ?? "short_answer")} · {String(baseTemplate.cognitiveIntent ?? "understand")} · {String(baseTemplate.difficulty ?? "medium")}
          </div>
        </section>
      )}

      {step > 0 && wizardMode === "custom" && (
        <section style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.75rem", marginBottom: "0.75rem", background: "#f9fafb" }}>
          <div style={{ fontWeight: 700 }}>Creation Mode: Custom Template</div>
          <div style={{ marginTop: "0.3rem", color: "#4b5563", fontSize: "0.9rem" }}>
            This template is derived from your examples and optional overrides, not a system base.
          </div>
        </section>
      )}

      {step === 0 && (
        <section style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>1. Select a Problem Type</h3>
          <div style={{ marginBottom: "0.8rem" }}>
            <button
              type="button"
              className="ca-btn-ghost"
              onClick={() => {
                setWizardMode("custom");
                setBaseTemplate(null);
                setSubject("");
                setItemType("");
                setCognitiveIntent("");
                setDifficulty("");
                setError(null);
                setStep(1);
              }}
            >
              + Start From Scratch (No Base Template)
            </button>
          </div>
          {isLoadingTemplates && <p>Loading problem types...</p>}
          {!isLoadingTemplates && systemTemplates.length === 0 && (
            <p style={{ color: "#6b7280" }}>No system problem types available.</p>
          )}
          {!isLoadingTemplates && systemTemplates.length > 0 && (
            <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              {systemTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="template-card"
                  onClick={() => {
                    setWizardMode("system");
                    setBaseTemplate(template);
                    setSubject("");
                    setItemType("");
                    setCognitiveIntent("");
                    setDifficulty("");
                    setError(null);
                    setStep(1);
                  }}
                >
                  <h4 className="template-card__title" style={{ margin: "0 0 0.3rem 0" }}>{template.label}</h4>
                  <div className="template-card__meta">
                    {String(template.subject ?? "General")} · {String(template.itemType ?? "short_answer")}
                  </div>
                  <div className="template-card__meta" style={{ marginTop: "0.2rem" }}>
                    Intent: {String(template.cognitiveIntent ?? "understand")} · Difficulty: {String(template.difficulty ?? "medium")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )
      }

      {step === 1 && (
        <section style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>2. Collect Examples</h3>
          {examples.map((example, index) => (
            <div key={index} style={{ marginBottom: "0.75rem" }}>
              <textarea
                value={example}
                onChange={(e) => setExamples((prev) => prev.map((v, i) => (i === index ? e.target.value : v)))}
                rows={4}
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.6rem" }}
                placeholder={`Example ${index + 1}`}
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="ca-btn-ghost" onClick={() => setExamples((prev) => [...prev, ""])}>+ Add Example</button>
            {examples.length > 1 && (
              <button className="ca-btn-ghost" onClick={() => setExamples((prev) => prev.slice(0, -1))}>- Remove Last</button>
            )}
          </div>
          <div style={{ marginTop: "1rem" }}>
            <button className="ca-btn-ghost" onClick={() => setStep(0)} style={{ marginRight: "0.5rem" }}>Back</button>
            <button className="ca-btn-primary" disabled={cleanedExamples.length === 0} onClick={() => setStep(2)}>Continue</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>3. Optional Overrides</h3>
          <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.9rem", color: "#374151" }}>
              Subject
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="ca-input">
                <option value="">
                  {wizardMode === "custom"
                    ? "Infer from examples"
                    : `Use base: ${String(baseTemplate?.subject ?? "General")}`}
                </option>
                {subjectOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.9rem", color: "#374151" }}>
              Item Type
              <select value={itemType} onChange={(e) => setItemType(e.target.value)} className="ca-input">
                <option value="">
                  {wizardMode === "custom"
                    ? "Infer from examples"
                    : `Use base: ${String(baseTemplate?.itemType ?? "short_answer")}`}
                </option>
                {itemTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.9rem", color: "#374151" }}>
              Cognitive Intent
              <select value={cognitiveIntent} onChange={(e) => setCognitiveIntent(e.target.value)} className="ca-input">
                <option value="">
                  {wizardMode === "custom"
                    ? "Infer from examples"
                    : `Use base: ${String(baseTemplate?.cognitiveIntent ?? "understand")}`}
                </option>
                {cognitiveIntentOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.9rem", color: "#374151" }}>
              Difficulty
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="ca-input">
                <option value="">
                  {wizardMode === "custom"
                    ? "Infer from examples"
                    : `Use base: ${String(baseTemplate?.difficulty ?? "medium")}`}
                </option>
                {difficultyOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          {wizardMode === "system" && (
            <p style={{ margin: "0.6rem 0 0", color: "#6b7280", fontSize: "0.85rem" }}>
              Shared Context comes from the selected base problem type: {String(baseTemplate?.sharedContext ?? "none")}.
            </p>
          )}
          {wizardMode === "custom" && (
            <p style={{ margin: "0.6rem 0 0", color: "#6b7280", fontSize: "0.85rem" }}>
              Shared Context will be inferred from examples when starting from scratch.
            </p>
          )}
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <button className="ca-btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="ca-btn-primary" disabled={cleanedExamples.length === 0 || isDeriving} onClick={handleDerive}>
              {isDeriving ? "Deriving..." : "Derive + Preview"}
            </button>
          </div>
        </section>
      )}

      {step === 3 && derivedTemplate && (
        <section style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>4. Derived Template Preview</h3>
          <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: "0.75rem" }}>
            <div><strong>Label:</strong> {derivedTemplate.label}</div>
            <div><strong>Subject:</strong> {String(derivedTemplate.subject)}</div>
            <div><strong>Item Type:</strong> {String(derivedTemplate.itemType)}</div>
            <div><strong>Intent:</strong> {String(derivedTemplate.cognitiveIntent)}</div>
            <div><strong>Difficulty:</strong> {String(derivedTemplate.difficulty)}</div>
          </div>

          <h4 style={{ marginBottom: "0.4rem" }}>Inferred Fields</h4>
          <pre style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.6rem", fontSize: "0.8rem", overflowX: "auto" }}>
{JSON.stringify(derivedTemplate.inferred, null, 2)}
          </pre>

          {debugAnalysis && (
            <>
              <h4 style={{ marginBottom: "0.4rem", marginTop: "0.75rem" }}>Analysis (debug)</h4>
              <pre style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "8px", padding: "0.6rem", fontSize: "0.8rem", overflowX: "auto" }}>
{JSON.stringify(debugAnalysis, null, 2)}
              </pre>
            </>
          )}

          <h4 style={{ marginBottom: "0.4rem" }}>Preview Items</h4>
          {(derivedTemplate.previewItems ?? []).length === 0 && <p style={{ color: "#6b7280" }}>No preview items returned.</p>}
          {(derivedTemplate.previewItems ?? []).map((item: any, idx: number) => (
            <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.6rem", marginBottom: "0.4rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Preview {idx + 1}</div>
              <div style={{ fontSize: "0.9rem", color: "#374151" }}>{String(item?.prompt ?? item?.question ?? JSON.stringify(item))}</div>
            </div>
          ))}

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <button className="ca-btn-ghost" onClick={() => setStep(2)}>Back</button>
            <button className="ca-btn-primary" onClick={handleSaveTemplate} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
