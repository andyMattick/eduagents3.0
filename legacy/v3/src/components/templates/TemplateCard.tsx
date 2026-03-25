interface TemplateCardProps {
  template: any;
  readOnly?: boolean;
}

export default function TemplateCard({ template, readOnly = false }: TemplateCardProps) {
  return (
    <div className="template-card">
      <h3>{template.label}</h3>
      <p><strong>Subject:</strong> {template.subject}</p>
      <p><strong>Item Type:</strong> {template.itemType}</p>
      <p><strong>Intent:</strong> {template.cognitiveIntent}</p>
      <p><strong>Difficulty:</strong> {template.difficulty}</p>

      {!readOnly && (
        <a href={`/templates/${template.id}`} className="btn btn-secondary">
          Edit
        </a>
      )}
    </div>
  );
}
