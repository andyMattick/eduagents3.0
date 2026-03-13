import { useMemo, useState } from "react";
import { deriveTemplate, saveTemplate } from "@/services_new/pipelineClient";
import { DerivedTemplate } from "@/pipeline/contracts/deriveTemplate";
import { TemplateAnalysis } from "@/pipeline/agents/templateDeriver/types";

interface TemplateWizardPageProps {
  teacherId: string;
  onNavigate: (path: string) => void;
}

type WizardStep = 1 | 2 | 3;

export function TemplateWizardPage({ teacherId, onNavigate }: TemplateWizardPageProps) {
  const [step, setStep] = useState<WizardStep>(1);
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

  async function handleDerive() {
    setError(null);
    setIsDeriving(true);
    try {
      const response = await deriveTemplate({
        mode: "deriveTemplate",
        examples: cleanedExamples,
        subject: subject || undefined,
        itemType: itemType || undefined,
        cognitiveIntent: cognitiveIntent || undefined,
        difficulty: difficulty || undefined,
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
          <p style={{ margin: "0.25rem 0 0", color: "#6b7280" }}>Step {step} of 3</p>
        </div>
        <button className="ca-btn-ghost" onClick={() => onNavigate("/templates")}>Back To Templates</button>
      </div>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {step === 1 && (
        <section style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>1. Collect Examples</h3>
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
            <button className="ca-btn-primary" disabled={cleanedExamples.length === 0} onClick={() => setStep(2)}>Continue</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>2. Optional Overrides</h3>
          <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)" className="ca-input" />
            <input value={itemType} onChange={(e) => setItemType(e.target.value)} placeholder="Item type (optional)" className="ca-input" />
            <input value={cognitiveIntent} onChange={(e) => setCognitiveIntent(e.target.value)} placeholder="Cognitive intent (optional)" className="ca-input" />
            <input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="Difficulty (optional)" className="ca-input" />
          </div>
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
          <h3 style={{ marginTop: 0 }}>3. Derived Template Preview</h3>
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
