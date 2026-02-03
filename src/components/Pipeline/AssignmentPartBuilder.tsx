import { useEffect } from 'react';

export interface AssignmentPart {
  id: string;
  title: string;
  instructions: string;
}

interface AssignmentPartBuilderProps {
  parts: AssignmentPart[];
  onChange: (parts: AssignmentPart[]) => void;
}

const DEFAULT_PARTS: AssignmentPart[] = [
  {
    id: '1',
    title: 'Part 1: Introduction',
    instructions: 'Introduce the topic and provide context. State your main thesis or objective.',
  },
  {
    id: '2',
    title: 'Part 2: Main Content',
    instructions: 'Develop your argument or explanation. Include supporting evidence and analysis.',
  },
  {
    id: '3',
    title: 'Part 3: Conclusion',
    instructions: 'Summarize your findings and reflect on the implications.',
  },
];

export function AssignmentPartBuilder({
  parts,
  onChange,
}: AssignmentPartBuilderProps) {
  // Initialize with default parts if empty
  useEffect(() => {
    if (parts.length === 0) {
      onChange(DEFAULT_PARTS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePartTitleChange = (id: string, title: string) => {
    const updatedParts = parts.map(p => p.id === id ? { ...p, title } : p);
    onChange(updatedParts);
  };

  const handlePartInstructionsChange = (id: string, instructions: string) => {
    const updatedParts = parts.map(p => p.id === id ? { ...p, instructions } : p);
    onChange(updatedParts);
  };

  const addPart = () => {
    const newId = (Math.max(...parts.map(p => parseInt(p.id)), 0) + 1).toString();
    const newPart: AssignmentPart = {
      id: newId,
      title: `Part ${parts.length + 1}`,
      instructions: '',
    };
    onChange([...parts, newPart]);
  };

  const removePart = (id: string) => {
    if (parts.length > 1) {
      onChange(parts.filter(p => p.id !== id));
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
        📑 Assignment Parts
      </label>
      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 12px 0' }}>
        Default structure provided. Edit titles and instructions, or add/remove parts as needed.
      </p>

      <div style={{ backgroundColor: '#f9f9f9', padding: '12px', borderRadius: '4px', border: '1px solid #eee' }}>
        {parts.map((part, idx) => (
          <div
            key={part.id}
            style={{
              marginBottom: idx < parts.length - 1 ? '16px' : '0',
              paddingBottom: idx < parts.length - 1 ? '16px' : '0',
              borderBottom: idx < parts.length - 1 ? '1px solid #ddd' : 'none',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={part.title}
                onChange={(e) => handlePartTitleChange(part.id, e.target.value)}
                placeholder="Part title..."
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: 'Arial, sans-serif',
                  boxSizing: 'border-box',
                  fontWeight: '500',
                }}
              />
              {parts.length > 1 && (
                <button
                  onClick={() => removePart(part.id)}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#d9534f',
                    fontSize: '16px',
                  }}
                  title="Remove this part"
                >
                  ✕
                </button>
              )}
            </div>

            <textarea
              value={part.instructions}
              onChange={(e) => handlePartInstructionsChange(part.id, e.target.value)}
              placeholder="Instructions for this part..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '13px',
                fontFamily: 'Arial, sans-serif',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={addPart}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#007bff',
          fontWeight: 'bold',
          marginTop: '12px',
        }}
      >
        + Add Another Part
      </button>
    </div>
  );
}
