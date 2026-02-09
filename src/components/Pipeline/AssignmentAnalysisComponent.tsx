import { useState, useEffect } from 'react';
import './AssignmentAnalysisComponent.css';
import { useUserFlow, GeneratedAssignment, GeneratedSection, GeneratedProblem } from '../../hooks/useUserFlow';
import { parseUploadedFile } from '../../agents/shared/parseFiles';

/**
 * Assignment Analysis Component
 * Analyzes a teacher-authored assignment and structures it into a GeneratedAssignment object
 * Used when goal === "analyze" (with or without source materials)
 */

interface AnalysisPreferences {
  breakIntoMultipleSections: boolean;
  numSections: number;
  identifyBloomLevels: boolean;
  addTips: boolean;
  estimatedDuration: number;
  refinementNotes: string;
}

/**
 * Calculate novelty score by comparing problem with source material
 * Returns a value between 0.0 (exact match to source) and 1.0 (completely novel)
 */
function calculateNoveltyScore(problemText: string, sourceText: string | null): 'low' | 'medium' | 'high' {
  if (!sourceText) {
    // No source material - score as medium/high
    return 'high';
  }

  // Normalize texts for comparison
  const normalizeProblem = problemText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const normalizeSource = sourceText.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  // Calculate keyword overlap
  const matchedWords = normalizeProblem.filter(word => 
    normalizeSource.some(srcWord => srcWord.includes(word) || word.includes(srcWord))
  );

  const overlapRatio = normalizeProblem.length > 0 
    ? matchedWords.length / normalizeProblem.length 
    : 0;

  // Score based on overlap:
  // > 80% overlap = low novelty (exact match / paraphrased)
  // 40-80% overlap = medium novelty (related to source)
  // < 40% overlap = high novelty (novel application)
  if (overlapRatio > 0.8) return 'low';
  if (overlapRatio > 0.4) return 'medium';
  return 'high';
}

// Helper function to evaluate prior knowledge requirements
// (Reserved for future enhancement: scaffolding recommendations)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _requiresPriorKnowledgeHelper = (
  problemText: string,
  sourceText: string | null,
  bloomLevel: number
): boolean => {
  if (!sourceText) {
    // No source material - higher Bloom levels require more prior knowledge
    return bloomLevel >= 4; // Analyze and above
  }

  // Extract potential new concepts (words in problem not in source)
  const problemWords = new Set(problemText.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4));
  const sourceWords = new Set(sourceText.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4));

  const newWords = Array.from(problemWords).filter(word => !sourceWords.has(word));
  const percentageNew = problemWords.size > 0 ? newWords.length / problemWords.size : 0;

  // If more than 20% of significant words are new, or high Bloom level with new words, flag as prior knowledge required
  return percentageNew > 0.2 || (bloomLevel >= 4 && newWords.length > 0);
};

/**
 * AI-powered function to analyze assignment text and generate structured data
 */
