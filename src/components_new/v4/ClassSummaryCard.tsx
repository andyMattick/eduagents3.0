export type ProfileSummary = {
  profile: string;
  minScore: number;
  maxScore: number;
  minTime: number;
  maxTime: number;
};

type Props = {
  summary: ProfileSummary;
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatMinutes(value: number): string {
  return `${Math.max(0, Math.round(value / 60))} min`;
}

export function ClassSummaryCard({ summary }: Props) {
  return (
    <div className="v4-shortcircuit-result-card" style={{ marginTop: "0.75rem" }}>
      <h3 className="v4-shortcircuit-tree-title">{summary.profile}</h3>
      <p className="phasec-copy" style={{ marginTop: "0.35rem" }}>
        Score: {formatPercent(summary.minScore)} - {formatPercent(summary.maxScore)}
      </p>
      <p className="phasec-copy" style={{ marginTop: "0.35rem" }}>
        Time: {formatMinutes(summary.minTime)} - {formatMinutes(summary.maxTime)}
      </p>
    </div>
  );
}
