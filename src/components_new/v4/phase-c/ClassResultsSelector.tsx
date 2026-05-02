type ResultType = "predicted" | "actual" | "compare";

type Props = {
  selected: ResultType;
  onChange: (value: ResultType) => void;
};

const OPTIONS: Array<{ value: ResultType; label: string }> = [
  { value: "predicted", label: "Predicted Results" },
  { value: "actual", label: "Actual Results" },
  { value: "compare", label: "Predicted vs. Actual" },
];

export function ClassResultsSelector({ selected, onChange }: Props) {
  return (
    <div className="phasec-tabs" role="tablist" aria-label="Class results selector">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          className={selected === option.value ? "active" : ""}
          role="tab"
          aria-selected={selected === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export type { ResultType };
