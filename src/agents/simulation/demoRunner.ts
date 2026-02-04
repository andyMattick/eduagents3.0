/**
 * Complete End-to-End Demo: Showing the full Asteroid/Astronaut pipeline
 * with mock data, so you can see exactly what flows through the system
 */

import { generateMockAsteroids, generateMockSimulationResults, demonstrateMockData } from './mockData';
import { runFullSimulationPipeline } from '../pipelineIntegration';
import { StudentFeedback } from '../../types/pipeline';

/**
 * Run the complete pipeline with mock data
 * Shows what data flows through each phase
 */
export async function runMockPipeline() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ASTEROID/ASTRONAUT PIPELINE - COMPLETE MOCK DATA DEMO');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Example assignment text
  const assignmentText = `
    Read "The Great Gatsby" by F. Scott Fitzgerald and complete the following assignment:

    1. Analyze the use of symbolism in Chapter 5. How does Fitzgerald use the green light 
       to represent Gatsby's dreams and aspirations?

    2. Compare and contrast the characters of Gatsby and Tom Buchanan.

    3. What is the significance of the eyes of Dr. T.J. Eckleburg? Evaluate how this symbol 
       contributes to the overall theme of the novel.

    4. Describe the setting of the novel. What role does geography play in the story?

    5. Create an alternative ending to The Great Gatsby. How would you resolve the conflicts 
       between the characters? Consider the motivations and consequences for each character.
  `;

  try {
    // Run full pipeline
    const { asteroids, astronauts, simulationResults, studentFeedback } =
      await runFullSimulationPipeline(assignmentText, {
        subject: 'English',
        gradeLevel: '9-12',
        includeAccessibilityProfiles: true,
        includeStandardLearners: false, // Just accessibility profiles for this demo
      });

    console.log('✅ PHASE 1: PROBLEM EXTRACTION (Asteroids)\n');
    console.log(`Found ${asteroids.length} problems:\n`);
    asteroids.forEach((a, idx) => {
      console.log(`${idx + 1}. ${a.ProblemId}`);
      console.log(`   Text: "${a.ProblemText.substring(0, 60)}..."`);
      console.log(`   Bloom: ${a.BloomLevel}`);
      console.log(`   Complexity: ${(a.LinguisticComplexity * 100).toFixed(0)}%`);
      console.log(`   Novelty: ${(a.NoveltyScore * 100).toFixed(0)}%`);
      console.log(`   Multipart: ${a.MultiPart}\n`);
    });

    console.log('\n✅ PHASE 2: STUDENT PROFILE SELECTION (Astronauts)\n');
    console.log(`Selected ${astronauts.length} student personas:\n`);
    astronauts.forEach(a => {
      console.log(`• ${a.PersonaName}`);
      console.log(`  ID: ${a.StudentId}`);
      console.log(
        `  Traits: Reading=${(a.ProfileTraits.ReadingLevel * 100).toFixed(0)}%, ` +
          `Math=${(a.ProfileTraits.MathFluency * 100).toFixed(0)}%, ` +
          `Attention=${(a.ProfileTraits.AttentionSpan * 100).toFixed(0)}%, ` +
          `Confidence=${(a.ProfileTraits.Confidence * 100).toFixed(0)}%`,
      );
      if (a.Overlays.length > 0) {
        console.log(`  Overlays: ${a.Overlays.join(', ')}`);
      }
      console.log();
    });

    console.log('\n✅ PHASE 3: SIMULATION ENGINE (Student-Problem Interactions)\n');
    console.log(`Simulated ${astronauts.length} students × ${asteroids.length} problems = ${astronauts.length * asteroids.length} interactions\n`);

    simulationResults.studentResults.forEach((student, idx) => {
      console.log(`${idx + 1}. ${student.personaName}`);
      console.log(`   Estimated Grade: ${student.estimatedGrade} (${student.estimatedScore}%)`);
      console.log(`   Total Time: ${student.totalTimeMinutes} minutes`);
      console.log(`   Engagement Arc: ${student.engagement.initial.toFixed(2)} → ${student.engagement.atMidpoint.toFixed(2)} → ${student.engagement.final.toFixed(2)} (${student.engagement.trend})`);
      console.log(
        `   Fatigue: ${student.fatigue.initial.toFixed(2)} → peak ${student.fatigue.peak.toFixed(2)} → final ${student.fatigue.final.toFixed(2)}`,
      );
      console.log(`   Confusion Points: ${student.confusionPoints.length > 0 ? student.confusionPoints.join(', ') : 'None'}`);
      console.log(`   At Risk: ${student.atRisk ? '⚠️ YES' : '✅ No'}`);
      if (student.riskFactors && student.riskFactors.length > 0) {
        console.log(`   Risk Factors: ${student.riskFactors.join(', ')}`);
      }
      console.log();
    });

    console.log('\n✅ PHASE 4: AGGREGATED ANALYTICS\n');
    const analytics = simulationResults.aggregatedAnalytics;
    console.log(`Average Score: ${analytics.averageScore}%`);
    console.log(`Average Time: ${analytics.averageTimeMinutes} minutes`);
    console.log(`Completion Rate: ${analytics.completionRate}%`);
    console.log(`At-Risk Student Count: ${analytics.atRiskStudentCount}`);
    console.log(`Common Confusion Points: ${analytics.commonConfusionPoints.join(', ')}`);
    console.log(`\nBloom Taxonomy Coverage:`);
    Object.entries(analytics.bloomCoverage).forEach(([level, pct]) => {
      console.log(`  ${level}: ${pct}%`);
    });

    console.log('\n✅ PHASE 5: REWRITER INPUT (StudentFeedback Output)\n');
    console.log(`Generated ${studentFeedback.length} feedback items for pipeline compatibility:\n`);
    studentFeedback.forEach((fb, idx) => {
      console.log(`${idx + 1}. ${fb.studentPersona}`);
      console.log(`   Content: ${fb.content}`);
      if (fb.timeToCompleteMinutes) {
        console.log(`   Time: ${fb.timeToCompleteMinutes} minutes`);
      }
      if (fb.estimatedGrade) {
        console.log(`   Grade: ${fb.estimatedGrade}`);
      }
      if (fb.atRiskProfile) {
        console.log(`   ⚠️ AT RISK`);
      }
      console.log();
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ DEMO COMPLETE - All 5 phases executed successfully!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    return {
      asteroids,
      astronauts,
      simulationResults,
      studentFeedback,
    };
  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

/**
 * Simple demo showing just the mock data generation
 * (no async/real functions needed)
 */
export function showMockDataOnly() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  MOCK DATA GENERATION DEMO');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results = generateMockSimulationResults();

  console.log('📊 MOCK ASTEROIDS:\n');
  results.asteroids.forEach(a => {
    console.log(`${a.ProblemId}:`);
    console.log(`  Text: "${a.ProblemText}"`);
    console.log(`  Bloom: ${a.BloomLevel}`);
    console.log(`  Complexity: ${a.LinguisticComplexity.toFixed(2)}`);
    console.log(`  Novelty: ${a.NoveltyScore.toFixed(2)}\n`);
  });

  console.log('\n👥 MOCK STUDENT RESULTS:\n');
  results.studentResults.forEach(s => {
    console.log(`${s.personaName}:`);
    console.log(`  Grade: ${s.estimatedGrade} (${s.estimatedScore}%)`);
    console.log(`  Time: ${s.totalTimeMinutes} min`);
    console.log(`  Engagement: ${s.engagement.initial.toFixed(2)} → ${s.engagement.final.toFixed(2)}`);
    console.log(`  At Risk: ${s.atRisk}\n`);
  });

  console.log('\n📈 ANALYTICS:\n');
  console.log(`Average Score: ${results.aggregatedAnalytics.averageScore}%`);
  console.log(`Completion Rate: ${results.aggregatedAnalytics.completionRate}%`);
  console.log(`At-Risk: ${results.aggregatedAnalytics.atRiskStudentCount} students`);
  console.log(`Confusion Points: ${results.aggregatedAnalytics.commonConfusionPoints.join(', ')}\n`);

  return results;
}

// Export for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).demonstrateMockData = demonstrateMockData;
  (window as any).showMockDataOnly = showMockDataOnly;
  (window as any).runMockPipeline = runMockPipeline;
}
