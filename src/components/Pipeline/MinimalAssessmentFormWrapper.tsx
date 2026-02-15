/**
 * MinimalAssessmentFormWrapper.tsx
 * 
 * Wraps MinimalAssessmentForm and integrates with useUserFlow pipeline
 */

import { useState } from 'react';
import { MinimalAssessmentForm, AssessmentIntent } from './MinimalAssessmentForm';
import { useUserFlow } from '../../hooks/useUserFlow';
import { summarizeAssessmentIntent } from '../../services/assessmentSummarizerService';

export default function MinimalAssessmentFormWrapper() {
  const {
    setGoal,
    setHasSourceDocs,
    setSourceFile,
    setIntentData,
    setGeneratedAssignment,
  } = useUserFlow();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (intent: AssessmentIntent) => {
    try {
      setIsGenerating(true);
      setError(null);

      console.log('📋 MinimalAssessmentForm submitted:', intent);

      // Update pipeline state
      setGoal('create');
      setHasSourceDocs(!!intent.sourceFile);

      if (intent.sourceFile) {
        setSourceFile(intent.sourceFile);
      }

      // For topic-based flow
      if (intent.sourceTopic) {
        setIntentData({
          topic: intent.sourceTopic,
          gradeLevel: mapStudentLevelToGrade(intent.studentLevel),
          assignmentType: intent.assessmentType,
          bloomTargets: [],
        });
      }

      // Generate assignment
      console.log('🤖 Calling summarizeAssessmentIntent...');
      const assignment = await summarizeAssessmentIntent(intent);

      if (assignment) {
        setGeneratedAssignment(assignment);
        console.log('✅ Assignment generated:', assignment);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate assessment';
      setError(msg);
      console.error('❌ Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (error) {
    return (
      <div className="wrapper-container error-state">
        <div className="error-box">
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <button onClick={() => setError(null)}>← Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrapper-container">
      <MinimalAssessmentForm onSubmit={handleFormSubmit} isLoading={isGenerating} />
    </div>
  );
}

function mapStudentLevelToGrade(level: string): string {
  const map: Record<string, string> = {
    Remedial: '6-8',
    Standard: '9-10',
    Honors: '11-12',
    AP: 'Higher Education',
  };
  return map[level] || '9-10';
}

/* Wrapper styles */
export const styles = `
.wrapper-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: var(--bg-primary);
}

.error-state {
  align-items: center;
}

.error-box {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  text-align: center;
}

.error-box h2 {
  color: var(--text-primary);
  margin: 0 0 1rem;
}

.error-box p {
  color: var(--text-secondary);
  margin: 0 0 1.5rem;
}

.error-box button {
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.error-box button:hover {
  opacity: 0.9;
}
`;

