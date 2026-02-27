// src/components_new/Pipeline/ConversationalAssessmentWrapper.tsx
import { useState, useCallback, useEffect } from "react";
import { ConversationalAssessment, ConversationalIntent } from "./ConversationalAssessment";
import { TraceViewer } from "./TraceViewer";
import { AssessmentViewer } from "./AssessmentViewer";
import { convertMinimalToUAR } from "@/pipeline/orchestrator/convertMinimalToUAR";
import { generateAssessment } from "@/config/aiConfig";
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

  const safeUserId = userId ?? "00000000-0000-0000-0000-000000000000";

  // Load (or refresh) daily usage
  const refreshUsage = useCallback(async () => {
    const u = await getDailyUsage(safeUserId);
    setUsage(u);
    return u;
  }, [safeUserId]);

  useEffect(() => { refreshUsage(); }, [refreshUsage]);

  const handleComplete = useCallback(
    async (intent: ConversationalIntent) => {
      setLimitError(null);
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
          ...intent,
          assessmentType: intent.assessmentType as MinimalTeacherIntent["assessmentType"],
          time: intent.time ?? 10,
        };

        const uar = {
          ...convertMinimalToUAR(minimalIntent),
          userId: safeUserId,
        };

        const data = await generateAssessment(uar);
        setResult(data);
        onResult(data);

        // Refresh counter after a successful run
        await refreshUsage();
      } finally {
        setIsLoading(false);
      }
    },
    [safeUserId, onResult, refreshUsage]
  );

  return (
    <div className="pipeline-surface">

      {/* Daily usage indicator */}
      {usage && !result && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
          fontSize: "0.82rem",
          color: usage.canGenerate
            ? (usage.remaining <= 1 ? "#b45309" : "var(--color-muted, #6b7280)")
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
                background: i < usage.count
                  ? (usage.canGenerate ? "#d1d5db" : "#dc2626")
                  : "#4f46e5",
                border: "1.5px solid",
                borderColor: i < usage.count ? "#d1d5db" : "#4f46e5",
              }}
            />
          ))}
          <span>
            {usage.canGenerate
              ? `${usage.remaining} free assessment${usage.remaining !== 1 ? "s" : ""} remaining today`
              : "Daily limit reached"}
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

      {/* Always show the conversational form unless a result is ready */}
      {!result && !limitError ? (
        <ConversationalAssessment
          onComplete={handleComplete}
          isLoading={isLoading}
          disabled={usage !== null && !usage.canGenerate}
        />
      ) : !result && limitError ? null : (
        <button
          onClick={() => { setResult(null); setLimitError(null); refreshUsage(); }}
          style={{ marginBottom: "1rem", cursor: "pointer" }}
        >
          ← New Assessment
        </button>
      )}

      {result && (
        <div style={{ marginTop: "1rem" }}>
          {result.finalAssessment ? (
            <AssessmentViewer
              assessment={result.finalAssessment}
              title={getTitle(result)}
              subtitle={getSubtitle(result)}
              uar={result.blueprint?.uar ?? result.uar}
              philosopherNotes={(result as any).notes}
            />
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
