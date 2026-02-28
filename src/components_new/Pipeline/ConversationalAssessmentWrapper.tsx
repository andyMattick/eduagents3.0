// src/components_new/Pipeline/ConversationalAssessmentWrapper.tsx
import { useState, useCallback, useEffect } from "react";
import { ConversationalAssessment, ConversationalIntent } from "./ConversationalAssessment";
import { TraceViewer } from "./TraceViewer";
import { AssessmentViewer } from "./AssessmentViewer";
import { PromptEngineerPanel } from "./PromptEngineerPanel";
import { TeacherFeedbackPanel } from "./TeacherFeedbackPanel";
import { convertMinimalToUAR } from "@/pipeline/orchestrator/convertMinimalToUAR";
import { generateAssessment } from "@/config/aiConfig";
import { runPromptEngineer, type PromptEngineerResult } from "@/pipeline/agents/promptEngineer";
import { runTeacherRewrite } from "@/pipeline/agents/rewriter/teacherRewrite";
import type { MinimalTeacherIntent } from "@/pipeline/contracts";
import { getDailyUsage, DailyUsage, FREE_DAILY_LIMIT } from "@/services/usageService";

interface ConversationalAssessmentWrapperProps {
  userId: string | null;
  onResult: (result: unknown) => void;
}

function getTitle(result: any): string {
  const uar = result?.blueprint?.uar ?? result?.uar;
  return uar?.lessonName || uar?.unitName || uar?.topic || "Assessment";
}

function getSubtitle(result: any): string | undefined {
  const uar = result?.blueprint?.uar ?? result?.uar;
  if (!uar) return undefined;
  const parts: string[] = [];
  if (uar.course) parts.push(uar.course);
  if (uar.gradeLevels?.length) {
    const grades = (uar.gradeLevels as string[]).join(", ");
    parts.push(`Grade ${grades}`);
  }
  return parts.length ? parts.join(" · ") : undefined;
}