async function analyzeAssignmentText(
  assignmentText: string,
  sourceText: string | null,
  preferences: AnalysisPreferences
): Promise<GeneratedAssignment> {
  // Mock AI analysis - in production, call real AI service
  console.log('🔍 Analyzing assignment with preferences:', preferences);

  // Extract basic metadata
  const title = assignmentText.split('\n')[0] || 'Assignment';
  // const wordCount = assignmentText.split(/\s+/).length; // Unused in mock analysis
  
  // Estimate Bloom distribution (mock - would be AI-powered)
  const bloomDistribution: Record<string, number> = {
    'Remember': 25,
    'Understand': 25,
    'Apply': 20,
    'Analyze': 15,
    'Evaluate': 10,
    'Create': 5,
  };

  // Generate mock problems from the text
  // Split by common question indicators
  const questionPattern = /^(?:\d+\.|Q:|Question:)/im;
  const lines = assignmentText.split('\n');
  const problems: GeneratedProblem[] = [];

  let currentQuestion = '';
  let questionIndex = 0;

  for (const line of lines) {
    if (questionPattern.test(line) && currentQuestion) {
      // We found a new question, save the previous one
      if (questionIndex < 20) {
        // Limit to 20 problems for mock
        const bloomNum = (questionIndex % 6) + 1;
        const noveltyScore = calculateNoveltyScore(currentQuestion, sourceText);
        // const _requiresPrior = requiresPriorKnowledge(currentQuestion, sourceText, bloomNum); // Reserved for future use
        
        problems.push({
          id: `q${questionIndex + 1}`,
          sectionId: preferences.breakIntoMultipleSections 
            ? `section-${Math.floor(questionIndex / Math.ceil(20 / preferences.numSections))}`
            : 'section-0',
          problemText: currentQuestion.trim(),
          problemType: (['procedural', 'conceptual', 'application'] as const)[questionIndex % 3],
          bloomLevel: bloomNum as 1 | 2 | 3 | 4 | 5 | 6,
          questionFormat: (['multiple-choice', 'true-false', 'short-answer', 'free-response'] as const)[questionIndex % 4],
          complexity: questionIndex < 7 ? 'low' : questionIndex < 14 ? 'medium' : 'high',
          novelty: noveltyScore,
          estimatedTime: 3,
          problemLength: currentQuestion.split(/\s+/).length,
          hasTip: preferences.addTips && bloomNum > 2,
          tipText: preferences.addTips && bloomNum > 2 
            ? 'Consider the key concepts and how they relate to each other.'
            : undefined,
          options: bloomNum <= 2 || bloomNum === 5 ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined,
          correctAnswer: 'Option B',
          sourceReference: sourceText && noveltyScore !== 'high' ? 'See reference material' : undefined,
        });
      }
      currentQuestion = line;
      questionIndex++;
    } else {
      currentQuestion += '\n' + line;
    }
  }

  // Add final question
  if (currentQuestion && questionIndex < 20) {
    const bloomNum = (questionIndex % 6) + 1;
    const noveltyScore = calculateNoveltyScore(currentQuestion, sourceText);
    // const _requiresPrior = requiresPriorKnowledge(currentQuestion, sourceText, bloomNum); // Reserved for future use
    
    problems.push({
      id: `q${questionIndex + 1}`,
      sectionId: preferences.breakIntoMultipleSections 
        ? `section-${Math.floor(questionIndex / Math.ceil(Math.min(problems.length + 1, 20) / preferences.numSections))}`
        : 'section-0',
      problemText: currentQuestion.trim(),
      problemType: (['procedural', 'conceptual', 'application'] as const)[questionIndex % 3],
      bloomLevel: bloomNum as 1 | 2 | 3 | 4 | 5 | 6,
      questionFormat: (['multiple-choice', 'true-false', 'short-answer', 'free-response'] as const)[questionIndex % 4],
      complexity: questionIndex < 7 ? 'low' : questionIndex < 14 ? 'medium' : 'high',
      novelty: noveltyScore,
      estimatedTime: 3,
      problemLength: currentQuestion.split(/\s+/).length,
      hasTip: preferences.addTips && bloomNum > 2,
      tipText: preferences.addTips && bloomNum > 2 
        ? 'Think about how the key concepts apply to the question.'
        : undefined,
      options: bloomNum <= 2 || bloomNum === 5 ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined,
      correctAnswer: 'Option B',
      sourceReference: sourceText && noveltyScore !== 'high' ? 'See reference material' : undefined,
    });
  }

  // Limit to reasonable number
  const finalProblems = problems.slice(0, 20);

  // Create sections
  const sections: GeneratedSection[] = [];
  if (preferences.breakIntoMultipleSections && preferences.numSections > 1) {
    for (let i = 0; i < preferences.numSections; i++) {
      const sectionProblems = finalProblems.filter(p => p.sectionId === `section-${i}`);
      if (sectionProblems.length > 0) {
        sections.push({
          sectionId: `section-${i}`,
          sectionName: `Section ${i + 1}`,
          instructions: `Answer all questions in this section.${sourceText ? ' Use the provided reference material as needed.' : ''}`,
          problemType: 'ai-decide',
          problems: sectionProblems,
          includeTips: preferences.addTips,
        });
      }
    }
  } else {
    sections.push({
      sectionId: 'section-0',
      sectionName: 'Assignment',
      instructions: `Answer all questions in this assignment.${sourceText ? ' Use the provided reference material as needed.' : ''}`,
      problemType: 'ai-decide',
      problems: finalProblems,
      includeTips: preferences.addTips,
    });
  }

  // Create the GeneratedAssignment
  const assignment: GeneratedAssignment = {
    assignmentId: `assignment-${Date.now()}`,
    assignmentType: 'Quiz',
    title: title.substring(0, 80),
    topic: 'Student-authored assignment',
    estimatedTime: Math.ceil(finalProblems.length * (preferences.estimatedDuration / finalProblems.length)) || 30,
    questionCount: finalProblems.length,
    assessmentType: 'formative',
    sections,
    bloomDistribution,
    organizationMode: 'ai-generated',
    timestamp: new Date().toISOString(),
  };

  return assignment;
}

