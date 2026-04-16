interface Props {
  hasActions: boolean;
  generating: boolean;
  disabled?: boolean;
  onGenerate: (type: "review" | "test" | "both") => void;
}

export function GenerateActionsBar({ hasActions, generating, disabled, onGenerate }: Props) {
  const off = disabled || !hasActions || generating;
  return (
    <div className="cm-generate-bar">
      <button
        className="cm-btn cm-btn--primary"
        disabled={off}
        onClick={() => onGenerate("review")}
      >
        {generating ? "Generating…" : "Generate Review"}
      </button>
      <button
        className="cm-btn cm-btn--primary"
        disabled={off}
        onClick={() => onGenerate("test")}
      >
        {generating ? "Generating…" : "Generate Test"}
      </button>
      <button
        className="cm-btn"
        disabled={off}
        onClick={() => onGenerate("both")}
      >
        Generate Both
      </button>
    </div>
  );
}
