/**
 * Assessment Diagnostics Engine - Orchestrator (REFACTORED)
 * 
 * Subject-agnostic, universal entry point
 * 
 * Main entry point for comprehensive assessment analysis
 * Coordinates:
 * 1. Document structure parsing
 * 2. Per-problem cognitive analysis (universal)
 * 3. Classification using subject profile
 * 4. Frequency and redundancy detection
 * 5. Section-level diagnostics
 * 6. Whole-document diagnostics
 */

import { buildFrequencyAnalysis } from './frequencyEngine';
import { scoreSectionDiagnostics, generateDocumentDiagnostics } from './diagnosticScorer';
import { AssessmentAnalysis, UniversalProblem, SubjectProfile, ProblemNumberingStyle } from './diagnosticTypes';

/**
 * Main entry point: Analyze a complete assessment document
 * 
 * Now accepts optional SubjectProfile
 * If no profile provided, returns cognitive analysis only (no classification)
 * If profile provided, fills in topics/types from profile configuration
 */
export async function analyzeAssessment(
  subjectProfile?: SubjectProfile
): Promise<AssessmentAnalysis> {
  console.log('🔍 [Diagnostic Engine] Starting assessment analysis...');
  console.log(`   Subject: ${subjectProfile?.subject || 'Generic (no profile)'}`);
  const startTime = performance.now();
  
  try {
    // TODO: Implement full document structure parsing
    // This engine is currently a stub that returns minimal results
    // Full implementation would parse document text and extract problems
    
    const documentId = `doc_${Date.now()}`;
    const subject = subjectProfile?.subject || 'Generic';
    const problems: UniversalProblem[] = [];
    
    const structure = {
      sections: [] as any[],
      totalProblems: 0,
      totalSubparts: 0,
      numberingStyles: [] as ProblemNumberingStyle[],
      detectionMetadata: { usesFormatting: false, usesNumbering: false, usesSpacing: false, confidence: 0.0 }
    };
    
    const frequency = buildFrequencyAnalysis(problems, subjectProfile);
    const sectionDiagnostics = structure.sections.map((section: any) => {
      return scoreSectionDiagnostics(section.sectionId, section.title, [], frequency);
    });
    
    const documentDiagnostics = generateDocumentDiagnostics(problems, frequency, sectionDiagnostics);
    
    const result: AssessmentAnalysis = {
      documentId,
      subject,
      subjectProfile: subjectProfile || { subject: 'Generic', version: '1.0', displayName: 'Generic Profile' },
      timestamp: new Date().toISOString(),
      documentStructure: structure,
      problems,
      frequencyAnalysis: frequency,
      sectionDiagnostics,
      documentDiagnostics,
      confidence: calculateConfidence(structure, problems.length),
    };
    
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [Diagnostic Engine] Analysis complete in ${elapsed}s`);
    return result;
  } catch (error) {
    console.error('❌ [Diagnostic Engine] Analysis failed:', error);
    throw error;
  }
}

/**
 * Calculate overall confidence in the analysis (0-1)
 */
function calculateConfidence(structure: any, problemCount: number): number {
  let confidence = 0.5;  // Base
  
  // Increase confidence if good document structure
  if (structure.detectionMetadata.usesNumbering) confidence += 0.2;
  if (structure.detectionMetadata.usesFormatting) confidence += 0.1;
  
  // Increase confidence with more problems (more data = better analysis)
  confidence += Math.min(0.2, (problemCount / 50) * 0.2);
  
  return Math.min(1, confidence);
}

/**
 * Export analysis results (for UI display)
 */
export function formatAnalysisForDisplay(analysis: AssessmentAnalysis) {
  return {
    // Overview
    overview: {
      subject: analysis.subject,
      totalProblems: analysis.documentStructure.totalProblems,
      estimatedTime: `${analysis.documentDiagnostics.timeAnalysis.totalMinutes} minutes`,
      overallScore: `${analysis.documentDiagnostics.scorecard.overallScore}/100`,
    },
    
    // Key metrics
    metrics: {
      topicBalance: `${(analysis.documentDiagnostics.topicCoverage.topicBalanceScore * 100).toFixed(0)}%`,
      bloomCoverage: `${(analysis.documentDiagnostics.bloomAnalysis.coverage * 100).toFixed(0)}%`,
      redundancyIndex: `${analysis.documentDiagnostics.timeAnalysis.realism}/10`,
    },
    
    // Section summaries
    sections: analysis.sectionDiagnostics.map(s => ({
      title: s.title || `Section ${s.sectionId}`,
      problemCount: s.problemCount,
      score: s.overallScore,
      issues: s.issues.length,
    })),
    
    // Findings
    findings: analysis.documentDiagnostics.findings,
    
    // Recommendations
    recommendations: analysis.documentDiagnostics.recommendations,
    
    // Raw data for details view
    details: analysis,
  };
}

/**
 * Get specific problem
 */
export function getProblem(analysis: AssessmentAnalysis, problemId: string) {
  return analysis.problems.find(p => p.problemId === problemId);
}

/**
 * Get section analysis including all its problems
 */
export function getSectionAnalysis(analysis: AssessmentAnalysis, sectionId: string) {
  const section = analysis.documentStructure.sections.find(s => s.sectionId === sectionId);
  const sectionDiag = analysis.sectionDiagnostics.find(d => d.sectionId === sectionId);
  const problems = analysis.problems.filter(p => p.sectionId === sectionId);
  
  return {
    metadata: section,
    diagnostics: sectionDiag,
    problems,
  };
}

/**
 * Generate teacher-friendly report
 */
export function generateTeacherReport(analysis: AssessmentAnalysis): string {
  const doc = analysis.documentDiagnostics;
  const freq = analysis.frequencyAnalysis;
  
  let report = `
ASSESSMENT DIAGNOSTIC REPORT
════════════════════════════════════════════════════════════
Subject: ${analysis.subject} | Confidence: ${(analysis.confidence * 100).toFixed(0)}%
📊 OVERALL ASSESSMENT QUALITY SCORE: ${doc.scorecard.overallScore}/100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ KEY FINDINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${doc.findings.map(f => `• ${f}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 ASSESSMENT METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Problems:             ${analysis.documentStructure.totalProblems}
Estimated Duration:        ${doc.timeAnalysis.totalMinutes} minutes
Highest Bloom Level:       ${doc.highestBloomLevel}
Procedural Content:        ${doc.proceduralVsConceptual.proceduralPercentage.toFixed(1)}%
Conceptual Content:        ${doc.proceduralVsConceptual.conceptualPercentage.toFixed(1)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 BLOOM'S TAXONOMY DISTRIBUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${doc.bloomAnalysis.distribution.map(b => {
  const bar = '█'.repeat(Math.round(b.percentage / 5)) + '░'.repeat(Math.round((100 - b.percentage) / 5));
  return `${b.level.padEnd(12)} ${bar} ${b.count} (${b.percentage.toFixed(1)}%)`;
}).join('\n')}

Coverage:  ${(doc.bloomAnalysis.coverage * 100).toFixed(0)}%
Balance:   ${(doc.bloomAnalysis.balance * 100).toFixed(0)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 TOPIC COVERAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Most Tested:   ${doc.topicCoverage.mostTestedTopic || '(none)'} (${doc.topicCoverage.mostTestedCount} problems)
Least Tested:  ${doc.topicCoverage.leastTestedTopic || '(none)'} (${doc.topicCoverage.leastTestedCount} problems)
Topic Balance: ${(doc.topicCoverage.topicBalanceScore * 100).toFixed(0)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  REDUNDANCY ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Redundancy Index:    ${freq.redundancyIndex}/10

${freq.redundancyFlags.length > 0 ? freq.redundancyFlags.map(f => `  [${f.severity.toUpperCase()}] ${f.description}`).join('\n') : '  ✅ No redundancy issues detected'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️  TIME ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Shortest Problem:     ${doc.timeAnalysis.shortestProblem} minutes
Average Problem:      ${doc.timeAnalysis.averageProblem} minutes
Longest Problem:      ${doc.timeAnalysis.longestProblem} minutes
Time Realism Score:   ${(doc.timeAnalysis.realism * 100).toFixed(0)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 QUALITY SCORECARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Alignment Control:     ${doc.scorecard.alignmentControl}/100
Bloom Discipline:      ${doc.scorecard.bloomDiscipline}/100
Topic Balance:         ${doc.scorecard.topicBalance}/100
Time Realism:          ${doc.scorecard.timeRealism}/100
Redundancy Control:    ${doc.scorecard.redundancyControl}/100
Coherence:             ${doc.scorecard.coherence}/100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${doc.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

════════════════════════════════════════════════════════════
  Report Generated: ${new Date().toLocaleString()}
════════════════════════════════════════════════════════════
  `;
  
  return report;
}
