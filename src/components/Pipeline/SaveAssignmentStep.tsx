import { useState } from 'react';
import { GeneratedAssignment } from '../../hooks/useUserFlow';
import { saveAssignment } from '../../services/teacherSystemService';
import { useAuth } from '../../hooks/useAuth';
import { exportDocumentPreviewPDF } from '../../utils/exportUtils';
import './SaveAssignmentStep.css';

interface SaveAssignmentStepProps {
  assignment: GeneratedAssignment;
  onSaveComplete: () => void;
  onCancel: () => void;
}

export function SaveAssignmentStep({
  assignment,
  onSaveComplete,
  onCancel,
}: SaveAssignmentStepProps) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Convert GeneratedAssignment to AssignmentDetail format
      // Keep the complete assignment structure in content for retrieval
      const assignmentDetail = {
        title: assignment.title,
        subject: assignment.topic,
        gradeLevel: '9-12', // Should be from intent data, but defaulting
        assignmentType: assignment.assignmentType,
        status: 'draft' as const,
        sections: assignment.sections.map((section, idx) => ({
          id: section.sectionId || `section-${idx}`,
          title: section.sectionName || `Section ${idx + 1}`,
          instructions: section.instructions || '',
          problems: section.problems,
          order: idx,
        })),
        estimatedTimeMinutes: assignment.estimatedTime,
        specifications: {
          title: assignment.title,
          instructions: '',
          subject: assignment.topic,
          gradeLevel: '9-12',
          assignmentType: assignment.assignmentType,
          assessmentType: 'general',
          estimatedTime: assignment.estimatedTime,
          difficulty: 'medium',
        },
        metadata: {
          bloomDistribution: assignment.bloomDistribution,
          sourceFile: assignment.sourceFile?.name,
        },
        isTemplate: false,
        tags: [],
        sourceFileName: assignment.sourceFile?.name,
        version: 1,
        // Store the full GeneratedAssignment in content for later retrieval
        content: assignment,
      };

      // Save to database
      await saveAssignment(user.id, assignmentDetail as any);
      
      setSuccess(true);
      
      // Wait a moment then call onSaveComplete
      setTimeout(() => {
        onSaveComplete();
      }, 1500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save assignment';
      setError(errorMsg);
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const success = await exportDocumentPreviewPDF('document-preview-container', assignment.title || 'assignment');
      if (success) {
        // PDF was exported successfully by the function
        const link = document.createElement('a');
        link.download = `${assignment.title || 'assignment'}.pdf`;
        link.click();
      }
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF');
    }
  };

  if (success) {
    return (
      <div style={{
        maxWidth: '900px',
        margin: '2rem auto',
        padding: '2rem',
        background: 'var(--color-bg-card)',
        borderRadius: '12px',
        border: '2px solid #28a745',
        textAlign: 'center',
      }}>
        <h2 style={{ color: '#28a745', marginTop: 0 }}>✅ Assignment Saved!</h2>
        <p>Your assignment has been successfully saved to your dashboard.</p>
        <div style={{ marginTop: '1rem', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Redirecting to dashboard...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '900px',
      margin: '2rem auto',
      padding: '2rem',
      background: 'var(--color-bg-card)',
      borderRadius: '12px',
      border: '1px solid var(--color-border)',
    }}>
      <h2>Save Assignment to Dashboard</h2>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'var(--color-bg-secondary, #f5f5f5)', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, color: 'var(--color-text-primary)' }}>{assignment.title}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '14px', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
          <div>
            <strong>Type:</strong> {assignment.assignmentType}
          </div>
          <div>
            <strong>Estimated Time:</strong> {assignment.estimatedTime} minutes
          </div>
          <div>
            <strong>Topic:</strong> {assignment.topic}
          </div>
          <div>
            <strong>Problems:</strong> {assignment.sections.reduce((sum, s) => sum + s.problems.length, 0)}
          </div>
          <div>
            <strong>Assessment Type:</strong> {assignment.assessmentType || 'general'}
          </div>
          <div>
            <strong>Status:</strong> <span style={{ color: '#ffc107' }}>Draft</span>
          </div>
        </div>

        {/* Preview of problems */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <h4 style={{ marginTop: 0, fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Problems Preview
          </h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {assignment.sections.map((section, sIdx) => (
              <div key={sIdx} style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                  {section.sectionName || `Section ${sIdx + 1}`}
                </div>
                {section.problems.slice(0, 3).map((problem, pIdx) => (
                  <div key={pIdx} style={{ 
                    fontSize: '12px', 
                    padding: '0.5rem', 
                    backgroundColor: 'var(--color-bg-card)', 
                    borderRadius: '4px', 
                    marginBottom: '0.5rem',
                    borderLeft: '3px solid #0066cc',
                    color: 'var(--color-text-primary)'
                  }}>
                    <strong>Q{pIdx + 1}:</strong> {problem.problemText?.substring(0, 80)}...
                  </div>
                ))}
                {section.problems.length > 3 && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', padding: '0.5rem' }}>
                    +{section.problems.length - 3} more problems
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c33',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
        This assignment will be saved to your dashboard as a draft. You can continue editing it anytime.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={onCancel}
          disabled={isSaving}
          style={{
            padding: '10px 24px',
            backgroundColor: '#f5f5f5',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          ← Back
        </button>
        <button
          onClick={handleExportPDF}
          disabled={isSaving}
          style={{
            padding: '10px 24px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          📄 Export PDF
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: '10px 24px',
            backgroundColor: isSaving ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {isSaving ? 'Saving...' : '💾 Save to Dashboard'}
        </button>
      </div>
    </div>
  );
}