export function AssignmentAnalysisComponent() {
  const { 
    sourceFile, 
    assignmentFile, 
    setGeneratedAssignment,
    generatedAssignment,
  } = useUserFlow();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default preferences for automatic analysis (no user interaction needed)
  const defaultPreferences: AnalysisPreferences = {
    breakIntoMultipleSections: true,
    numSections: 2,
    identifyBloomLevels: true,
    addTips: true,
    estimatedDuration: 30,
    refinementNotes: '',
  };

  // Auto-analyze when component mounts - with default preferences, no UI
  useEffect(() => {
    if (!generatedAssignment && assignmentFile && !isAnalyzing) {
      performDefaultAnalysis();
    }
  }, [assignmentFile, generatedAssignment, isAnalyzing]);

  const performDefaultAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);

      if (!assignmentFile) {
        setError('No assignment file selected');
        return;
      }

      // Parse the assignment file
      const assignmentText = await parseUploadedFile(assignmentFile);
      if (!assignmentText) {
        setError('Could not parse assignment file');
        return;
      }

      // Parse source file if provided
      let sourceText: string | null = null;
      if (sourceFile) {
        sourceText = await parseUploadedFile(sourceFile);
      }

      // Analyze with default preferences (automatic, instantly transitions)
      const generated = await analyzeAssignmentText(assignmentText, sourceText, defaultPreferences);

      // Set the generated assignment - this triggers automatic routing to /assignment-preview
      setGeneratedAssignment(generated);

      console.log('✅ Assignment analyzed and auto-routed to preview:', generated);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(`Failed to analyze assignment: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="assignment-analysis-component">
      <div className="analysis-container">
        {/* Loading State */}
        <div className="analysis-header" style={{ textAlign: 'center', marginTop: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>
            {isAnalyzing ? '🔍 Analyzing Assignment...' : '✅ Assignment Ready for Review'}
          </h1>
          
          {isAnalyzing && (
            <div style={{ marginTop: '2rem' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 2rem',
                  border: '4px solid #e0e0e0',
                  borderTop: '4px solid #2196f3',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '0.5rem' }}>
                {sourceFile ? 'Comparing with source materials...' : 'Extracting problems and metadata...'}
              </p>
              <p style={{ fontSize: '0.95rem', color: '#999' }}>
                {sourceFile && 'Source: ' + sourceFile.name}
                {sourceFile && assignmentFile && ' · '}
                {assignmentFile && 'Assignment: ' + assignmentFile.name}
              </p>
            </div>
          )}

          {!isAnalyzing && !error && (
            <div style={{ marginTop: '2rem' }}>
              <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
                Your assignment has been analyzed and structured. Proceeding to assignment review...
              </p>
              <div style={{ marginTop: '1rem', color: '#999', fontSize: '0.9rem' }}>
                <p>✓ Problems extracted and classified</p>
                <p>✓ Bloom's taxonomy levels identified</p>
                <p>✓ Novelty and prior knowledge assessed</p>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: '2rem',
                padding: '1.5rem',
                backgroundColor: '#ffebee',
                border: '1px solid #ef5350',
                borderRadius: '8px',
                textAlign: 'left',
                maxWidth: '500px',
                margin: '2rem auto 0',
              }}
            >
              <p style={{ color: '#c62828', marginTop: 0, fontWeight: 600 }}>❌ Analysis Failed</p>
              <p style={{ color: '#d32f2f', margin: '0.5rem 0 1rem' }}>{error}</p>
              <button
                onClick={() => window.history.back()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                ← Go Back
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
