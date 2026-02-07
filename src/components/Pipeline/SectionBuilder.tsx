import { useState } from 'react';
import './SectionBuilder.css';

export interface CustomSection {
  sectionName: string;
  problemType: 'procedural' | 'conceptual' | 'application' | 'mixed' | 'ai-decide';
  topic: string;
  questionCount: number;
  includeTips: boolean;
  questionFormat?: 'multiple-choice' | 'true-false' | 'short-answer' | 'free-response' | 'fill-blank' | 'ai-decide';
}

interface SectionBuilderProps {
  onSectionsChange: (sections: CustomSection[]) => void;
  availableTopics?: string[];
}

const PROBLEM_TYPES = [
  { id: 'procedural', label: 'Procedural', description: 'Step-by-step process problems' },
  { id: 'conceptual', label: 'Conceptual', description: 'Understanding core ideas' },
  { id: 'application', label: 'Application', description: 'Real-world or novel situations' },
  { id: 'mixed', label: 'Mixed', description: 'Combination of types' },
  { id: 'ai-decide', label: 'Let AI Decide', description: 'AI will choose best mix' },
];

/**
 * SectionBuilder Component
 * Allows teachers to manually define custom sections for their assignment
 * Shows when user selects "I'll Organize Sections"
 */
export function SectionBuilder({ onSectionsChange, availableTopics = [] }: SectionBuilderProps) {
  const [sections, setSections] = useState<CustomSection[]>([
    {
      sectionName: '',
      problemType: 'ai-decide',
      topic: '',
      questionCount: 4,
      includeTips: false,
      questionFormat: 'ai-decide',
    },
  ]);

  const [errors, setErrors] = useState<Record<number, string[]>>({});

  const handleSectionChange = (
    index: number,
    field: keyof CustomSection,
    value: string | number | boolean
  ) => {
    const newSections = [...sections];
    const updatedSection = {
      ...newSections[index],
      [field]: value,
    };

    // Auto-fill sectionName from topic if sectionName is empty
    if (field === 'topic' && !newSections[index].sectionName) {
      updatedSection.sectionName = String(value);
    }

    newSections[index] = updatedSection;
    setSections(newSections);
    onSectionsChange(newSections);

    // Clear errors for this section when user makes changes
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const addSection = () => {
    setSections([
      ...sections,
      {
        sectionName: '',
        problemType: 'ai-decide',
        topic: '',
        questionCount: 4,
        includeTips: false,
        questionFormat: 'ai-decide',
      },
    ]);
  };

  const removeSection = (index: number) => {
    if (sections.length > 1) {
      const newSections = sections.filter((_, i) => i !== index);
      setSections(newSections);
      onSectionsChange(newSections);

      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const validateSection = (index: number): boolean => {
    const section = sections[index];
    const sectionErrors: string[] = [];

    if (!section.sectionName.trim()) {
      sectionErrors.push('Section name is required');
    }

    if (!section.topic.trim()) {
      sectionErrors.push('Material covered is required');
    }

    if (section.questionCount < 1 || section.questionCount > 50) {
      sectionErrors.push('Question count must be between 1 and 50');
    }

    if (sectionErrors.length > 0) {
      setErrors({ ...errors, [index]: sectionErrors });
      return false;
    }

    return true;
  };

  const allSectionsValid = (): boolean => {
    let isValid = true;
    sections.forEach((_, index) => {
      if (!validateSection(index)) {
        isValid = false;
      }
    });
    return isValid;
  };

  return (
    <div className="section-builder">
      <div className="section-builder-header">
        <h3>📏 Define Your Sections</h3>
        <p>Create custom problem sections. AI will handle Bloom alignment and scaffolding.</p>
        <div className="bloom-info">
          <strong>📊 How we'll distribute difficulty:</strong>
          <p>
            Most questions will focus on core skills like explaining, applying, and analyzing.
            A few will challenge students to justify, design, or critique — and will include
            support if needed.
          </p>
        </div>
      </div>

      <div className="sections-list">
        {sections.map((section, index) => (
          <div key={index} className="section-card">
            <div className="section-header">
              <h4 className="section-number">Section {index + 1}</h4>
              {sections.length > 1 && (
                <button
                  className="remove-section-btn"
                  onClick={() => removeSection(index)}
                  title="Remove this section"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Errors */}
            {errors[index] && (
              <div className="section-errors">
                {errors[index].map((error, errIdx) => (
                  <p key={errIdx}>{error}</p>
                ))}
              </div>
            )}

            {/* Section Name */}
            <div className="form-field">
              <label htmlFor={`section-name-${index}`}>
                <span className="label-text">Section Name</span>
                <span className="required">*</span>
              </label>
              <input
                id={`section-name-${index}`}
                type="text"
                value={section.sectionName}
                onChange={e => handleSectionChange(index, 'sectionName', e.target.value)}
                placeholder="e.g., Graphing Systems, Word Problems, Mixed Review"
                className="text-input"
              />
            </div>

            {/* Material Covered */}
            <div className="form-field">
              <label htmlFor={`section-topic-${index}`}>
                <span className="label-text">
                  Material Covered
                  <span className="label-hint">(specific topic or concept)</span>
                </span>
                <span className="required">*</span>
              </label>
              {availableTopics && availableTopics.length > 0 ? (
                <select
                  id={`section-topic-${index}`}
                  value={section.topic}
                  onChange={e => handleSectionChange(index, 'topic', e.target.value)}
                  className="select-input"
                >
                  <option value="">Select a topic from your notes...</option>
                  {availableTopics.map(topic => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`section-topic-${index}`}
                  type="text"
                  value={section.topic}
                  onChange={e => handleSectionChange(index, 'topic', e.target.value)}
                  placeholder="e.g., Solving Systems by Graphing"
                  className="text-input"
                />
              )}
              <p className="field-hint">
                This will auto-fill the section name if left blank
              </p>
            </div>

            {/* Problem Type */}
            <div className="form-field">
              <label htmlFor={`section-type-${index}`}>
                <span className="label-text">Problem Type</span>
              </label>
              <select
                id={`section-type-${index}`}
                value={section.problemType}
                onChange={e =>
                  handleSectionChange(
                    index,
                    'problemType',
                    e.target.value as CustomSection['problemType']
                  )
                }
                className="select-input"
              >
                {PROBLEM_TYPES.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.label} — {type.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Question Format */}
            <div className="form-field">
              <label htmlFor={`section-format-${index}`}>
                <span className="label-text">Question Format</span>
                <span className="label-hint">(let AI decide or override)</span>
              </label>
              <select
                id={`section-format-${index}`}
                value={section.questionFormat || 'ai-decide'}
                onChange={e =>
                  handleSectionChange(
                    index,
                    'questionFormat',
                    e.target.value as CustomSection['questionFormat']
                  )
                }
                className="select-input"
              >
                <option value="ai-decide">🤖 Let AI Decide</option>
                <option value="multiple-choice">Multiple Choice</option>
                <option value="true-false">True / False</option>
                <option value="short-answer">Short Answer</option>
                <option value="free-response">Free Response</option>
                <option value="fill-blank">Fill in the Blank</option>
              </select>
            </div>

            {/* Grid for Inline Fields */}
            <div className="form-row">
              {/* Question Count */}
              <div className="form-field">
                <label htmlFor={`section-count-${index}`}>
                  <span className="label-text">Number of Questions</span>
                </label>
                <div className="input-with-unit">
                  <input
                    id={`section-count-${index}`}
                    type="number"
                    min="1"
                    max="50"
                    value={section.questionCount}
                    onChange={e =>
                      handleSectionChange(index, 'questionCount', parseInt(e.target.value) || 1)
                    }
                    className="number-input"
                  />
                  <span className="unit-label">questions</span>
                </div>
              </div>

              {/* Include Tips */}
              <div className="form-field form-field-checkbox">
                <label title="AI will reference your notes or provide formulas, reminders, or scaffolds.">
                  <input
                    type="checkbox"
                    checked={section.includeTips}
                    onChange={e => handleSectionChange(index, 'includeTips', e.target.checked)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-label">Include tips or hints for students?</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Section Button */}
      <button className="add-section-btn" onClick={addSection}>
        + Add Another Section
      </button>

      {/* Summary */}
      <div className="section-summary">
        <div className="summary-stat">
          <span className="stat-label">Total Sections:</span>
          <span className="stat-value">{sections.length}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Total Questions:</span>
          <span className="stat-value">{sections.reduce((sum, s) => sum + s.questionCount, 0)}</span>
        </div>
      </div>
    </div>
  );
}
