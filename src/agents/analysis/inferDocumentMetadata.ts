import { DocumentMetadata } from '../../types/pipeline';

/**
 * Analyze document text and infer grade level, subject, and class level
 * Teacher can override these inferred values in DOCUMENT_NOTES step
 */
export function inferDocumentMetadata(
  documentText: string,
  problems?: any[]
): DocumentMetadata {
  const lowerText = documentText.toLowerCase();
  
  // Infer grade band from Bloom levels in problems + vocabulary complexity
  let gradeBand: "3-5" | "6-8" | "9-12" = "6-8"; // Default
  let gradeBandConfidence = 0.65;
  
  if (problems && problems.length > 0) {
    const bloomCounts: Record<string, number> = {};
    problems.forEach(p => {
      if (p.BloomLevel) {
        bloomCounts[p.BloomLevel] = (bloomCounts[p.BloomLevel] || 0) + 1;
      }
    });
    
    // If problems include Analyze/Evaluate/Create, likely higher grade
    const hasHigherBloom = bloomCounts['Analyze'] || bloomCounts['Evaluate'] || bloomCounts['Create'];
    const hasLowerBloom = bloomCounts['Remember'] || bloomCounts['Understand'];
    
    if (hasHigherBloom) {
      gradeBand = "9-12";
      gradeBandConfidence = 0.75;
    } else if (hasLowerBloom && !hasHigherBloom) {
      gradeBand = "3-5";
      gradeBandConfidence = 0.70;
    }
  }
  
  // Advanced vocabulary detection (AP/Honors indicator)
  const advancedWords = ['analyze', 'synthesize', 'critique', 'evaluate', 'algorithm', 'hypothesis', 'theorem'];
  const advancedWordCount = advancedWords.filter(w => lowerText.includes(w)).length;
  if (advancedWordCount > 2) {
    gradeBand = "9-12";
    gradeBandConfidence = 0.80;
  }
  
  // Infer subject from keywords
  let subject: "math" | "english" | "science" | "history" | "general" = "general";
  let subjectConfidence = 0.50;
  
  // Math keywords
  if (lowerText.includes('equation') || lowerText.includes('calculate') || 
      lowerText.includes('algebra') || lowerText.includes('geometry') ||
      lowerText.includes('solve for') || lowerText.includes('formula')) {
    subject = "math";
    subjectConfidence = 0.85;
  }
  // English/Language Arts keywords
  else if (lowerText.includes('essay') || lowerText.includes('paragraph') || 
           lowerText.includes('analysis') || lowerText.includes('literary') ||
           lowerText.includes('theme') || lowerText.includes('narrative')) {
    subject = "english";
    subjectConfidence = 0.80;
  }
  // Science keywords
  else if (lowerText.includes('experiment') || lowerText.includes('hypothesis') || 
           lowerText.includes('lab') || lowerText.includes('scientific') ||
           lowerText.includes('biology') || lowerText.includes('chemistry') ||
           lowerText.includes('physics') || lowerText.includes('observation')) {
    subject = "science";
    subjectConfidence = 0.85;
  }
  // History/Social Studies keywords
  else if (lowerText.includes('treaty') || lowerText.includes('history') || 
           lowerText.includes('war') || lowerText.includes('civilization') ||
           lowerText.includes('government') || lowerText.includes('amendment')) {
    subject = "history";
    subjectConfidence = 0.80;
  }
  
  // Infer class level (Standard, Honors, AP)
  let classLevel: "standard" | "honors" | "AP" = "standard";
  let classLevelConfidence = 0.50;
  
  // AP indicators: advanced vocabulary, complex concepts, graduate-level terminology
  if (gradeBand === "9-12") {
    const apIndicators = ['calculus', 'quantum', 'multi-variable', 'differentiation', 'integral', 'parametric'];
    const apMatch = apIndicators.filter(word => lowerText.includes(word)).length;
    
    if (apMatch > 0) {
      classLevel = "AP";
      classLevelConfidence = 0.75;
    } else if (advancedWordCount > 3) {
      classLevel = "honors";
      classLevelConfidence = 0.65;
    }
  }
  
  return {
    inferredGradeBand: gradeBand,
    inferredSubject: subject,
    inferredClassLevel: classLevel,
    gradeBandConfidence,
    subjectConfidence,
    classLevelConfidence,
  };
}
