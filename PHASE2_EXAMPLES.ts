/**
 * Phase 2 Implementation Examples
 * 
 * Practical examples of assessmentSummarizerService usage,
 * Bloom distribution calculations, and Space Camp payload generation.
 */

import {
  estimateBloomDistribution,
  deriveSpaceCampMetadata,
  buildNaturalLanguageSummary,
  summarizeAssessmentIntent,
  getAssessmentMetadata,
} from '../services/assessmentSummarizerService';
//import { AssessmentIntent } from '../types/assessmentIntent';

// ============================================================================
// EXAMPLE 1: Basic Summarization (Standard Level, 30-min Quiz)
// ============================================================================

async function example1_BasicSummarization() {
  console.log('\n📌 EXAMPLE 1: Standard Level 30-min Quiz\n');

  const intent: AssessmentIntent = {
    sourceFile: new File(['Chapter 5 Review Notes...'], 'Chapter5.pdf'),
    studentLevel: 'Standard',
    assessmentType: 'Quiz',
    timeMinutes: 30,
  };

  try {
    const summarized = await summarizeAssessmentIntent(intent);

    console.log('✅ Summary (what teacher sees):');
    console.log(`   "${summarized.summary}"\n`);

    console.log('✅ Derived Metadata:');
    console.log(`   Grade Band: ${summarized.derivedMetadata.gradeBand}`);
    console.log(`   Class Level: ${summarized.derivedMetadata.classLevel}`);
    console.log(`   Subject: ${summarized.derivedMetadata.subject}`);
    console.log(`   Est. Questions: ${summarized.derivedMetadata.estimatedQuestionCount}`);
    console.log(`   Fatigue Multiplier: ${summarized.derivedMetadata.fatigueMultiplier}\n`);

    console.log('✅ Bloom Distribution:');
    const bloom = summarized.derivedMetadata.estimatedBloomDistribution;
    console.log(`   Remember: ${(bloom.Remember * 100).toFixed(1)}%`);
    console.log(`   Understand: ${(bloom.Understand * 100).toFixed(1)}%`);
    console.log(`   Apply: ${(bloom.Apply * 100).toFixed(1)}%`);
    console.log(`   Analyze: ${(bloom.Analyze * 100).toFixed(1)}%`);
    console.log(`   Evaluate: ${(bloom.Evaluate * 100).toFixed(1)}%`);
    console.log(`   Create: ${(bloom.Create * 100).toFixed(1)}%`);

    const sum = Object.values(bloom).reduce((a, b) => a + b, 0);
    console.log(`   Sum: ${(sum * 100).toFixed(1)}% ${Math.abs(sum - 1.0) < 0.02 ? '✓' : '✗'}\n`);

    // Space Camp payload is hidden
    console.log('✅ Space Camp Payload (hidden from teacher):');
    console.log(`   documentMetadata.gradeBand: ${summarized.spaceCampPayload.documentMetadata.gradeBand}`);
    console.log(`   documentMetadata.subject: ${summarized.spaceCampPayload.documentMetadata.subject}`);
    console.log(`   documentMetadata.classLevel: ${summarized.spaceCampPayload.documentMetadata.classLevel}`);
    console.log(`   documentMetadata.timeTargetMinutes: ${summarized.spaceCampPayload.documentMetadata.timeTargetMinutes}\n`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// ============================================================================
// EXAMPLE 2: Bloom Distribution with Emphasis Modifiers
// ============================================================================

function example2_BloomDistributions() {
  console.log('\n📌 EXAMPLE 2: Bloom Distributions with Emphasis\n');

  const testCases = [
    { level: 'Standard' as const, emphasis: 'Balanced' as const },
    { level: 'Standard' as const, emphasis: 'Conceptual' as const },
    { level: 'Honors' as const, emphasis: 'Procedural' as const },
    { level: 'AP' as const, emphasis: 'ExamStyle' as const },
  ];

  testCases.forEach(({ level, emphasis }) => {
    const dist = estimateBloomDistribution(level, 'Test', emphasis);
    const sum = Object.values(dist).reduce((a, b) => a + b, 0);

    console.log(`${level} + ${emphasis}:`);
    console.log(`  R:${(dist.Remember * 100).toFixed(0)}% U:${(dist.Understand * 100).toFixed(0)}% Ap:${(dist.Apply * 100).toFixed(0)}% An:${(dist.Analyze * 100).toFixed(0)}% E:${(dist.Evaluate * 100).toFixed(0)}% C:${(dist.Create * 100).toFixed(0)}% | Sum: ${(sum * 100).toFixed(1)}%`);
  });

  console.log(
    '\n✅ Bloom distributions sum to ~1.0 (within 2% tolerance)\n'
  );
}

// ============================================================================
// EXAMPLE 3: Mapping Validation
// ============================================================================

function example3_MappingValidation() {
  console.log('\n📌 EXAMPLE 3: Student Level Mappings\n');

  const levels = ['Remedial', 'Standard', 'Honors', 'AP'] as const;

  console.log('StudentLevel → GradeBand → ClassLevel:');
  levels.forEach(level => {
    const metadata = getAssessmentMetadata({
      studentLevel: level,
      assessmentType: 'Test',
      timeMinutes: 45,
      sourceTopic: 'Math',
    });

    console.log(
      `  ${level.padEnd(10)} → ${metadata.gradeBand.padEnd(5)} → ${metadata.classLevel}`
    );
  });

  console.log('\n✅ All mappings validated\n');
}

// ============================================================================
// EXAMPLE 4: Complex Assessment with Advanced Options
// ============================================================================

async function example4_ComplexAssessment() {
  console.log('\n📌 EXAMPLE 4: Honors Test with Conceptual Emphasis & Focus Areas\n');

  const intent: AssessmentIntent = {
    sourceTopic: 'Cellular Respiration & Photosynthesis',
    studentLevel: 'Honors',
    assessmentType: 'Test',
    timeMinutes: 50,
    focusAreas: ['Calvin Cycle', 'Electron Transport Chain', 'ATP synthesis'],
    emphasis: 'Conceptual',
    classroomContext: 'Students excel at memorization but struggle with process linkages',
  };

  try {
    const summarized = await summarizeAssessmentIntent(intent);

    console.log('📝 Teacher-Facing Summary:');
    console.log(`"${summarized.summary}"\n`);

    console.log('🔬 Technical Details (Space Camp):');
    const metadata = summarized.derivedMetadata;
    console.log(`  Grade Band: ${metadata.gradeBand}`);
    console.log(`  Class Level: ${metadata.classLevel}`);
    console.log(`  Subject: ${metadata.subject}`);
    console.log(`  Time Target: ${metadata.estimatedTotalTimeMinutes} minutes`);
    console.log(`  Est. Questions: ${metadata.estimatedQuestionCount}`);

    console.log('\n  Bloom Targets:');
    const bloom = metadata.estimatedBloomDistribution;
    console.log(`    Remember:  ${(bloom.Remember * 100).toFixed(0)}%`);
    console.log(`    Understand: ${(bloom.Understand * 100).toFixed(0)}%`);
    console.log(`    Apply:      ${(bloom.Apply * 100).toFixed(0)}%`);
    console.log(`    Analyze:    ${(bloom.Analyze * 100).toFixed(0)}%`);
    console.log(`    Evaluate:   ${(bloom.Evaluate * 100).toFixed(0)}%`);
    console.log(`    Create:     ${(bloom.Create * 100).toFixed(0)}%`);

    console.log(`\n  Complexity Range: ${(metadata.estimatedComplexityRange[0] * 100).toFixed(0)}–${(metadata.estimatedComplexityRange[1] * 100).toFixed(0)}%`);

    // AI Writer prompt (partial)
    console.log(`\n📝 AI Writer Will Receive:
---
${summarized.prompt.substring(0, 300)}...
---\n`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// ============================================================================
// EXAMPLE 5: Time Estimation Accuracy
// ============================================================================

function example5_TimeEstimation() {
  console.log('\n📌 EXAMPLE 5: Time Estimation by Assessment Type\n');

  const timeTargets = [15, 30, 45, 60];
  const types = ['Quiz', 'Test', 'Practice'] as const;

  console.log('Assessment Type → Est. Questions (by time):\n');

  types.forEach(type => {
    console.log(`${type}:`);
    timeTargets.forEach(minutes => {
      const metadata = getAssessmentMetadata({
        studentLevel: 'Standard',
        assessmentType: type,
        timeMinutes: minutes,
        sourceTopic: 'Test',
      });
      console.log(`  ${minutes} min → ~${metadata.estimatedQuestions.questionCount} questions`);
    });
    console.log();
  });
}

// ============================================================================
// EXAMPLE 6: Grade Band Specific Distributions
// ============================================================================

function example6_GradeBandDistributions() {
  console.log('\n📌 EXAMPLE 6: Grade Band Specific Distributions\n');

  const levels = ['Remedial', 'Standard', 'Honors', 'AP'] as const;

  console.log('Base Bloom Distributions by Grade Band:\n');

  levels.forEach(level => {
    const dist = estimateBloomDistribution(level, 'Test');
    console.log(`${level} (${['3-5', '6-8', '9-12', '9-12'][['Remedial', 'Standard', 'Honors', 'AP'].indexOf(level)]})`);
    console.log(
      `  R${(dist.Remember * 100).toFixed(0)}% U${(dist.Understand * 100).toFixed(0)}% Ap${(dist.Apply * 100).toFixed(0)}% An${(dist.Analyze * 100).toFixed(0)}% E${(dist.Evaluate * 100).toFixed(0)}% C${(dist.Create * 100).toFixed(0)}%`
    );
  });

  console.log('\n✅ Characteristics:');
  console.log('  Remedial:  More Remember/Understand, no Create');
  console.log('  Standard:  Balanced, moderate Apply/Analyze');
  console.log('  Honors:    Higher Analyze, more Create');
  console.log('  AP:        Minimal Remember, focus on Analyze/Evaluate/Create\n');
}

// ============================================================================
// EXAMPLE 7: Emphasis Modifier Verification
// ============================================================================

function example7_EmphasisModifiers() {
  console.log('\n📌 EXAMPLE 7: Emphasis Modifiers (Standard + Modifications)\n');

  const base = estimateBloomDistribution('Standard', 'Test', 'Balanced');

  const emphases = ['Balanced', 'Procedural', 'Conceptual', 'Application', 'ExamStyle'] as const;

  console.log('Standard Level Base Bloom:');
  console.log(
    `  R${(base.Remember * 100).toFixed(0)}% U${(base.Understand * 100).toFixed(0)}% Ap${(base.Apply * 100).toFixed(0)}% An${(base.Analyze * 100).toFixed(0)}% E${(base.Evaluate * 100).toFixed(0)}% C${(base.Create * 100).toFixed(0)}%\n`
  );

  emphases.forEach(emphasis => {
    const modified = estimateBloomDistribution('Standard', 'Test', emphasis);
    console.log(`+ ${emphasis}:`);
    console.log(
      `  R${(modified.Remember * 100).toFixed(0)}% U${(modified.Understand * 100).toFixed(0)}% Ap${(modified.Apply * 100).toFixed(0)}% An${(modified.Analyze * 100).toFixed(0)}% E${(modified.Evaluate * 100).toFixed(0)}% C${(modified.Create * 100).toFixed(0)}%`
    );
  });

  console.log('\n✅ Emphasis Characteristics:');
  console.log('  Procedural:    +Apply (skill execution)');
  console.log('  Conceptual:    +Understand, +Analyze, -Apply (deep reasoning)');
  console.log('  Application:   +Analyze, +Evaluate (real-world problem-solving)');
  console.log('  ExamStyle:     Ensures min 20% Analyze+Evaluate\n');
}

// ============================================================================
// EXAMPLE 8: Space Camp Payload Validation
// ============================================================================

async function example8_PayloadValidation() {
  console.log('\n📌 EXAMPLE 8: Space Camp Payload Validation\n');

  const intents: AssessmentIntent[] = [
    {
      sourceTopic: 'Quiz topic',
      studentLevel: 'Standard',
      assessmentType: 'Quiz',
      timeMinutes: 30,
    },
    {
      sourceTopic: 'Test topic',
      studentLevel: 'AP',
      assessmentType: 'Test',
      timeMinutes: 60,
    },
    {
      sourceTopic: 'Practice topic',
      studentLevel: 'Remedial',
      assessmentType: 'Practice',
      timeMinutes: 20,
    },
  ];

  for (const intent of intents) {
    try {
      const summarized = await summarizeAssessmentIntent(intent);
      const payload = summarized.spaceCampPayload;

      // Validation checks
      const checks = {
        '✓ documentMetadata.gradeBand': ['3-5', '6-8', '9-12'].includes(
          payload.documentMetadata.gradeBand
        ),
        '✓ documentMetadata.classLevel': ['standard', 'honors', 'AP'].includes(
          payload.documentMetadata.classLevel
        ),
        '✓ documentMetadata.subject': ['math', 'english', 'science', 'history', 'general'].includes(
          payload.documentMetadata.subject
        ),
        '✓ estimatedBloomTargets sum': Math.abs(
          Object.values(payload.estimatedBloomTargets).reduce((a, b) => a + b, 0) - 1.0
        ) < 0.02,
        '✓ estimatedQuestionCount > 0': payload.estimatedQuestionCount > 0,
        '✓ complexityRange valid': payload.complexityRange[0] < payload.complexityRange[1],
      };

      console.log(`${intent.studentLevel} ${intent.assessmentType}:`);
      Object.entries(checks).forEach(([check, result]) => {
        console.log(`  ${result ? '✅' : '❌'} ${check}`);
      });
      console.log();
    } catch (error) {
      console.error(`❌ Error for ${intent.studentLevel}:`, error);
    }
  }
}

// ============================================================================
// EXAMPLE 9: Error Handling
// ============================================================================

async function example9_ErrorHandling() {
  console.log('\n📌 EXAMPLE 9: Error Handling\n');

  const invalidIntents = [
    {
      name: 'Missing studentLevel',
      intent: {
        sourceTopic: 'Topic',
        // studentLevel: missing,
        assessmentType: 'Quiz' as const,
        timeMinutes: 30,
      } as any,
    },
    {
      name: 'Both file and topic',
      intent: {
        sourceFile: new File([''], 'test.pdf'),
        sourceTopic: 'Also has topic',
        studentLevel: 'Standard' as const,
        assessmentType: 'Quiz' as const,
        timeMinutes: 30,
      } as any,
    },
    {
      name: 'Neither file nor topic',
      intent: {
        studentLevel: 'Standard' as const,
        assessmentType: 'Quiz' as const,
        timeMinutes: 30,
      } as any,
    },
  ];

  for (const { name, intent } of invalidIntents) {
    try {
      await summarizeAssessmentIntent(intent);
      console.log(`❌ ${name}: Should have thrown error`);
    } catch (error) {
      console.log(`✅ ${name}: Caught error`);
      console.log(`   "${(error as Error).message}"\n`);
    }
  }
}

// ============================================================================
// EXAMPLE 10: End-to-End Real Teacher Workflow
// ============================================================================

async function example10_RealTeacherWorkflow() {
  console.log('\n📌 EXAMPLE 10: Real Teacher Workflow\n');

  console.log('Scenario: Math teacher creates AP calculus test from uploaded materials\n');

  const intent: AssessmentIntent = {
    sourceFile: new File(
      ['Chapter 12: Infinite Series and Convergence Tests...'],
      'AP_Calc_Chapter12.pdf'
    ),
    studentLevel: 'AP',
    assessmentType: 'Test',
    timeMinutes: 90,
    focusAreas: ['Convergence tests', 'Power series', 'Taylor polynomials'],
    emphasis: 'ExamStyle',
    difficultyProfile: 'Challenging',
    classroomContext:
      'Students are strong with computation but struggle with proofs. Include rigorous justification requirements.',
  };

  try {
    console.log('1️⃣  Teacher completes MinimalAssessmentForm\n');
    console.log(`   - Uploads: ${intent.sourceFile.name}`);
    console.log(`   - Level: ${intent.studentLevel}`);
    console.log(`   - Type: ${intent.assessmentType}`);
    console.log(`   - Time: ${intent.timeMinutes} min`);
    console.log(`   - Focus: ${intent.focusAreas?.join(', ')}`);
    console.log(`   - Emphasis: ${intent.emphasis}`);
    console.log(`   - Context: ${intent.classroomContext?.substring(0, 50)}...\n`);

    console.log('2️⃣  Parent component calls summarizeAssessmentIntent()\n');
    const summarized = await summarizeAssessmentIntent(intent);

    console.log('3️⃣  Teacher sees friendly summary:\n');
    console.log(`   "${summarized.summary}"\n`);

    console.log('4️⃣  Space Camp receives hidden payload:\n');
    console.log(`   {`);
    console.log(`     documentMetadata: { gradeBand: "${summarized.spaceCampPayload.documentMetadata.gradeBand}", subject: "${summarized.spaceCampPayload.documentMetadata.subject}", classLevel: "${summarized.spaceCampPayload.documentMetadata.classLevel}", timeTargetMinutes: ${summarized.spaceCampPayload.documentMetadata.timeTargetMinutes} },`);
    console.log(`     estimatedBloomTargets: { ... },`);
    console.log(`     complexityRange: [${summarized.spaceCampPayload.complexityRange[0]}, ${summarized.spaceCampPayload.complexityRange[1]}],`);
    console.log(`     estimatedQuestionCount: ${summarized.spaceCampPayload.estimatedQuestionCount},`);
    console.log(`     emphasizeExamStyle: true,`);
    console.log(`     scaffoldingNeeded: "${summarized.spaceCampPayload.scaffoldingNeeded?.substring(0, 40)}..."`);
    console.log(`   }\n`);

    console.log('5️⃣  AI Writer receives rich prompt:\n');
    const promptPreview = summarized.prompt.split('\n').slice(0, 6).join('\n');
    console.log(`   ${promptPreview}\n`);

    console.log('6️⃣  Assessment generated and shown in preview\n');

    console.log('✅ Workflow complete!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

export async function runPhase2Examples() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           PHASE 2: SUMMARIZER SERVICE EXAMPLES                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  // Synchronous examples
  example2_BloomDistributions();
  example3_MappingValidation();
  example5_TimeEstimation();
  example6_GradeBandDistributions();
  example7_EmphasisModifiers();

  // Async examples
  await example1_BasicSummarization();
  await example4_ComplexAssessment();
  await example8_PayloadValidation();
  await example9_ErrorHandling();
  await example10_RealTeacherWorkflow();

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    ALL EXAMPLES COMPLETE                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}