export function ConversationalAssessmentWrapper({
  userId,
  onResult,
}: ConversationalAssessmentWrapperProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  // ── Prompt Engineer state ──────────────────────────────────────────────
  const [pendingIntent, setPendingIntent] = useState<ConversationalIntent | null>(null);
  const [peResult, setPeResult] = useState<PromptEngineerResult | null>(null);
  const [pendingEstimatedSeconds, setPendingEstimatedSeconds] = useState<number | null>(null);

  // ── Post-Builder teacher feedback state ────────────────────────────────
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  const safeUserId = userId ?? "00000000-0000-0000-0000-000000000000";

  // Load (or refresh) daily usage
  const refreshUsage = useCallback(async () => {
    const u = await getDailyUsage(safeUserId);
    setUsage(u);
    return u;
  }, [safeUserId]);

  useEffect(() => { refreshUsage(); }, [refreshUsage]);

  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // ── Prompt Engineer: intercepts intent before pipeline ─────────────────
  const handleConversationComplete = useCallback(
    (intent: ConversationalIntent) => {
      setLimitError(null);
      setPipelineError(null);
      const validation = runPromptEngineer(intent);
      setPendingIntent(intent);
      setPeResult(validation);
    },
    []
  );

  // ── Called when teacher clicks "Edit Inputs" in Prompt Engineer panel ──
  const handleEditInputs = useCallback(() => {
    setPendingIntent(null);
    setPeResult(null);
  }, []);

  // ── Actually dispatch the pipeline (after Prompt Engineer OK) ──────────
  const handleProceed = useCallback(
    async () => {
      if (!pendingIntent) return;
      setLimitError(null);
      setPipelineError(null);
      // Stash estimated time before clearing the panel so loading card can display it
      setPendingEstimatedSeconds(peResult?.estimatedCreationSeconds ?? null);
      setPeResult(null); // hide the panel
      try {
        setIsLoading(true);
        setResult(null);

        // Gate: re-check usage right before calling the pipeline
        const currentUsage = await refreshUsage();
        if (!currentUsage.canGenerate) {
          setLimitError(
            `You've used all ${FREE_DAILY_LIMIT} free assessments for today. Come back tomorrow, or upgrade for unlimited access.`
          );
          return;
        }

        const minimalIntent: MinimalTeacherIntent = {
          ...pendingIntent,
          assessmentType: pendingIntent.assessmentType as MinimalTeacherIntent["assessmentType"],
          time: pendingIntent.time ?? 10,
          questionFormat: pendingIntent.questionFormat ?? null,
          bloomPreference: pendingIntent.bloomPreference ?? null,
          sectionStructure: pendingIntent.sectionStructure ?? null,
          standards: pendingIntent.standards ?? null,
          multiPartQuestions: pendingIntent.multiPartQuestions ?? null,
        };

        const uar = {
          ...convertMinimalToUAR(minimalIntent),
          userId: safeUserId,
        };

        const data = await generateAssessment(uar);
        setResult(data);
        onResult(data);
        setPendingIntent(null);

        // Refresh counter after a successful run
        await refreshUsage();
      } catch (err: any) {
        const msg: string =
          err?.message ?? "An unexpected error occurred. Please try again.";
        console.error("[Pipeline] Error:", err);
        setPipelineError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [pendingIntent, safeUserId, onResult, refreshUsage]
  );

  // ── Post-Builder teacher feedback → targeted rewrite ───────────────────
  const handleTeacherFeedback = useCallback(
    async (comments: string) => {
      if (!result?.finalAssessment || !comments.trim()) return;
      setRewriteError(null);
      setIsRewriting(true);
      try {
        const rewritten = await runTeacherRewrite({
          finalAssessment: result.finalAssessment,
          teacherComments: comments,
          blueprint: result.blueprint,
        });
        // Merge rewritten assessment back into result
        setResult((prev: any) => ({
          ...prev,
          finalAssessment: rewritten,
          teacherRewriteApplied: true,
        }));
      } catch (err: any) {
        console.error("[TeacherRewrite] Error:", err);
        setRewriteError(err?.message ?? "Rewrite failed. Please try again.");
      } finally {
        setIsRewriting(false);
      }
    },
    [result]
  );

  return (
    <div className="pipeline-surface">

      {/* Daily usage indicator — always visible so teachers can see usage after generating */}
      {usage && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
          fontSize: "0.82rem",
          color: usage.canGenerate
            ? (usage.remaining <= 1 ? "#b45309" : "var(--text-secondary, #6b7280)")
            : "#dc2626",
        }}>
          {[...Array(usage.limit)].map((_, i) => (
            <span
              key={i}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                display: "inline-block",
                background: i < (usage.limit - usage.remaining)
                  ? "#d1d5db"
                  : (usage.canGenerate ? "#4f46e5" : "#dc2626"),
                border: "1.5px solid",
                borderColor: i < (usage.limit - usage.remaining) ? "#d1d5db" : (usage.canGenerate ? "#4f46e5" : "#dc2626"),
              }}
            />
          ))}
          <span>
            {usage.canGenerate
              ? `${usage.remaining} of ${usage.limit} free assessment${usage.limit !== 1 ? "s" : ""} remaining today`
              : "Daily limit reached — come back tomorrow or upgrade"}
          </span>
        </div>
      )}

      {/* Limit error */}
      {limitError && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fca5a5",
          color: "#7f1d1d",
          borderRadius: "8px",
          padding: "1rem 1.25rem",
          marginBottom: "1rem",
          fontSize: "0.9rem",
        }}>
          🚫 {limitError}
        </div>
      )}

      {/* Pipeline error — shown whenever the pipeline throws */}
      {pipelineError && (
        <div style={{
          background: "#fff7ed",
          border: "1px solid #fdba74",
          color: "#7c2d12",
          borderRadius: "8px",
          padding: "1rem 1.25rem",
          marginBottom: "1rem",
          fontSize: "0.9rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
        }}>
          <span>⚠️ <strong>Generation failed:</strong> {pipelineError}</span>
          <button
            onClick={() => setPipelineError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", lineHeight: 1, flexShrink: 0 }}
            aria-label="Dismiss error"
          >✕</button>
        </div>
      )}

      {/* While the pipeline is running, show a clean generation status card */}
      {!result && !limitError && isLoading ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          padding: "3rem 2rem",
          borderRadius: "12px",
          background: "var(--bg-secondary, #f8f8f8)",
          border: "1px solid var(--border, #e0e0e0)",
          textAlign: "center",
          minHeight: "220px",
        }}>
          <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>🚀</div>
          <div>
            <p style={{ margin: "0 0 0.35rem", fontWeight: 700, fontSize: "1.1rem", color: "var(--fg, #111)" }}>
              Generating your assessment…
            </p>
            {pendingEstimatedSeconds != null && pendingEstimatedSeconds > 0 && (
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary, #555)" }}>
                Estimated time: ~{pendingEstimatedSeconds < 60
                  ? `${pendingEstimatedSeconds}s`
                  : `${Math.round(pendingEstimatedSeconds / 60)} min`}
              </p>
            )}
          </div>
          <div style={{
            width: "48px",
            height: "48px",
            border: "4px solid var(--border, #e0e0e0)",
            borderTopColor: "var(--accent-color, #4f46e5)",
            borderRadius: "50%",
            animation: "spin 0.9s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : !result && !limitError && !peResult ? (
        <ConversationalAssessment
          onComplete={handleConversationComplete}
          isLoading={isLoading}
          disabled={usage !== null && !usage.canGenerate}
        />
      ) : !result && !peResult && limitError ? null : !result && peResult ? (
        /* Prompt Engineer validation panel — shown before pipeline fires */
        <PromptEngineerPanel
          result={peResult}
          onProceed={handleProceed}
          onEdit={handleEditInputs}
          onOverride={handleProceed}
        />
      ) : (
        <button
          onClick={() => { setResult(null); setLimitError(null); setPipelineError(null); setPeResult(null); setPendingIntent(null); setRewriteError(null); refreshUsage(); }}
          style={{ marginBottom: "1rem", cursor: "pointer" }}
        >
          ← New Assessment
        </button>
      )}

      {result && (
        <div style={{ marginTop: "1rem" }}>
          {result.finalAssessment ? (
            <>
              <AssessmentViewer
                assessment={result.finalAssessment}
                title={getTitle(result)}
                subtitle={getSubtitle(result)}
                uar={result.blueprint?.uar ?? result.uar}
                philosopherNotes={result.philosopherWrite?.philosopherNotes}
                philosopherAnalysis={result.philosopherWrite?.analysis}
                teacherFeedback={result.philosopherWrite?.teacherFeedback}
              />

              {/* Post-Builder Teacher Feedback Panel */}
              <TeacherFeedbackPanel
                onSubmit={handleTeacherFeedback}
                isLoading={isRewriting}
                error={rewriteError}
                wasRewritten={result.teacherRewriteApplied ?? false}
              />
            </>
          ) : (
            <pre className="json-preview" style={{ padding: "1rem" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}

          {result.trace && (
            <details className="trace-collapsible" style={{ marginTop: "2rem" }}>
              <summary className="trace-collapsible-summary">
                Pipeline debug trace
              </summary>
              <div style={{ marginTop: "0.75rem" }}>
                <TraceViewer trace={result.trace} />
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
