/**
 * Mock Data Generators for Testing
 * Shows realistic output from the Asteroid/Astronaut simulation system
 */

import {
  Asteroid,
  Astronaut,
  StudentProblemInput,
  StudentAssignmentSimulation,
  AssignmentSimulationResults,
} from '../../types/simulation';
import { getAllAstronauts } from './astronautGenerator';

/**
 * Generate mock Asteroids (problems) for testing
 */
export function generateMockAsteroids(): Asteroid[] {
  return [
    {
      ProblemId: 'asteroid_1',
      ProblemText:
        'Analyze the use of symbolism in Chapter 5 of The Great Gatsby. How does Fitzgerald use the green light to represent Gatsby\'s dreams?',
      ProblemLength: 26,
      MultiPart: false,
      BloomLevel: 'Analyze',
      LinguisticComplexity: 0.65,
      SimilarityToPrevious: 0,
      NoveltyScore: 1.0,
      SequenceIndex: 1,
      Subject: 'English',
      TestType: 'free_response',
    },
    {
      ProblemId: 'asteroid_2',
      ProblemText: 'Compare and contrast the characters of Gatsby and Tom Buchanan.',
      ProblemLength: 12,
      MultiPart: false,
      BloomLevel: 'Analyze',
      LinguisticComplexity: 0.45,
      SimilarityToPrevious: 0.62,
      NoveltyScore: 0.38,
      SequenceIndex: 2,
      Subject: 'English',
      TestType: 'free_response',
    },
    {
      ProblemId: 'asteroid_3',
      ProblemText:
        'What is the significance of the eyes of Dr. T.J. Eckleburg? Evaluate how this symbol contributes to the overall theme of the novel.',
      ProblemLength: 27,
      MultiPart: true,
      BloomLevel: 'Evaluate',
      LinguisticComplexity: 0.72,
      SimilarityToPrevious: 0.55,
      NoveltyScore: 0.45,
      SequenceIndex: 3,
      Subject: 'English',
      TestType: 'free_response',
    },
    {
      ProblemId: 'asteroid_4',
      ProblemText: 'Describe the setting of the novel. What role does geography play in the story?',
      ProblemLength: 16,
      MultiPart: false,
      BloomLevel: 'Understand',
      LinguisticComplexity: 0.38,
      SimilarityToPrevious: 0.41,
      NoveltyScore: 0.59,
      SequenceIndex: 4,
      Subject: 'English',
      TestType: 'free_response',
    },
    {
      ProblemId: 'asteroid_5',
      ProblemText:
        'Create an alternative ending to The Great Gatsby. How would you resolve the conflicts between the characters?',
      ProblemLength: 21,
      MultiPart: false,
      BloomLevel: 'Create',
      LinguisticComplexity: 0.52,
      SimilarityToPrevious: 0.35,
      NoveltyScore: 0.65,
      SequenceIndex: 5,
      Subject: 'English',
      TestType: 'free_response',
    },
  ];
}

/**
 * Generate mock StudentAssignmentSimulation (per-student results)
 */
export function generateMockStudentSimulation(
  astronaut: Astronaut,
  asteroids: Asteroid[],
): StudentAssignmentSimulation {
  // Simulate grade based on student traits
  const averageAbility =
    (astronaut.ProfileTraits.ReadingLevel +
      astronaut.ProfileTraits.AttentionSpan +
      astronaut.ProfileTraits.Confidence) /
    3;

  let estimatedScore = Math.round(averageAbility * 100);
  if (astronaut.Overlays.includes('adhd')) estimatedScore -= 15;
  if (astronaut.Overlays.includes('dyslexic')) estimatedScore -= 10;
  if (astronaut.Overlays.includes('fatigue_sensitive')) estimatedScore -= 12;

  estimatedScore = Math.max(35, Math.min(99, estimatedScore));

  const estimatedGrade =
    estimatedScore >= 90
      ? 'A'
      : estimatedScore >= 80
        ? 'B'
        : estimatedScore >= 70
          ? 'C'
          : estimatedScore >= 60
            ? 'D'
            : 'F';

  // Time estimation based on reading level
  const baseTime = 45;
  const readingFactor = 1 + (1 - astronaut.ProfileTraits.ReadingLevel) * 0.5;
  const totalTimeMinutes = Math.round(baseTime * readingFactor);

  return {
    studentId: astronaut.StudentId,
    personaName: astronaut.PersonaName,
    totalTimeMinutes,
    estimatedScore,
    estimatedGrade,
    problemResults: asteroids.map((asteroid, idx) => ({
      studentId: astronaut.StudentId,
      problemId: asteroid.ProblemId,
      timeToCompleteSeconds:
        asteroid.ProblemLength *
        2 *
        (1 + asteroid.LinguisticComplexity) *
        readingFactor,
      percentageSuccessful: Math.max(
        30,
        Math.min(
          95,
          averageAbility * 100 - asteroid.LinguisticComplexity * 30,
        ),
      ),
      confusionLevel:
        asteroid.BloomLevel === 'Create' ? 'high'
        : asteroid.BloomLevel === 'Evaluate' ? 'medium'
        : 'low',
      engagementLevel:
        asteroid.NoveltyScore > 0.6
          ? 'high'
          : asteroid.NoveltyScore > 0.3
            ? 'medium'
            : 'low',
      feedback: `${astronaut.PersonaName} found this problem ${
        asteroid.LinguisticComplexity > 0.6 ? 'challenging' : 'manageable'
      }.`,
    })),
    engagement: {
      initial: averageAbility * 0.9,
      atMidpoint: averageAbility * 0.75,
      final: averageAbility * 0.6,
      trend: 'declining',
    },
    fatigue: {
      initial: 0,
      peak: 0.6 + (1 - astronaut.ProfileTraits.AttentionSpan) * 0.3,
      final: 0.5 + (1 - astronaut.ProfileTraits.AttentionSpan) * 0.4,
    },
    confusionPoints:
      estimatedScore < 70 ? ['asteroid_3', 'asteroid_5'] : ['asteroid_5'],
    atRisk: estimatedGrade === 'D' || estimatedGrade === 'F',
    riskFactors:
      estimatedGrade === 'F'
        ? ['Very low overall performance', 'High confusion on advanced problems']
        : estimatedGrade === 'D'
          ? ['Below grade level', 'Struggling with complex tasks']
          : [],
  };
}

