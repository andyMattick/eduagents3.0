
import React, { useState } from 'react';
import { usePipeline } from '../../hooks/usePipeline';
import { VersionComparison } from './VersionComparison';

export function PipelineShell() {
  const {
    step,
    originalText,
    rewrittenText,
    summary,
    appliedTags,
    tagChanges,
    setOriginalText,
    analyzeText,
    rewriteText,
  } = usePipeline();

  const [input, setInput] = useState('');

  return (
    <div>
      {step === 0 && (
        <div>
          <h2>Step 1: Enter Assignment</h2>
          <textarea
            rows={10}
            cols={80}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <br />
          <button onClick={() => analyzeText(input)}>Analyze</button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2>Step 2: Analysis</h2>
          <p>Tags Detected: {appliedTags.join(', ')}</p>
          <button onClick={rewriteText}>Rewrite</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Step 3: Rewritten Assignment</h2>
          <VersionComparison
            original={originalText}
            rewritten={rewrittenText}
            summary={summary}
            tagChanges={tagChanges}
          />
        </div>
      )}
    </div>
  );
}
