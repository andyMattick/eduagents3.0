import React, { useState } from 'react';
import { PipelineStep } from '../../types/pipeline';
import { usePipeline } from '../../hooks/usePipeline';
import { AssignmentInput } from './AssignmentInput';
import { TagAnalysis } from './TagAnalysis';
import { StudentSimulations } from './StudentSimulations';
import { RewriteResults } from './RewriteResults';
import { VersionComparison } from './VersionComparison';

export function PipelineShell() {
  const {
    step,
    originalText,
    rewrittenText,
    rewriteSummary,
    tags,
    studentFeedback,
    tagChanges,
    isLoading,
    error,
    versionAnalysis,
    rewrittenTags,
    analyzeTextAndTags,
    nextStep,
    reset,
  } = usePipeline();

  const [input, setInput] = useState('');

  const handleAnalyzeClick = async () => {
    await analyzeTextAndTags(input);
  };

  const handleNextStep = async () => {
    await nextStep();
  };

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#333' }}>
          📝 Assignment Pipeline
        </h1>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          Step {step + 1} of 5
        </p>
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0, 1, 2, 3, 4].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: '4px',
                  backgroundColor: step >= s ? '#007bff' : '#e0e0e0',
                  borderRadius: '2px',
                  transition: 'background-color 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '16px',
            marginBottom: '20px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {step === PipelineStep.INPUT && (
        <AssignmentInput
          value={input}
          onChange={setInput}
          onSubmit={handleAnalyzeClick}
          isLoading={isLoading}
        />
      )}

      {step === PipelineStep.TAG_ANALYSIS && (
        <TagAnalysis
          tags={tags}
          isLoading={isLoading}
          onNext={handleNextStep}
        />
      )}

      {step === PipelineStep.STUDENT_SIMULATIONS && (
        <StudentSimulations
          feedback={studentFeedback}
          isLoading={isLoading}
          onNext={handleNextStep}
        />
      )}

      {step === PipelineStep.REWRITE_RESULTS && (
        <RewriteResults
          originalText={originalText}
          rewrittenText={rewrittenText}
          summaryOfChanges={rewriteSummary}
          appliedTags={rewrittenTags}
          isLoading={isLoading}
          onNext={handleNextStep}
        />
      )}

      {step === PipelineStep.VERSION_COMPARISON && (
        <VersionComparison
          original={originalText}
          rewritten={rewrittenText}
          summary={rewriteSummary}
          tagChanges={tagChanges}
          versionAnalysis={versionAnalysis}
          onReset={reset}
        />
      )}
    </div>
  );
}
