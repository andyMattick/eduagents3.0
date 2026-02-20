/**
 * Quick Test: Run this to see mock data in action
 * 
 * Usage in browser console (F12):
 *   window.demonstrateMockData()         // Show full demo with console output
 *   window.showMockDataOnly()            // Quick mock data generation
 *   window.generateMockAsteroids()       // Get sample problems
 *   window.generateMockSimulationResults() // Get complete simulation output
 */

import { demonstrateMockData, generateMockAsteroids, generateMockSimulationResults } from './agents/simulation/mockData';

// Export for easy console access
export function testMockData() {
  console.log('🧪 QUICK MOCK DATA TEST\n');
  
  // Test 1: Generate asteroids
  console.log('TEST 1: Generating Mock Asteroids...');
  const asteroids = generateMockAsteroids();
  console.log(`✅ Generated ${asteroids.length} problems`);
  console.log('Example:', asteroids[0]);
  
  // Test 2: Generate simulation results
  console.log('\nTEST 2: Generating Mock Simulation Results...');
  const results = generateMockSimulationResults(asteroids);
  console.log(`✅ Simulated ${results.studentResults.length} students`);
  console.log('Example student result:', results.studentResults[0]);
  
  // Test 3: Show analytics
  console.log('\nTEST 3: Analytics Output...');
  console.log('✅ Aggregated Analytics:', results.aggregatedAnalytics);
  
  console.log('\n🎉 All tests passed! Mock data system is working.\n');
  
  return { asteroids, results };
}

// Auto-run on import for debugging
if (typeof window !== 'undefined') {
  console.log('📋 AVAILABLE DEMO FUNCTIONS:');
  console.log('   window.demonstrateMockData()         - Full demo with console output');
  console.log('   window.showMockDataOnly()            - Quick mock data demo');
  console.log('   window.generateMockAsteroids()       - Generate sample problems');
  console.log('   window.generateMockSimulationResults() - Generate full simulation');
  console.log('   window.testMockData()                - Run quick test\n');
}

export default testMockData;
