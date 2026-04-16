interface Props {
  hasActions: boolean;
  generating: boolean;
  onGenerate: (type: "review" | "test" | "both") => void;
}

export function GenerateActionsBar({ hasActions, generating, onGenerate }: Props) {
  return (
    <div className="cm-generate-bar">
      <button
        className="cm-btn cm-btn--primary"
        disabled={!hasActions || generating}
        onClick={() => onGenerate("review")}
      >
        {generating ? "Generating…" : "Generate Review"}
      </button>
      <button
        className="cm-btn cm-btn--primary"
        disabled={!hasActions || generating}
        onClick={() => onGenerate("test")}
      >
        {generating ? "Generating…" : "Generate Test"}
      </button>
      <button
        className="cm-btn"
        disabled={!hasActions || generating}
        onClick={() => onGenerate("both")}
      >
        Generate Both
      </button>
    </div>
  );
}
