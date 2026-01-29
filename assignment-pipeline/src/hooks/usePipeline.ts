import { useState } from 'react';
import { AssignmentVersion, TagChange } from '../types/pipeline';

export function usePipeline() {
  const [originalText, setOriginalText] = useState('');
  const [rewrittenText, setRewrittenText] = useState('');
  const [summary, setSummary] = useState('');
  const [appliedTags, setAppliedTags] = useState<string[]>([]);
  const [tagChanges, setTagChanges] = useState<TagChange[]>([]);
  const [step, setStep] = useState(0);

  const analyzeText = (text: string) => {
    // Simulate tag analysis
    const tags = ['clarity', 'tone', 'structure'];
    setAppliedTags(tags);
    setOriginalText(text);
    setStep(1);
  };

  const rewriteText = () => {
    // Simulate rewrite
    const rewritten = originalText.replace(/very/g, 'extremely');
    setRewrittenText(rewritten);
    setSummary('Improved clarity and tone by replacing vague modifiers.');
    setTagChanges([
      { tag: 'clarity', delta: 1 },
      { tag: 'tone', delta: 1 },
    ]);
    setStep(2);
  };

  return {
    step,
    originalText,
    rewrittenText,
    summary,
    appliedTags,
    tagChanges,
    setOriginalText,
    analyzeText,
    rewriteText,
    setStep,
  };
}