/**
 * Generate complete mock simulation results
 */
export function generateMockSimulationResults(
  asteroids?: Asteroid[],
  astronauts?: Astronaut[],
): AssignmentSimulationResults {
  const mockAsteroids = asteroids || generateMockAsteroids();
  const mockAstronauts = astronauts || getAllAstronauts().slice(0, 6); // Use first 6 personas

  const studentResults = mockAstronauts.map(astronaut =>
    generateMockStudentSimulation(astronaut, mockAsteroids),
  );

  const averageTimeMinutes = Math.round(
    studentResults.reduce((sum, s) => sum + s.totalTimeMinutes, 0) /
      studentResults.length,
  );

  const averageScore = Math.round(
    studentResults.reduce((sum, s) => sum + s.estimatedScore, 0) /
      studentResults.length,
  );

  const completionRate = Math.round(
    ((studentResults.filter(s => s.estimatedGrade !== 'F').length /
      studentResults.length) *
      100) as any,
  );

  const bloomCoverage: Record<string, number> = {
    Remember: 0,
    Understand: 20,
    Apply: 0,
    Analyze: 40,
    Evaluate: 20,
    Create: 20,
  };

  return {
    assignmentId: `assignment_${Date.now()}`,
    timestamp: new Date().toISOString(),
    asteroids: mockAsteroids,
    astronauts: mockAstronauts,
    studentResults,
    aggregatedAnalytics: {
      averageTimeMinutes,
      averageScore,
      completionRate,
      bloomCoverage,
      commonConfusionPoints: ['asteroid_3', 'asteroid_5'],
      atRiskStudentCount: studentResults.filter(s => s.atRisk).length,
    },
  };
}

/**
 * Example usage and what to expect
 */
export function demonstrateMockData() {
  console.log('🎓 MOCK ASTEROID/ASTRONAUT SIMULATION DEMO\n');

  // Phase 1: Show mock asteroids
  const asteroids = generateMockAsteroids();
  console.log('📚 PHASE 1: Asteroids (Problems Decomposed)');
  console.log(`   Found ${asteroids.length} problems:\n`);
  asteroids.forEach(a => {
    console.log(`   • ${a.ProblemId}: "${a.ProblemText.substring(0, 50)}..."`);
    console.log(`     Bloom: ${a.BloomLevel}, Complexity: ${(a.LinguisticComplexity * 100).toFixed(0)}%, Novelty: ${(a.NoveltyScore * 100).toFixed(0)}%`);
  });

  // Phase 2: Show astronauts
  console.log('\n👨‍🚀 PHASE 2: Astronauts (Student Personas)');
  const astronauts = getAllAstronauts().slice(0, 3);
  console.log(`   Using ${astronauts.length} personas:\n`);
  astronauts.forEach(a => {
    console.log(`   • ${a.PersonaName}`);
    console.log(`     Reading: ${(a.ProfileTraits.ReadingLevel * 100).toFixed(0)}%, Math: ${(a.ProfileTraits.MathFluency * 100).toFixed(0)}%, Attention: ${(a.ProfileTraits.AttentionSpan * 100).toFixed(0)}%`);
  });

  // Phase 3: Show simulation results
  console.log('\n🧠 PHASE 3 & 4: Simulation Results');
  const results = generateMockSimulationResults(asteroids, astronauts);
  console.log(`   Simulated ${results.studentResults.length} students × ${results.asteroids.length} problems\n`);

  results.studentResults.forEach(student => {
    console.log(`   ${student.personaName}:`);
    console.log(`     Grade: ${student.estimatedGrade} (${student.estimatedScore}%)`);
    console.log(`     Time: ${student.totalTimeMinutes} minutes`);
    console.log(`     Engagement: ${student.engagement.initial.toFixed(2)} → ${student.engagement.final.toFixed(2)} (${student.engagement.trend})`);
    console.log(`     At Risk: ${student.atRisk ? '⚠️ YES' : '✅ No'}`);
    console.log();
  });

  // Phase 4: Show aggregated analytics
  console.log('\n📊 AGGREGATED ANALYTICS:');
  console.log(`   Average Score: ${results.aggregatedAnalytics.averageScore}%`);
  console.log(`   Average Time: ${results.aggregatedAnalytics.averageTimeMinutes} minutes`);
  console.log(`   Completion Rate: ${results.aggregatedAnalytics.completionRate}%`);
  console.log(`   At-Risk Students: ${results.aggregatedAnalytics.atRiskStudentCount}`);
  console.log(`   Common Confusion Points: ${results.aggregatedAnalytics.commonConfusionPoints.join(', ')}`);
  console.log(`   Bloom Coverage: ${JSON.stringify(results.aggregatedAnalytics.bloomCoverage)}`);

  return results;
}
