import React from 'react';
import { StudentFeedback } from '../../types/pipeline';
import { ACCESSIBILITY_PROFILES } from '../../agents/simulation/accessibilityProfiles';

interface AccessibilityFeedbackProps {
  feedback: StudentFeedback[];
  isExpanded?: boolean;
}

/**
 * Displays accessibility-focused student feedback
 * Shows how text would be experienced by students with different learning needs
 */
export const AccessibilityFeedback: React.FC<AccessibilityFeedbackProps> = ({
  feedback,
  isExpanded = false,
}) => {
  const [expanded, setExpanded] = React.useState(isExpanded);
  const accessibilityFeedback = feedback.filter(f =>
    Object.values(ACCESSIBILITY_PROFILES).some(p => p.name === f.studentPersona),
  );

  if (accessibilityFeedback.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#f0f4ff',
        border: '2px solid #4f46e5',
        borderRadius: '8px',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600',
          color: '#4f46e5',
          padding: '0',
          marginBottom: expanded ? '12px' : '0',
        }}
      >
        {expanded ? '▼' : '▶'} Accessibility & Learning Profiles
      </button>

      {expanded && (
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '14px', color: '#5a6b7d', marginBottom: '16px' }}>
            How this assignment would be experienced by students with different learning needs:
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px',
            }}
          >
            {accessibilityFeedback.map((f, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5e0',
                  borderRadius: '6px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color:
                      f.feedbackType === 'strength'
                        ? '#047857'
                        : f.feedbackType === 'weakness'
                          ? '#dc2626'
                          : '#d97706',
                  }}
                >
                  {f.studentPersona}
                  {f.feedbackType === 'strength' && ' ✓'}
                  {f.feedbackType === 'weakness' && ' ✗'}
                  {f.feedbackType === 'suggestion' && ' →'}
                </div>

                <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5', margin: '0' }}>
                  {f.content}
                </p>

                {f.engagementScore !== undefined && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                    Engagement: {(f.engagementScore * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#fef3c7',
              borderLeft: '4px solid #f59e0b',
              borderRadius: '4px',
              fontSize: '13px',
              color: '#78350f',
            }}
          >
            <strong>💡 Tip:</strong> Use these insights to make your assignment more inclusive. Simple changes
            like shorter paragraphs, clear headings, and explicit transitions benefit many students.
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityFeedback;
