import { TemplateRecord } from "./types";

interface TemplateCardProps {
  template: TemplateRecord;
  onOpen?: (template: TemplateRecord) => void;
}

export default function TemplateCard({ template, onOpen }: TemplateCardProps) {
  return (
    <button
      type="button"
      className="template-card"
      onClick={() => onOpen?.(template)}
    >
      <h3 className="template-card__title">{template.label}</h3>
      <div className="template-card__meta">
        <span>{String(template.cognitiveIntent ?? "n/a")}</span> · <span>{String(template.difficulty ?? "n/a")}</span>
      </div>
      <p className="template-card__explanation">
        {template.explanation ?? "No explanation available."}
      </p>
    </button>
  );
}
